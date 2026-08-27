import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { TwoFAService } from './auth/2fa.service';
import { PomodoroModule } from './pomodoro/pomodoro.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        console.log('Database configuration:', {
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT'),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
          autoLoadEntities: true,
          synchronize: true,
        });
        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT'),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
          // entities: [User, Session, Notification, Post, Comment], // add your entities here
          autoLoadEntities: true, // automatically load entities
          synchronize: true, // set to false in production,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    PomodoroModule,
  ],
  controllers: [AppController],
  providers: [AppService, TwoFAService],
})
export class AppModule {}
