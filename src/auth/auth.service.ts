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

  async socialLogin(userData: {
    email: string;
    name: string;
    provider: string;
  }) {
    let user = await this.usersService.findUserByEmail(userData.email);

    if (!user) {
      user = await this.usersService.createUser({
        email: userData.email,
        firstName: userData.name,
        lastName: userData.name,
        password: '',
      });
    }
    return this.jwtService.sign({ id: user.id, email: user.email });
  }

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

  async login(loginDTO: LoginDTO) {
    const user = await this.usersService.findUserByEmail(loginDTO.email);
    const comparedPass = await bcrypt.compare(
      loginDTO.password,
      user?.password,
    );
    if (!user || !comparedPass) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.jwtService.sign({ id: user.id, email: user.email });
  }
}
