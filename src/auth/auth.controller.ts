import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { createUserDTO } from './dto/create-user.dto';
import { LoginDTO } from './dto/login.dto';
import { UsersService } from 'src/users/users.service';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { TwoFAService } from './2fa.service';
import * as speakeasy from 'speakeasy';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
    private twoFAService: TwoFAService,
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
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const token = await this.authService.login(LoginDTO);
    this.setAccessTokenCookie(res, token);
    return { message: 'Login successful, token set in cookie' };
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
      maxAge: 24 * 60 * 60 * 1000, // 1 day

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

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: any) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const user = req.user;
    const token = await this.authService.socialLogin(user);

    this.setAccessTokenCookie(res, token);
    res.redirect(this.oauthSuccessUrl());
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth(@Req() req: any) {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthCallback(@Req() req: any, @Res() res: Response) {
    const user = req.user;
    const token = await this.authService.socialLogin(user);

    this.setAccessTokenCookie(res, token);
    res.redirect(this.oauthSuccessUrl());
  }

  private oauthSuccessUrl() {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return `${frontendUrl.replace(/\/$/, '')}/auth/callback`;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/generate')
  async generateTwoFactorAuthSecret(@Req() req: any) {
    const user = req.user;
    const secret = this.twoFAService.generateSecret(user.email);
    await this.userService.setTwoFASecret(user.id, secret.base32);
    if (!secret.otpauth_url) {
      throw new Error('OTP Auth URL is missing');
    }
    const qrcode = await this.twoFAService.generateQRCode(secret.otpauth_url);
    return { qrcode, secret: secret.base32 };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/enable')
  async enableTwoFactorAuth(@Req() req: any, @Body('code') code: string) {
    const user = await this.userService.findUserByEmail(req.user.email);
    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('2FA not set up for this user');
    }
    const verified = this.twoFAService.verifyCode(user.twoFactorSecret, code);
    if (!verified) {
      throw new UnauthorizedException('Invalid 2FA');
    }

    await this.userService.enableTwoFa(user.id);

    return { message: '2FA verification successful', success: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/verify')
  async verifyTwoFactorAuthCode(@Req() req: any, @Body('code') code: string) {
    const user = await this.userService.findUserByEmail(req.user.email);
    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('2FA not set up for this user');
    }
    const verified = this.twoFAService.verifyCode(user.twoFactorSecret, code);
    if (!verified) {
      throw new UnauthorizedException('Invalid 2FA');
    }
    return { message: '2FA verification successful', success: true };
  }
}
