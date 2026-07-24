import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GoalsModule } from '../goal/goals.module';
import { MealEntry } from '../meal/meal-entry.entity';
import { ProfileModule } from '../profile/profile.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MealEntry]),
    AuthModule,
    ProfileModule,
    GoalsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
