import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskService } from './task.service';

@Controller('pomodoro/tasks')
@UseGuards(AuthGuard('jwt'))
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  findAll(@Req() req: { user: { id: number } }) { return this.taskService.findAll(req.user.id); }

  @Post()
  create(
    @Req() req: { user: { id: number } },
    @Body() body: { title?: string; estimatedPomodoros?: number },
  ) {
    return this.taskService.create(req.user.id, body.title ?? '', body.estimatedPomodoros ?? 1);
  }

  @Patch(':id/toggle')
  toggle(@Req() req: { user: { id: number } }, @Param('id', ParseIntPipe) id: number) {
    return this.taskService.complete(req.user.id, id);
  }
}
