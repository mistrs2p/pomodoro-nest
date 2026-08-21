import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { parseCookie } from 'cookie';
import type { Request } from 'express';

interface JwtPayload {
  id: number;
  email: string;
  iat?: number;
  exp?: number;
}

interface AuthenticatedUser {
  id: number;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in the configuration');
    }

    super({
      // jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null => {
          const cookieHeader = req.headers.cookie;
          if (!cookieHeader) return null;

          const cookies = parseCookie(cookieHeader);
          return cookies.access_token ?? null;
        },
      ]),
      secretOrKey: jwtSecret,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload.id || !payload.email) {
      throw new UnauthorizedException('Invalid JWT payload');
    }

    return {
      id: payload.id,
      email: payload.email,
    };
  }
}
