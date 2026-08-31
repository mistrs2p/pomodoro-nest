import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PomodoroService } from './pomodoro.service';
import { PomodoroSession } from './entities/pomodoro-session.entity';

@Controller('pomodoro')
@UseGuards(AuthGuard('jwt'))
export class PomodoroController {
  constructor(private readonly pomodoroService: PomodoroService) {}

  @Post('sessions')
  createSession(
    @Req() req: { user: { id: number } },
    @Body() body: {
      type?: PomodoroSession['type'];
      durationSeconds?: number;
      taskId?: number | null;
      clientSessionId?: string | null;
    },
  ) {
    return this.pomodoroService.createCompletedSession(req.user.id, body);
  }

  @Get('sessions/today')
  findToday(@Req() req: { user: { id: number } }) {
    return this.pomodoroService.findToday(req.user.id);
  }

  @Get('stats/today')
  getTodayStats(@Req() req: { user: { id: number } }) {
    return this.pomodoroService.getTodayStats(req.user.id);
  }

  @Get('stats/week')
  getWeeklyStats(@Req() req: { user: { id: number } }) {
    return this.pomodoroService.getWeeklyStats(req.user.id);
  }

  @Get('stats/overview')
  getOverview(@Req() req: { user: { id: number } }) {
    return this.pomodoroService.getOverview(req.user.id);
  }
}
