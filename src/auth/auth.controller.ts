import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { createUserDTO } from './dto/create-user.dto';
import { LoginDTO } from './dto/login.dto';
import { UsersService } from 'src/users/users.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  @Post('register')
  async register(
    @Body() createUserDTO: createUserDTO,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ token: string }> {
    const token = await this.authService.register(createUserDTO);
    this.setAccessTokenCookie(response, token);
    return { token };
  }

  @Post('login')
  async login(
    @Body() LoginDTO: LoginDTO,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ token: string }> {
    const token = await this.authService.login(LoginDTO);
    this.setAccessTokenCookie(response, token);
    return { token };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', { path: '/' });
    return { success: true };
  }

  private setAccessTokenCookie(response: Response, token: string) {
    response.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
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
