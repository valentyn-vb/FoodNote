import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import OpenAI from 'openai';
import { AuthModule } from '../auth/auth.module';
import { PerUserThrottlerGuard } from '../common/per-user-throttler.guard';
import { MealEntry } from '../meal/meal-entry.entity';
import { MealItem } from '../meal/meal-item.entity';
import { MealParser } from './meal-parser';
import { MealsController } from './meals.controller';
import { MealsService } from './meals.service';
import { OpenAiMealParser } from './openai-meal-parser';

/**
 * The SDK's defaults are wrong for a request a user is waiting on: a 10-minute
 * timeout would pin the connection open, and worst-case wall time is
 * (1 + maxRetries) x timeout. One retry still covers a genuine blip.
 */
const OPENAI_TIMEOUT_MS = 15_000;
const OPENAI_MAX_RETRIES = 1;

@Module({
  imports: [TypeOrmModule.forFeature([MealEntry, MealItem]), AuthModule],
  controllers: [MealsController],
  providers: [
    MealsService,
    PerUserThrottlerGuard,
    {
      // Constructed here rather than injected as a client, so the OpenAI SDK
      // appears in exactly one wiring site and one adapter.
      provide: MealParser,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new OpenAiMealParser(
          new OpenAI({
            // getOrThrow: a missing key is a deploy misconfiguration, and a boot
            // crash is louder than 502ing every parse until someone notices.
            apiKey: config.getOrThrow<string>('OPENAI_API_KEY'),
            timeout: OPENAI_TIMEOUT_MS,
            maxRetries: OPENAI_MAX_RETRIES,
          }),
        ),
    },
  ],
})
export class MealsModule {}
