import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Goal } from '../goal/goal.entity';
import { WeightEntry } from '../weight/weight-entry.entity';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UserProfile } from './user-profile.entity';

@Module({
  imports: [
    // Goal + WeightEntry: read-only, to derive currentWeightKg / calorieTarget.
    TypeOrmModule.forFeature([UserProfile, WeightEntry, Goal]),
    AuthModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
