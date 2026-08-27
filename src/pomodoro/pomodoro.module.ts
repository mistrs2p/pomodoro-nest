import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PomodoroController } from './pomodoro.controller';
import { PomodoroService } from './pomodoro.service';
import { PomodoroSession } from './entities/pomodoro-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PomodoroSession])],
  controllers: [PomodoroController],
  providers: [PomodoroService],
})
export class PomodoroModule {}