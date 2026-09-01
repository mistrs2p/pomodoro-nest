import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PomodoroTask } from './entities/pomodoro-task.entity';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(PomodoroTask)
    private readonly taskRepository: Repository<PomodoroTask>,
  ) {}

  findAll(userId: number) {
    return this.taskRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  async create(userId: number, title: string, estimatedPomodoros = 1) {
    const cleanTitle = title?.trim();
    if (!cleanTitle || cleanTitle.length > 160)
      throw new BadRequestException('Task title is required');
    if (
      !Number.isInteger(estimatedPomodoros) ||
      estimatedPomodoros < 1 ||
      estimatedPomodoros > 20
    ) {
      throw new BadRequestException(
        'Estimated Pomodoros must be between 1 and 20',
      );
    }
    return this.taskRepository.save(
      this.taskRepository.create({
        userId,
        title: cleanTitle,
        estimatedPomodoros,
      }),
    );
  }

  async complete(userId: number, id: number) {
    const task = await this.taskRepository.findOne({ where: { id, userId } });
    if (!task) throw new BadRequestException('Task not found');
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date() : null;
    return this.taskRepository.save(task);
  }
}
