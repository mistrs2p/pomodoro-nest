import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThanOrEqual, Repository } from 'typeorm';
import { PomodoroSession } from './entities/pomodoro-session.entity';
import { PomodoroTask } from './entities/pomodoro-task.entity';
import { PomodoroProfile } from './entities/pomodoro-profile.entity';

type CompletedSessionInput = {
  type?: PomodoroSession['type'];
  durationSeconds?: number;
  taskId?: number | null;
  clientSessionId?: string | null;
  profileId?: number | null;
  profileName?: string;
  focusDurationSeconds?: number;
  shortBreakDurationSeconds?: number;
  longBreakDurationSeconds?: number;
  longBreakEvery?: number;
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
    const taskId = data.taskId ?? null;
    const clientSessionId = data.clientSessionId?.trim() || null;
    const profileId = data.profileId ?? null;
    const profileSnapshot = this.validateProfileSnapshot(data);
    const expectedDuration = profileSnapshot[`${type}DurationSeconds`];
    const durationSeconds = data.durationSeconds ?? expectedDuration;

    if (durationSeconds !== expectedDuration) {
      throw new BadRequestException(
        'Session duration must match the selected focus profile',
      );
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

      if (profileId) {
        const profile = await manager.findOne(PomodoroProfile, {
          where: { id: profileId, userId },
        });
        if (!profile) throw new BadRequestException('Focus profile not found');
      }

      let task: PomodoroTask | null = null;
      if (type === 'focus') {
        task = await manager.findOne(PomodoroTask, {
          where: { id: taskId!, userId },
        });
        if (!task) throw new BadRequestException('Task not found');
        if (task.completed)
          throw new BadRequestException(
            'Completed tasks cannot receive new focus sessions',
          );
      }

      const session = manager.create(PomodoroSession, {
        userId,
        type,
        durationSeconds,
        taskId,
        clientSessionId,
        profileId,
        profileNameSnapshot: profileSnapshot.profileName,
        focusDurationSeconds: profileSnapshot.focusDurationSeconds,
        shortBreakDurationSeconds: profileSnapshot.shortBreakDurationSeconds,
        longBreakDurationSeconds: profileSnapshot.longBreakDurationSeconds,
        longBreakEvery: profileSnapshot.longBreakEvery,
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
    const focusSessions = sessions.filter(
      (session) => session.type === 'focus',
    );
    return {
      completedSessions: focusSessions.length,
      focusSeconds: focusSessions.reduce(
        (total, session) => total + session.durationSeconds,
        0,
      ),
    };
  }

  async getWeeklyStats(userId: number) {
    const startOfWeek = this.startOfDay(new Date());
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const sessions = await this.sessionRepository.find({
      where: { userId, type: 'focus', createdAt: MoreThanOrEqual(startOfWeek) },
      order: { createdAt: 'ASC' },
    });
    const totals = new Map<
      string,
      { focusSeconds: number; dayIndex: number }
    >();

    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + offset);
      totals.set(this.dateKey(date), {
        focusSeconds: 0,
        dayIndex: this.dayIndex(date),
      });
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

    const sessionsByDay = new Set(
      allFocusSessions.map((session) => this.dateKey(session.createdAt)),
    );
    const hourCounts = new Map<number, number>();
    const profileTotals = new Map<
      string,
      { completedSessions: number; focusSeconds: number }
    >();
    for (const session of allFocusSessions) {
      const hour = session.createdAt.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
      const profileName = session.profileNameSnapshot || 'Classic';
      const profileTotal = profileTotals.get(profileName) ?? {
        completedSessions: 0,
        focusSeconds: 0,
      };
      profileTotal.completedSessions += 1;
      profileTotal.focusSeconds += session.durationSeconds;
      profileTotals.set(profileName, profileTotal);
    }

    let streakDays = 0;
    const cursor = this.startOfDay(new Date());
    if (!sessionsByDay.has(this.dateKey(cursor)))
      cursor.setDate(cursor.getDate() - 1);
    while (sessionsByDay.has(this.dateKey(cursor))) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const bestFocusHour =
      Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      null;

    return {
      today,
      week,
      streakDays,
      bestFocusHour,
      totalCompletedSessions: allFocusSessions.length,
      averageFocusSeconds: allFocusSessions.length
        ? Math.round(
            allFocusSessions.reduce(
              (total, session) => total + session.durationSeconds,
              0,
            ) / allFocusSessions.length,
          )
        : 0,
      profileBreakdown: Array.from(profileTotals, ([profileName, totals]) => ({
        profileName,
        ...totals,
      })).sort((a, b) => b.focusSeconds - a.focusSeconds),
    };
  }

  private validateProfileSnapshot(data: CompletedSessionInput) {
    const profileName = data.profileName?.trim() || 'Classic';
    if (profileName.length > 60)
      throw new BadRequestException('Invalid focus profile name');

    return {
      profileName,
      focusDurationSeconds: this.validateDuration(
        data.focusDurationSeconds ?? 1500,
        10,
        120,
        'Focus',
      ),
      shortBreakDurationSeconds: this.validateDuration(
        data.shortBreakDurationSeconds ?? 300,
        1,
        30,
        'Short break',
      ),
      longBreakDurationSeconds: this.validateDuration(
        data.longBreakDurationSeconds ?? 900,
        5,
        60,
        'Long break',
      ),
      longBreakEvery: this.validateCadence(data.longBreakEvery ?? 4),
    };
  }

  private validateDuration(
    value: number,
    minimumMinutes: number,
    maximumMinutes: number,
    label: string,
  ) {
    if (
      !Number.isInteger(value) ||
      value < minimumMinutes * 60 ||
      value > maximumMinutes * 60
    ) {
      throw new BadRequestException(
        `${label} duration must be between ${minimumMinutes} and ${maximumMinutes} minutes`,
      );
    }
    return value;
  }

  private validateCadence(value: number) {
    if (!Number.isInteger(value) || value < 2 || value > 8) {
      throw new BadRequestException(
        'Long break cadence must be between 2 and 8 sessions',
      );
    }
    return value;
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
