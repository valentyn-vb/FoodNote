import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { WeightEntry } from '../weight/weight-entry.entity';
import { GoalController } from './goal.controller';
import { GoalService } from './goal.service';
import { Goal } from './goal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Goal, WeightEntry]), AuthModule],
  controllers: [GoalController],
  providers: [GoalService],
})
export class GoalModule {}
