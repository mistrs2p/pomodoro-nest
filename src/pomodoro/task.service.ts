import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PomodoroTask } from './entities/pomodoro-task.entity';

@Injectable()
export class TaskService {
  constructor(@InjectRepository(PomodoroTask) private readonly taskRepository: Repository<PomodoroTask>) {}

  findAll(userId: number) {
    return this.taskRepository.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  async create(userId: number, title: string) {
    const cleanTitle = title?.trim();
    if (!cleanTitle || cleanTitle.length > 160) throw new BadRequestException('Task title is required');
    return this.taskRepository.save(this.taskRepository.create({ userId, title: cleanTitle }));
  }

  async complete(userId: number, id: number) {
    const task = await this.taskRepository.findOne({ where: { id, userId } });
    if (!task) throw new BadRequestException('Task not found');
    task.completed = !task.completed;
    return this.taskRepository.save(task);
  }
}