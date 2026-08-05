import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoalsModule } from '../goal/goals.module';
import { ProfileModule } from '../profile/profile.module';
import { WeightsModule } from '../weights/weights.module';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';

// No entity of its own: a Plan is written into three tables and stored under
// none of them.
@Module({
  imports: [AuthModule, ProfileModule, WeightsModule, GoalsModule],
  controllers: [PlanController],
  providers: [PlanService],
})
export class PlanModule {}
