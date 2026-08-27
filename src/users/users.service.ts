import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm/repository/Repository.js';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async createUser(data: Partial<User>): Promise<User> {
    const newUser = this.userRepository.create(data);
    return await this.userRepository.save(newUser);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findUserById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async updateUserPassword(id: number, password: string) {
    return this.userRepository.update({ id }, { password });
  }

  async setTwoFASecret(id: number, secret: string) {
    return this.userRepository.update({ id }, { twoFactorSecret: secret });
  }

  async enableTwoFa(id: number) {
    return this.userRepository.update({ id }, { isTwoFAEnabled: true });
  }
}
