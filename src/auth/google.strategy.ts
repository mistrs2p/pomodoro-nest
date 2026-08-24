import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      // Temporary fallbacks preserve compatibility with the misspelled local keys.
      clientID:
        configService.get<string>('GOOGLE_CLIENT_ID') ??
        configService.getOrThrow<string>('GOGOLE_CLIENT_ID'),
      clientSecret:
        configService.get<string>('GOOGLE_CLIENT_SECRET') ??
        configService.getOrThrow<string>('GOGOLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): any {
    const { displayName, emails } = profile;
    const email = emails?.[0]?.value;
    if (!email) {
      return done(new Error('Google account did not provide an email'), false);
    }
    const user = {
      email,
      name: displayName,
      provider: 'google',
    };
    done(null, user);
  }
}
