import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { calorieTargetForPace, tdee } from '@foodnote/shared';
import type {
  Pace,
  PatchProfileRequest,
  ProfileResponse,
  PutProfileRequest,
} from '@foodnote/shared';
import { GoalsService } from '../goal/goals.service';
import { WeightsService } from '../weights/weights.service';
import { UserProfile } from './user-profile.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profiles: Repository<UserProfile>,
    private readonly weights: WeightsService,
    private readonly goals: GoalsService,
  ) {}

  private find(userId: string): Promise<UserProfile | null> {
    return this.profiles.findOne({ where: { userId } });
  }

  async put(userId: string, data: PutProfileRequest): Promise<ProfileResponse> {
    const profile = this.profiles.create({ userId, ...data });
    await this.profiles.save(profile); // create-or-replace: PK is userId
    return this.buildResponse(userId, profile);
  }

  async patch(
    userId: string,
    data: PatchProfileRequest,
  ): Promise<ProfileResponse> {
    const profile = await this.find(userId);
    if (!profile) throw new NotFoundException('Profile not found');
    Object.assign(profile, data);
    await this.profiles.save(profile);
    return this.buildResponse(userId, profile);
  }

  async get(userId: string): Promise<ProfileResponse> {
    const profile = await this.find(userId);
    if (!profile) throw new NotFoundException('Profile not found');
    return this.buildResponse(userId, profile);
  }

  // Recompute the derived, never-stored fields on every read.
  private async buildResponse(
    userId: string,
    profile: UserProfile,
  ): Promise<ProfileResponse> {
    const latest = await this.weights.getLatestForUser(userId);
    const currentWeightKg = latest ? latest.weightKg : null;
    const goal = await this.goals.getActiveGoal(userId);

    let maintenanceCalories: number | null = null;
    let calorieTarget: number | null = null;

    if (currentWeightKg !== null) {
      maintenanceCalories = Math.round(
        tdee(
          {
            age: profile.age,
            sex: profile.sex,
            heightCm: profile.heightCm,
            weightKg: currentWeightKg,
          },
          profile.activityLevel,
        ),
      );
      if (goal) {
        calorieTarget = calorieTargetForPace(
          {
            age: profile.age,
            sex: profile.sex,
            heightCm: profile.heightCm,
            activityLevel: profile.activityLevel,
            currentWeightKg,
            targetWeightKg: goal.targetWeightKg,
          },
          goal.preferredWeeklyChangeKg as Pace,
        );
      }
    }

    return {
      age: profile.age,
      sex: profile.sex,
      heightCm: profile.heightCm,
      activityLevel: profile.activityLevel,
      currentWeightKg,
      maintenanceCalories,
      calorieTarget,
    };
  }
}
