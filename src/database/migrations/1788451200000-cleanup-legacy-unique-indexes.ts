import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupLegacyUniqueIndexes1788451200000 implements MigrationInterface {
  name = 'CleanupLegacyUniqueIndexes1788451200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."IDX_12888746ec95602abaa7771ec9"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."IDX_0a217b19ffabed815161d41e97"',
    );
    await queryRunner.query(
      'ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "UQ_e12875dfb3b1d92d7d7c5377e22"',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_12888746ec95602abaa7771ec9" ON "pomodoro_profiles" ("userId", "presetKey")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_0a217b19ffabed815161d41e97" ON "pomodoro_sessions" ("userId", "clientSessionId")',
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'UQ_e12875dfb3b1d92d7d7c5377e22'
        ) THEN
          ALTER TABLE "user"
            ADD CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email");
        END IF;
      END $$
    `);
  }
}
