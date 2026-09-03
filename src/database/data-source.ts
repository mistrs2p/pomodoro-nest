import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { PomodoroTask } from '../pomodoro/entities/pomodoro-task.entity';
import { PomodoroProfile } from '../pomodoro/entities/pomodoro-profile.entity';
import { PomodoroSession } from '../pomodoro/entities/pomodoro-session.entity';
import { InitialPomodoroSchema1788278400000 } from './migrations/1788278400000-initial-pomodoro-schema';
import { CleanupLegacyUniqueIndexes1788451200000 } from './migrations/1788451200000-cleanup-legacy-unique-indexes';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'pomodoro',
  entities: [User, PomodoroTask, PomodoroProfile, PomodoroSession],
  migrations: [
    InitialPomodoroSchema1788278400000,
    CleanupLegacyUniqueIndexes1788451200000,
  ],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
});
