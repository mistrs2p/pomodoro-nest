import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PomodoroProfile } from './entities/pomodoro-profile.entity';
import { PomodoroProfileService } from './pomodoro-profile.service';

describe('PomodoroProfileService', () => {
  const findMock = jest.fn();
  const findOneMock = jest.fn();
  const createMock = jest.fn((data: unknown) => data);
  const saveMock = jest.fn((data: unknown) => Promise.resolve(data));
  const removeMock = jest.fn();
  const transactionMock = jest.fn();
  const repository = {
    find: findMock,
    findOne: findOneMock,
    create: createMock,
    save: saveMock,
    remove: removeMock,
    manager: { transaction: transactionMock },
  } as unknown as Repository<PomodoroProfile>;
  let service: PomodoroProfileService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PomodoroProfileService(repository);
  });

  it('creates the three presets and selects Classic by default for a new user', async () => {
    findMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await service.findAll(7);

    expect(saveMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 7,
          presetKey: 'classic',
          isDefault: true,
        }),
        expect.objectContaining({
          userId: 7,
          presetKey: 'quick',
          isDefault: false,
        }),
        expect.objectContaining({
          userId: 7,
          presetKey: 'deepWork',
          isDefault: false,
        }),
      ]),
    );
  });

  it('stores a valid custom profile', async () => {
    const profile = await service.create(4, {
      name: 'Writing',
      focusDurationSeconds: 40 * 60,
      shortBreakDurationSeconds: 8 * 60,
      longBreakDurationSeconds: 20 * 60,
      longBreakEvery: 3,
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 4,
        name: 'Writing',
        presetKey: null,
        isPreset: false,
      }),
    );
    expect(profile.focusDurationSeconds).toBe(2400);
  });

  it('rejects profile values outside the supported bounds', async () => {
    await expect(
      service.create(4, {
        name: 'Too long',
        focusDurationSeconds: 121 * 60,
        shortBreakDurationSeconds: 5 * 60,
        longBreakDurationSeconds: 15 * 60,
        longBreakEvery: 4,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not allow preset profiles to be edited', async () => {
    findOneMock.mockResolvedValue({
      id: 2,
      userId: 4,
      isPreset: true,
    });

    await expect(service.update(4, 2, { name: 'Changed' })).rejects.toThrow(
      'Preset profiles cannot be edited',
    );
  });
});
