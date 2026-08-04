import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  GLOBAL_THROTTLE,
  TOO_MANY_REQUESTS_MESSAGE,
} from './common/throttle.constants';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { buildDataSourceOptions } from './database/data-source';
import { GoalsModule } from './goal/goals.module';
import { MealsModule } from './meals/meals.module';
import { ProfileModule } from './profile/profile.module';
import { SavedMealsModule } from './saved-meals/saved-meals.module';
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
    // One unnamed ('default') throttler: routes tighten it with @Throttle
    // rather than opting into named ones, so every route is checked against
    // exactly one limit. Tracking is per client IP via req.ip, which is only
    // correct once 'trust proxy' is set (common/trust-proxy.ts).
    //
    // Storage is the built-in in-memory store: counters are per process and
    // reset on deploy. Correct for the single Render instance we run — if the
    // service is ever scaled to N instances the effective limit becomes N× this
    // one, and it would need a shared store (Redis) instead.
    ThrottlerModule.forRoot({
      throttlers: [GLOBAL_THROTTLE],
      errorMessage: TOO_MANY_REQUESTS_MESSAGE,
    }),
    AuthModule,
    UserModule,
    WeightsModule,
    GoalsModule,
    ProfileModule,
    DashboardModule,
    MealsModule,
    SavedMealsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global, so every endpoint has a floor and not just the ones #37 names.
    //
    // Bound in two steps on purpose: `{ provide: APP_GUARD, useClass }` makes
    // Nest instantiate the guard anonymously under the APP_GUARD token, where
    // neither overrideGuard() nor overrideProvider() can reach it. Registering
    // the class as a normal provider and aliasing APP_GUARD to it keeps runtime
    // behaviour identical while letting e2e specs swap the guard out.
    ThrottlerGuard,
    { provide: APP_GUARD, useExisting: ThrottlerGuard },
  ],
})
export class AppModule {}
