import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PomodoroPresetKey = 'classic' | 'quick' | 'deepWork';

@Entity('pomodoro_profiles')
@Index(['userId', 'presetKey'], { unique: true })
export class PomodoroProfile {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({ type: 'varchar', length: 60 })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  presetKey!: PomodoroPresetKey | null;

  @Column({ default: false })
  isPreset!: boolean;

  @Column({ default: false })
  isDefault!: boolean;

  @Column({ type: 'integer' })
  focusDurationSeconds!: number;

  @Column({ type: 'integer' })
  shortBreakDurationSeconds!: number;

  @Column({ type: 'integer' })
  longBreakDurationSeconds!: number;

  @Column({ type: 'integer', default: 4 })
  longBreakEvery!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
