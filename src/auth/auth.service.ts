import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class AuthService {
    constructor(private readonly usersService: UsersService, 
      private readonly jwtService: JwtService
    ) {}
  async register(createUserDto: CreateUserDto): Promise<string> {
    // encrypt the password before saving the user to the database
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);
    createUserDto.password = hashedPassword;
    // save user to database logic here
    const user = await this.usersService.createUser(createUserDto);
    return this.jwtService.sign({id: user.id, email: user.email});
  }
}
