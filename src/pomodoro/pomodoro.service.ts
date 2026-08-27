import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { PomodoroSession } from './entities/pomodoro-session.entity';

@Injectable()
export class PomodoroService {
  constructor(
    @InjectRepository(PomodoroSession)
    private readonly sessionRepository: Repository<PomodoroSession>,
  ) {}

  async createCompletedSession(
    userId: number,
    data: { type?: PomodoroSession['type']; durationSeconds?: number; taskId?: number | null },
  ) {
    const durationSeconds = data.durationSeconds ?? 1500;
    if (durationSeconds <= 0 || durationSeconds > 24 * 60 * 60) {
      throw new Error('Invalid session duration');
    }

    const session = this.sessionRepository.create({
      userId,
      type: data.type ?? 'focus',
      durationSeconds,
      taskId: data.taskId ?? null,
    });
    return this.sessionRepository.save(session);
  }

  findToday(userId: number) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.sessionRepository.find({
      where: { userId, createdAt: MoreThanOrEqual(startOfDay) },
      order: { createdAt: 'DESC' },
    });
  }

  async getTodayStats(userId: number) {
    const sessions = await this.findToday(userId);
    const focusSessions = sessions.filter((session) => session.type === 'focus');
    return {
      completedSessions: focusSessions.length,
      focusSeconds: focusSessions.reduce((total, session) => total + session.durationSeconds, 0),
    };
  }
}