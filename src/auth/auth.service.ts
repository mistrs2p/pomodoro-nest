import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDTO } from './dto/login.dto';
import type { SocialAuthUser } from './auth.types';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async socialLogin(userData: SocialAuthUser) {
    let user = await this.usersService.findUserByEmail(userData.email);

    if (!user) {
      user = await this.usersService.createUser({
        email: userData.email,
        firstName: userData.name,
        lastName: userData.name,
        password: null,
      });
    }
    return this.jwtService.sign({ id: user.id, email: user.email });
  }

  async register(createUserDto: CreateUserDto): Promise<string> {
    const existingUser = await this.usersService.findUserByEmail(
      createUserDto.email,
    );

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // encrypt the password before saving the user to the database
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );
    const user = await this.usersService.createUser({
      ...createUserDto,
      password: hashedPassword,
    });
    return this.jwtService.sign({ id: user.id, email: user.email });
  }

  async setPassword(userId: number, password: string): Promise<void> {
    const user = await this.usersService.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.usersService.updateUserPassword(user.id, hashedPassword);
  }

  createAccessToken(user: { id: number; email: string }): string {
    return this.jwtService.sign({ id: user.id, email: user.email });
  }

  createTwoFactorChallenge(user: { id: number; email: string }): string {
    return this.jwtService.sign(
      { id: user.id, email: user.email, purpose: '2fa-login' },
      { expiresIn: '5m' },
    );
  }

  verifyTwoFactorChallenge(challengeToken: string): {
    id: number;
    email: string;
  } {
    try {
      const payload = this.jwtService.verify<{
        id: number;
        email: string;
        purpose: string;
      }>(challengeToken);

      if (payload.purpose !== '2fa-login' || !payload.id || !payload.email) {
        throw new UnauthorizedException('Invalid 2FA challenge');
      }

      return { id: payload.id, email: payload.email };
    } catch {
      throw new UnauthorizedException('Invalid or expired 2FA challenge');
    }
  }

  async login(loginDTO: LoginDTO): Promise<{
    token?: string;
    user?: { id: number; email: string; isTwoFAEnabled?: boolean };
    twoFARequired: boolean;
  }> {
    const user = await this.usersService.findUserByEmail(loginDTO.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'This account was created with a social login. Please use Google or GitHub login.',
      );
    }

    const comparedPass = await bcrypt.compare(
      loginDTO.password,
      user.password ?? '',
    );

    if (!comparedPass) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const twoFARequired = Boolean(user.isTwoFAEnabled);

    return {
      user: {
        id: user.id,
        email: user.email,
        isTwoFAEnabled: user.isTwoFAEnabled,
      },
      token: twoFARequired ? undefined : this.createAccessToken(user),
      twoFARequired,
    };
  }
}
