import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createUserDTO } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDTO } from './dto/login.dto';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}
  async register(createUserDTO: createUserDTO): Promise<string> {
    // encrypt the password before saving the user to the database
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDTO.password,
      saltRounds,
    );
    createUserDTO.password = hashedPassword;
    // save user to database logic here
    const user = await this.usersService.createUser(createUserDTO);
    return this.jwtService.sign({ id: user.id, email: user.email });
  }

  async login(LoginDTO: LoginDTO) {
    const user = await this.usersService.findUserByEmail(LoginDTO.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.jwtService.sign({ id: user.id, email: user.email });
  }
}
