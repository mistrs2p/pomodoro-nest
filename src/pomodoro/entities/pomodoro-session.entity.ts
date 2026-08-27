import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pomodoro_sessions')
export class PomodoroSession {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({ type: 'varchar', default: 'focus' })
  type!: 'focus' | 'shortBreak' | 'longBreak';

  @Column({ type: 'integer' })
  durationSeconds!: number;

  @CreateDateColumn()
  createdAt!: Date;
}