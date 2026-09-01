import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PomodoroProfileService } from './pomodoro-profile.service';
import type { PomodoroProfileInput } from './pomodoro-profile.service';

@Controller('pomodoro/profiles')
@UseGuards(AuthGuard('jwt'))
export class PomodoroProfileController {
  constructor(private readonly profileService: PomodoroProfileService) {}

  @Get()
  findAll(@Req() req: { user: { id: number } }) {
    return this.profileService.findAll(req.user.id);
  }

  @Post()
  create(
    @Req() req: { user: { id: number } },
    @Body() body: PomodoroProfileInput,
  ) {
    return this.profileService.create(req.user.id, body);
  }

  @Patch(':id/default')
  setDefault(
    @Req() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.profileService.setDefault(req.user.id, id);
  }

  @Patch(':id')
  update(
    @Req() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PomodoroProfileInput,
  ) {
    return this.profileService.update(req.user.id, id, body);
  }

  @Delete(':id')
  remove(
    @Req() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.profileService.remove(req.user.id, id);
  }
}
