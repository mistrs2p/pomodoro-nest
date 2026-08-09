import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
@Injectable()
export class AuthService {
    constructor(private readonly usersService: UsersService) {}
  async register(createUserDto: CreateUserDto): Promise<{ message: string } & CreateUserDto> {
    // encrypt the password before saving the user to the database
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);
    createUserDto.password = hashedPassword;
    // save user to database logic here
    await this.usersService.createUser(createUserDto);
    return {message: 'User registered successfully', ...createUserDto};
  }
}
