import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThanOrEqual, Repository } from 'typeorm';
import { PomodoroSession } from './entities/pomodoro-session.entity';
import { PomodoroTask } from './entities/pomodoro-task.entity';

type CompletedSessionInput = {
  type?: PomodoroSession['type'];
  durationSeconds?: number;
  taskId?: number | null;
  clientSessionId?: string | null;
};

@Injectable()
export class PomodoroService {
  constructor(
    @InjectRepository(PomodoroSession)
    private readonly sessionRepository: Repository<PomodoroSession>,
    private readonly dataSource: DataSource,
  ) {}

  async createCompletedSession(userId: number, data: CompletedSessionInput) {
    const type = data.type ?? 'focus';
    const durationSeconds = data.durationSeconds ?? 1500;
    const taskId = data.taskId ?? null;
    const clientSessionId = data.clientSessionId?.trim() || null;

    if (durationSeconds <= 0 || durationSeconds > 24 * 60 * 60) {
      throw new BadRequestException('Invalid session duration');
    }
    if (type === 'focus' && !taskId) {
      throw new BadRequestException('A task is required for a focus session');
    }
    if (clientSessionId && clientSessionId.length > 100) {
      throw new BadRequestException('Invalid client session id');
    }

    return this.dataSource.transaction(async (manager) => {
      if (clientSessionId) {
        const existing = await manager.findOne(PomodoroSession, {
          where: { userId, clientSessionId },
        });
        if (existing) return existing;
      }

      let task: PomodoroTask | null = null;
      if (type === 'focus') {
        task = await manager.findOne(PomodoroTask, { where: { id: taskId!, userId } });
        if (!task) throw new BadRequestException('Task not found');
        if (task.completed) throw new BadRequestException('Completed tasks cannot receive new focus sessions');
      }

      const session = manager.create(PomodoroSession, {
        userId,
        type,
        durationSeconds,
        taskId,
        clientSessionId,
      });
      const savedSession = await manager.save(PomodoroSession, session);

      if (task) {
        task.completedPomodoros += 1;
        await manager.save(PomodoroTask, task);
      }

      return savedSession;
    });
  }

  findToday(userId: number) {
    const startOfDay = this.startOfDay(new Date());
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

  async getWeeklyStats(userId: number) {
    const startOfWeek = this.startOfDay(new Date());
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const sessions = await this.sessionRepository.find({
      where: { userId, type: 'focus', createdAt: MoreThanOrEqual(startOfWeek) },
      order: { createdAt: 'ASC' },
    });
    const totals = new Map<string, { focusSeconds: number; dayIndex: number }>();

    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + offset);
      totals.set(this.dateKey(date), { focusSeconds: 0, dayIndex: this.dayIndex(date) });
    }

    for (const session of sessions) {
      const key = this.dateKey(session.createdAt);
      const current = totals.get(key);
      if (current) current.focusSeconds += session.durationSeconds;
    }

    return Array.from(totals, ([date, value]) => ({ date, ...value }));
  }

  async getOverview(userId: number) {
    const [today, week, allFocusSessions] = await Promise.all([
      this.getTodayStats(userId),
      this.getWeeklyStats(userId),
      this.sessionRepository.find({
        where: { userId, type: 'focus' },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const sessionsByDay = new Set(allFocusSessions.map((session) => this.dateKey(session.createdAt)));
    const hourCounts = new Map<number, number>();
    for (const session of allFocusSessions) {
      const hour = session.createdAt.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    }

    let streakDays = 0;
    const cursor = this.startOfDay(new Date());
    if (!sessionsByDay.has(this.dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (sessionsByDay.has(this.dateKey(cursor))) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const bestFocusHour = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      today,
      week,
      streakDays,
      bestFocusHour,
      totalCompletedSessions: allFocusSessions.length,
    };
  }

  private startOfDay(date: Date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private dateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private dayIndex(date: Date) {
    const weekday = date.getDay();
    return weekday === 0 ? 6 : weekday - 1;
  }
}
