import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialPomodoroSchema1788278400000 implements MigrationInterface {
  name = 'InitialPomodoroSchema1788278400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" SERIAL NOT NULL,
        "email" character varying NOT NULL,
        "password" character varying,
        "firstName" character varying NOT NULL,
        "lastName" character varying,
        "twoFactorSecret" character varying,
        "isTwoFAEnabled" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_user_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_email" ON "user" ("email")',
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pomodoro_tasks" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "title" character varying NOT NULL,
        "completed" boolean NOT NULL DEFAULT false,
        "estimatedPomodoros" integer NOT NULL DEFAULT 1,
        "completedPomodoros" integer NOT NULL DEFAULT 0,
        "completedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pomodoro_tasks_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'ALTER TABLE "pomodoro_tasks" ADD COLUMN IF NOT EXISTS "estimatedPomodoros" integer NOT NULL DEFAULT 1',
    );
    await queryRunner.query(
      'ALTER TABLE "pomodoro_tasks" ADD COLUMN IF NOT EXISTS "completedPomodoros" integer NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE "pomodoro_tasks" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP',
    );
    await queryRunner.query(
      'ALTER TABLE "pomodoro_tasks" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()',
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pomodoro_profiles" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "name" character varying(60) NOT NULL,
        "presetKey" character varying,
        "isPreset" boolean NOT NULL DEFAULT false,
        "isDefault" boolean NOT NULL DEFAULT false,
        "focusDurationSeconds" integer NOT NULL,
        "shortBreakDurationSeconds" integer NOT NULL,
        "longBreakDurationSeconds" integer NOT NULL,
        "longBreakEvery" integer NOT NULL DEFAULT 4,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pomodoro_profiles_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_profile_user_preset" ON "pomodoro_profiles" ("userId", "presetKey")',
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pomodoro_sessions" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "type" character varying NOT NULL DEFAULT 'focus',
        "durationSeconds" integer NOT NULL,
        "taskId" integer,
        "profileId" integer,
        "profileNameSnapshot" character varying(60) NOT NULL DEFAULT 'Classic',
        "focusDurationSeconds" integer NOT NULL DEFAULT 1500,
        "shortBreakDurationSeconds" integer NOT NULL DEFAULT 300,
        "longBreakDurationSeconds" integer NOT NULL DEFAULT 900,
        "longBreakEvery" integer NOT NULL DEFAULT 4,
        "clientSessionId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pomodoro_sessions_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'ALTER TABLE "pomodoro_sessions" ADD COLUMN IF NOT EXISTS "profileId" integer',
    );
    await queryRunner.query(
      `ALTER TABLE "pomodoro_sessions" ADD COLUMN IF NOT EXISTS "profileNameSnapshot" character varying(60) NOT NULL DEFAULT 'Classic'`,
    );
    await queryRunner.query(
      'ALTER TABLE "pomodoro_sessions" ADD COLUMN IF NOT EXISTS "focusDurationSeconds" integer NOT NULL DEFAULT 1500',
    );
    await queryRunner.query(
      'ALTER TABLE "pomodoro_sessions" ADD COLUMN IF NOT EXISTS "shortBreakDurationSeconds" integer NOT NULL DEFAULT 300',
    );
    await queryRunner.query(
      'ALTER TABLE "pomodoro_sessions" ADD COLUMN IF NOT EXISTS "longBreakDurationSeconds" integer NOT NULL DEFAULT 900',
    );
    await queryRunner.query(
      'ALTER TABLE "pomodoro_sessions" ADD COLUMN IF NOT EXISTS "longBreakEvery" integer NOT NULL DEFAULT 4',
    );
    await queryRunner.query(
      'ALTER TABLE "pomodoro_sessions" ADD COLUMN IF NOT EXISTS "clientSessionId" character varying',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_session_user_client" ON "pomodoro_sessions" ("userId", "clientSessionId")',
    );

    await this.addForeignKeyIfMissing(
      queryRunner,
      'taskId',
      'pomodoro_tasks',
      'FK_session_task',
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      'profileId',
      'pomodoro_profiles',
      'FK_session_profile',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "pomodoro_sessions" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "pomodoro_profiles" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "pomodoro_tasks" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "user" CASCADE');
  }

  private async addForeignKeyIfMissing(
    queryRunner: QueryRunner,
    column: 'taskId' | 'profileId',
    referencedTable: 'pomodoro_tasks' | 'pomodoro_profiles',
    constraintName: 'FK_session_task' | 'FK_session_profile',
  ): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint constraint_record
          JOIN pg_class table_record ON table_record.oid = constraint_record.conrelid
          WHERE table_record.relname = 'pomodoro_sessions'
            AND constraint_record.contype = 'f'
            AND pg_get_constraintdef(constraint_record.oid)
              LIKE 'FOREIGN KEY ("${column}") REFERENCES ${referencedTable}(id)%'
        ) THEN
          ALTER TABLE "pomodoro_sessions"
            ADD CONSTRAINT "${constraintName}"
            FOREIGN KEY ("${column}") REFERENCES "${referencedTable}"("id")
            ON DELETE SET NULL;
        END IF;
      END $$
    `);
  }
}
