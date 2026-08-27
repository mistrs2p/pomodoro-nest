import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PomodoroSession } from './entities/pomodoro-session.entity';

@Injectable()
export class PomodoroService {
  constructor(
    @InjectRepository(PomodoroSession)
    private readonly sessionRepository: Repository<PomodoroSession>,
  ) {}

  async createCompletedSession(
    userId: number,
    data: { type?: PomodoroSession['type']; durationSeconds?: number },
  ) {
    const durationSeconds = data.durationSeconds ?? 1500;
    if (durationSeconds <= 0 || durationSeconds > 24 * 60 * 60) {
      throw new Error('Invalid session duration');
    }

    const session = this.sessionRepository.create({
      userId,
      type: data.type ?? 'focus',
      durationSeconds,
    });
    return this.sessionRepository.save(session);
  }

  findToday(userId: number) {
    return this.sessionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}