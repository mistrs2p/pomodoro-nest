import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PomodoroTask } from './pomodoro-task.entity';
import { PomodoroProfile } from './pomodoro-profile.entity';

@Entity('pomodoro_sessions')
@Index(['userId', 'clientSessionId'], { unique: true })
export class PomodoroSession {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({ type: 'varchar', default: 'focus' })
  type!: 'focus' | 'shortBreak' | 'longBreak';

  @Column({ type: 'integer' })
  durationSeconds!: number;

  @Column({ type: 'integer', nullable: true })
  taskId!: number | null;

  @ManyToOne(() => PomodoroTask, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'taskId' })
  task!: PomodoroTask | null;

  @Column({ type: 'integer', nullable: true })
  profileId!: number | null;

  @ManyToOne(() => PomodoroProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'profileId' })
  profile!: PomodoroProfile | null;

  @Column({ type: 'varchar', length: 60, default: 'Classic' })
  profileNameSnapshot!: string;

  @Column({ type: 'integer', default: 1500 })
  focusDurationSeconds!: number;

  @Column({ type: 'integer', default: 300 })
  shortBreakDurationSeconds!: number;

  @Column({ type: 'integer', default: 900 })
  longBreakDurationSeconds!: number;

  @Column({ type: 'integer', default: 4 })
  longBreakEvery!: number;

  @Column({ type: 'varchar', nullable: true })
  clientSessionId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
