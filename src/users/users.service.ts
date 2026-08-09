import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm/repository/Repository.js';
import { CreateUserDto } from 'src/auth/dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UsersService {
    constructor(@InjectRepository(User) private readonly userRepository: Repository<User>) {}

    async createUser(data: CreateUserDto): Promise<User> {
        const newUser = this.userRepository.create(data);
        return await this.userRepository.save(newUser);
    }

    async findUserByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { email } });
    }
}
