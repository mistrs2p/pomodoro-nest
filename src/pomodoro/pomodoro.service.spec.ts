import { BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PomodoroService } from './pomodoro.service';
import { PomodoroSession } from './entities/pomodoro-session.entity';
import { PomodoroTask } from './entities/pomodoro-task.entity';

describe('PomodoroService', () => {
  const sessionRepository = {
    find: jest.fn(),
  } as unknown as Repository<PomodoroSession>;
  const manager = {
    findOne: jest.fn(),
    create: jest.fn((_entity: unknown, data: unknown) => data),
    save: jest.fn((_entity: unknown, data: unknown) => Promise.resolve(data)),
  };
  const dataSource = {
    transaction: jest.fn(
      (callback: (entityManager: typeof manager) => unknown) =>
        Promise.resolve(callback(manager)),
    ),
  } as unknown as DataSource;
  let service: PomodoroService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PomodoroService(sessionRepository, dataSource);
  });

  it('requires a task for focus sessions', async () => {
    await expect(
      service.createCompletedSession(1, { type: 'focus' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a task that does not belong to the authenticated user', async () => {
    manager.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await expect(
      service.createCompletedSession(1, {
        type: 'focus',
        taskId: 99,
        clientSessionId: 'session-1',
      }),
    ).rejects.toThrow('Task not found');
  });

  it('stores the session and increments persisted task progress', async () => {
    const task = {
      id: 7,
      userId: 1,
      completed: false,
      completedPomodoros: 2,
    } as PomodoroTask;
    manager.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(task);

    await service.createCompletedSession(1, {
      type: 'focus',
      durationSeconds: 1500,
      taskId: 7,
      clientSessionId: 'session-2',
    });

    expect(task.completedPomodoros).toBe(3);
    expect(manager.save).toHaveBeenCalledWith(PomodoroTask, task);
    expect(manager.create).toHaveBeenCalledWith(
      PomodoroSession,
      expect.objectContaining({
        userId: 1,
        taskId: 7,
        clientSessionId: 'session-2',
        profileNameSnapshot: 'Classic',
        focusDurationSeconds: 1500,
        shortBreakDurationSeconds: 300,
        longBreakDurationSeconds: 900,
        longBreakEvery: 4,
      }),
    );
  });

  it('stores the immutable custom profile snapshot used by a session', async () => {
    const profile = { id: 3, userId: 1 };
    const task = {
      id: 7,
      userId: 1,
      completed: false,
      completedPomodoros: 0,
    } as PomodoroTask;
    manager.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(profile)
      .mockResolvedValueOnce(task);

    await service.createCompletedSession(1, {
      type: 'focus',
      durationSeconds: 2400,
      taskId: 7,
      clientSessionId: 'custom-session',
      profileId: 3,
      profileName: 'Writing',
      focusDurationSeconds: 2400,
      shortBreakDurationSeconds: 480,
      longBreakDurationSeconds: 1200,
      longBreakEvery: 3,
    });

    expect(manager.create).toHaveBeenCalledWith(
      PomodoroSession,
      expect.objectContaining({
        profileId: 3,
        profileNameSnapshot: 'Writing',
        focusDurationSeconds: 2400,
        shortBreakDurationSeconds: 480,
        longBreakDurationSeconds: 1200,
        longBreakEvery: 3,
      }),
    );
  });

  it('rejects a duration that differs from the profile snapshot', async () => {
    await expect(
      service.createCompletedSession(1, {
        type: 'focus',
        durationSeconds: 1500,
        taskId: 7,
        focusDurationSeconds: 2400,
      }),
    ).rejects.toThrow('Session duration must match the selected focus profile');
  });

  it('returns an existing client session without incrementing progress twice', async () => {
    const existing = {
      id: 12,
      userId: 1,
      clientSessionId: 'same-session',
    } as PomodoroSession;
    manager.findOne.mockResolvedValueOnce(existing);

    const result = await service.createCompletedSession(1, {
      type: 'focus',
      taskId: 7,
      clientSessionId: 'same-session',
    });

    expect(result).toBe(existing);
    expect(manager.save).not.toHaveBeenCalled();
  });
});
