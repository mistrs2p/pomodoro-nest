import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
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

function extractAccessToken(request: Request): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== 'access_token') continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
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
        (req: Request): string | null => extractAccessToken(req),
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
