import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TaskService } from './task.service';
import { PomodoroTask } from './entities/pomodoro-task.entity';

describe('TaskService', () => {
  const createMock = jest.fn(
    (data: Partial<PomodoroTask>) => data as PomodoroTask,
  );
  const saveMock = jest.fn((data: PomodoroTask) => Promise.resolve(data));
  const findOneMock = jest.fn();
  const findMock = jest.fn();
  const repository = {
    create: createMock,
    save: saveMock,
    findOne: findOneMock,
    find: findMock,
  } as unknown as Repository<PomodoroTask>;
  let service: TaskService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TaskService(repository);
  });

  it('stores the user estimate with a new task', async () => {
    const result = await service.create(4, 'Write project brief', 3);

    expect(createMock).toHaveBeenCalledWith({
      userId: 4,
      title: 'Write project brief',
      estimatedPomodoros: 3,
    });
    expect(result.estimatedPomodoros).toBe(3);
  });

  it('rejects estimates outside the supported range', async () => {
    await expect(
      service.create(4, 'Oversized task', 21),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records when a task is completed', async () => {
    const task = {
      id: 8,
      userId: 4,
      completed: false,
      completedAt: null,
    } as PomodoroTask;
    findOneMock.mockResolvedValue(task);

    const result = await service.complete(4, 8);

    expect(result.completed).toBe(true);
    expect(result.completedAt).toBeInstanceOf(Date);
  });
});
