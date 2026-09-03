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
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDTO } from './dto/login.dto';
import { UsersService } from 'src/users/users.service';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { TwoFAService } from './2fa.service';
import { TwoFAGuard } from './two-fa.guard';
import type { AuthenticatedRequest, SocialAuthRequest } from './auth.types';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
    private twoFAService: TwoFAService,
  ) {}

  @Post('register')
  async register(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ token: string }> {
    const token = await this.authService.register(createUserDto);
    this.setAccessTokenCookie(response, token);
    return { token };
  }

  @Post('login')
  async login(
    @Body() LoginDTO: LoginDTO,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    message: string;
    twoFARequired: boolean;
    challengeToken?: string;
  }> {
    const result = await this.authService.login(LoginDTO);

    if (result.twoFARequired) {
      if (!result.user) throw new UnauthorizedException('Invalid login state');
      return {
        message: '2FA required',
        twoFARequired: true,
        challengeToken: this.authService.createTwoFactorChallenge({
          id: result.user.id,
          email: result.user.email,
        }),
      };
    }

    if (!result.token) throw new UnauthorizedException('Invalid login state');
    this.setAccessTokenCookie(res, result.token);
    return {
      message: 'Login successful, token set in cookie',
      twoFARequired: false,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('password')
  async setPassword(
    @Req() req: AuthenticatedRequest,
    @Body('password') password: string,
  ) {
    if (!password || password.length < 6) {
      throw new UnauthorizedException('Password must be at least 6 characters');
    }

    await this.authService.setPassword(req.user.id, password);
    return { message: 'Password set successfully', success: true };
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
  async profile(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ email: string; isTwoFAEnabled: boolean }> {
    const user = await this.userService.findUserByEmail(req.user.email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return { email: user.email, isTwoFAEnabled: Boolean(user.isTwoFAEnabled) };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: SocialAuthRequest,
    @Res() res: Response,
  ) {
    const token = await this.authService.socialLogin(req.user);

    this.setAccessTokenCookie(res, token);
    res.redirect(this.oauthSuccessUrl());
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthCallback(
    @Req() req: SocialAuthRequest,
    @Res() res: Response,
  ) {
    const token = await this.authService.socialLogin(req.user);

    this.setAccessTokenCookie(res, token);
    res.redirect(this.oauthSuccessUrl());
  }

  private oauthSuccessUrl() {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return `${frontendUrl.replace(/\/$/, '')}/auth/callback`;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('2fa/generate')
  async generateTwoFactorAuthSecret(@Req() req: AuthenticatedRequest) {
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
  async enableTwoFactorAuth(
    @Req() req: AuthenticatedRequest,
    @Body('code') code: string,
  ) {
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

  @UseGuards(TwoFAGuard)
  @Post('2fa/verify')
  async verifyTwoFactorAuthCode(
    @Req() req: AuthenticatedRequest,
    @Body('code') code: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.userService.findUserByEmail(req.user.email);
    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('2FA not set up for this user');
    }
    const verified = this.twoFAService.verifyCode(user.twoFactorSecret, code);
    if (!verified) {
      throw new UnauthorizedException('Invalid 2FA');
    }

    const token = this.authService.createAccessToken({
      id: user.id,
      email: user.email,
    });
    this.setAccessTokenCookie(response, token);
    return { message: '2FA verification successful', success: true };
  }
}
