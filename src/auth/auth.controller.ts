import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { createUserDTO } from './dto/create-user.dto';
import { LoginDTO } from './dto/login.dto';
import { UsersService } from 'src/users/users.service';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  @Post('register')
  async register(
    @Body() createUserDTO: createUserDTO,
  ): Promise<{ token: string }> {
    // register logic here
    const token = await this.authService.register(createUserDTO);
    return { token };
  }

  @Post('login')
  async login(
    @Body() LoginDTO: LoginDTO,
    @Res({ passthrough: true }) res: Response,
    // ): Promise<{ token: string }> {
  ): Promise<{ message: string }> {
    // register logic here
    const token = await this.authService.login(LoginDTO);
    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: '/',
    });
    return { message: 'Login successful, token set in cookie' };
    // return { token };
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async profile(@Req() req: any): Promise<{ email: string }> {
    // register logic here
    const user = await this.userService.findUserByEmail(req.user.email);
    if (!user) {
      throw new Error('User not found');
    }
    return { email: user.email };
  }
}
