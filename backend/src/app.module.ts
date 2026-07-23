import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { buildDataSourceOptions } from './database/data-source';
import { GoalModule } from './goal/goal.module';
import { MealsModule } from './meals/meals.module';
import { ProfileModule } from './profile/profile.module';
import { UserModule } from './user/user.module';
import { WeightsModule } from './weights/weights.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildDataSourceOptions(config.getOrThrow<string>('DATABASE_URL'), {
          // Schema is managed by migrations (no synchronize). Apply pending
          // migrations on boot everywhere except production, so dev and e2e
          // run against an up-to-date schema without a manual step. Production
          // runs `migration:run` explicitly during deploy.
          migrationsRun: config.get<string>('NODE_ENV') !== 'production',
        }),
    }),
    AuthModule,
    UserModule,
    WeightsModule,
    ProfileModule,
    GoalModule,
    MealsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
