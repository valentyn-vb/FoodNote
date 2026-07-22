import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GoalsModule } from '../goal/goals.module';
import { WeightsModule } from '../weights/weights.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UserProfile } from './user-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserProfile]),
    AuthModule,
    WeightsModule,
    GoalsModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
