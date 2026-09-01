import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pomodoro_tasks')
export class PomodoroTask {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ default: false })
  completed!: boolean;

  @Column({ type: 'integer', default: 1 })
  estimatedPomodoros!: number;

  @Column({ type: 'integer', default: 0 })
  completedPomodoros!: number;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
