import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PomodoroProfile } from './entities/pomodoro-profile.entity';

export type PomodoroProfileInput = {
  name?: string;
  focusDurationSeconds?: number;
  shortBreakDurationSeconds?: number;
  longBreakDurationSeconds?: number;
  longBreakEvery?: number;
  isDefault?: boolean;
};

const PRESETS: Array<
  Pick<
    PomodoroProfile,
    | 'name'
    | 'presetKey'
    | 'isPreset'
    | 'focusDurationSeconds'
    | 'shortBreakDurationSeconds'
    | 'longBreakDurationSeconds'
    | 'longBreakEvery'
  >
> = [
  {
    name: 'Classic',
    presetKey: 'classic',
    isPreset: true,
    focusDurationSeconds: 25 * 60,
    shortBreakDurationSeconds: 5 * 60,
    longBreakDurationSeconds: 15 * 60,
    longBreakEvery: 4,
  },
  {
    name: 'Quick Focus',
    presetKey: 'quick',
    isPreset: true,
    focusDurationSeconds: 15 * 60,
    shortBreakDurationSeconds: 3 * 60,
    longBreakDurationSeconds: 10 * 60,
    longBreakEvery: 4,
  },
  {
    name: 'Deep Work',
    presetKey: 'deepWork',
    isPreset: true,
    focusDurationSeconds: 50 * 60,
    shortBreakDurationSeconds: 10 * 60,
    longBreakDurationSeconds: 25 * 60,
    longBreakEvery: 4,
  },
];

@Injectable()
export class PomodoroProfileService {
  constructor(
    @InjectRepository(PomodoroProfile)
    private readonly profileRepository: Repository<PomodoroProfile>,
  ) {}

  async findAll(userId: number) {
    await this.ensurePresets(userId);
    return this.profileRepository.find({
      where: { userId },
      order: { isPreset: 'DESC', createdAt: 'ASC' },
    });
  }

  async create(userId: number, input: PomodoroProfileInput) {
    const values = this.validate(input);
    const profile = this.profileRepository.create({
      userId,
      ...values,
      presetKey: null,
      isPreset: false,
      isDefault: false,
    });

    if (!input.isDefault) return this.profileRepository.save(profile);

    return this.profileRepository.manager.transaction(async (manager) => {
      await manager.update(PomodoroProfile, { userId }, { isDefault: false });
      profile.isDefault = true;
      return manager.save(PomodoroProfile, profile);
    });
  }

  async update(userId: number, id: number, input: PomodoroProfileInput) {
    const profile = await this.findOwned(userId, id);
    if (profile.isPreset)
      throw new BadRequestException('Preset profiles cannot be edited');

    const values = this.validate({
      name: input.name ?? profile.name,
      focusDurationSeconds:
        input.focusDurationSeconds ?? profile.focusDurationSeconds,
      shortBreakDurationSeconds:
        input.shortBreakDurationSeconds ?? profile.shortBreakDurationSeconds,
      longBreakDurationSeconds:
        input.longBreakDurationSeconds ?? profile.longBreakDurationSeconds,
      longBreakEvery: input.longBreakEvery ?? profile.longBreakEvery,
    });
    Object.assign(profile, values);
    return this.profileRepository.save(profile);
  }

  async setDefault(userId: number, id: number) {
    await this.findOwned(userId, id);
    return this.profileRepository.manager.transaction(async (manager) => {
      await manager.update(PomodoroProfile, { userId }, { isDefault: false });
      await manager.update(
        PomodoroProfile,
        { id, userId },
        { isDefault: true },
      );
      return manager.findOneByOrFail(PomodoroProfile, { id, userId });
    });
  }

  async remove(userId: number, id: number) {
    const profile = await this.findOwned(userId, id);
    if (profile.isPreset)
      throw new BadRequestException('Preset profiles cannot be deleted');
    if (profile.isDefault)
      throw new BadRequestException(
        'Choose another default profile before deleting this one',
      );
    await this.profileRepository.remove(profile);
    return { deleted: true };
  }

  private async ensurePresets(userId: number) {
    const existing = await this.profileRepository.find({ where: { userId } });
    const existingPresetKeys = new Set(
      existing.map((profile) => profile.presetKey).filter(Boolean),
    );
    const hasDefault = existing.some((profile) => profile.isDefault);
    const missing = PRESETS.filter(
      (preset) => !existingPresetKeys.has(preset.presetKey),
    );

    if (!missing.length) return;
    const profiles = missing.map((preset) =>
      this.profileRepository.create({
        ...preset,
        userId,
        isDefault: !hasDefault && preset.presetKey === 'classic',
      }),
    );
    await this.profileRepository.save(profiles);
  }

  private async findOwned(userId: number, id: number) {
    const profile = await this.profileRepository.findOne({
      where: { id, userId },
    });
    if (!profile) throw new BadRequestException('Focus profile not found');
    return profile;
  }

  private validate(input: PomodoroProfileInput) {
    const name = input.name?.trim();
    if (!name || name.length > 60)
      throw new BadRequestException('Profile name is required');

    const focusDurationSeconds = this.validateDuration(
      input.focusDurationSeconds,
      10,
      120,
      'Focus',
    );
    const shortBreakDurationSeconds = this.validateDuration(
      input.shortBreakDurationSeconds,
      1,
      30,
      'Short break',
    );
    const longBreakDurationSeconds = this.validateDuration(
      input.longBreakDurationSeconds,
      5,
      60,
      'Long break',
    );
    const longBreakEvery = input.longBreakEvery;
    if (
      !Number.isInteger(longBreakEvery) ||
      longBreakEvery! < 2 ||
      longBreakEvery! > 8
    ) {
      throw new BadRequestException(
        'Long break cadence must be between 2 and 8 sessions',
      );
    }

    return {
      name,
      focusDurationSeconds,
      shortBreakDurationSeconds,
      longBreakDurationSeconds,
      longBreakEvery: longBreakEvery!,
    };
  }

  private validateDuration(
    value: number | undefined,
    minimumMinutes: number,
    maximumMinutes: number,
    label: string,
  ) {
    if (
      !Number.isInteger(value) ||
      value! < minimumMinutes * 60 ||
      value! > maximumMinutes * 60
    ) {
      throw new BadRequestException(
        `${label} duration must be between ${minimumMinutes} and ${maximumMinutes} minutes`,
      );
    }
    return value!;
  }
}
