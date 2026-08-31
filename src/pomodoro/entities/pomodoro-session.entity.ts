import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PomodoroTask } from './pomodoro-task.entity';

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

  @Column({ type: 'varchar', nullable: true })
  clientSessionId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
