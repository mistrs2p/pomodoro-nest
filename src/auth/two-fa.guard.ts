import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class TwoFAGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      body?: { challengeToken?: string };
      user?: { id: number; email: string };
    }>();
    const challengeToken = request.body?.challengeToken;

    if (!challengeToken) {
      throw new UnauthorizedException('2FA challenge is required');
    }

    request.user = this.authService.verifyTwoFactorChallenge(challengeToken);
    return true;
  }
}
