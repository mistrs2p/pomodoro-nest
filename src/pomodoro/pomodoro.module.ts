import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PomodoroController } from './pomodoro.controller';
import { PomodoroService } from './pomodoro.service';
import { PomodoroSession } from './entities/pomodoro-session.entity';
import { PomodoroTask } from './entities/pomodoro-task.entity';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { PomodoroProfile } from './entities/pomodoro-profile.entity';
import { PomodoroProfileController } from './pomodoro-profile.controller';
import { PomodoroProfileService } from './pomodoro-profile.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PomodoroSession, PomodoroTask, PomodoroProfile]),
  ],
  controllers: [PomodoroController, TaskController, PomodoroProfileController],
  providers: [PomodoroService, TaskService, PomodoroProfileService],
})
export class PomodoroModule {}
