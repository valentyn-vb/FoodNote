import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  tdee,
  type ProfileResponse,
  type PutProfileRequest,
} from '@foodnote/shared';
import { UserProfile } from './user-profile.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profiles: Repository<UserProfile>,
  ) {}

  /**
   * Create-or-replace the profile (the onboarding entry point). currentWeightKg
   * arrives on the request purely to derive maintenanceCalories — it is not
   * persisted (the weight journal is weight's source of truth). calorieTarget
   * stays null: it depends on the active goal, so it's the goal's concern.
   */
  async upsert(
    userId: string,
    data: PutProfileRequest,
  ): Promise<ProfileResponse> {
    const existing = await this.profiles.findOne({ where: { userId } });
    const profile = this.profiles.create({
      ...(existing ?? {}),
      userId,
      age: data.age,
      sex: data.sex,
      heightCm: data.heightCm,
      activityLevel: data.activityLevel,
    });
    await this.profiles.save(profile);

    const maintenanceCalories = Math.round(
      tdee(
        {
          age: data.age,
          sex: data.sex,
          heightCm: data.heightCm,
          weightKg: data.currentWeightKg,
        },
        data.activityLevel,
      ),
    );

    return {
      age: profile.age,
      sex: profile.sex,
      heightCm: profile.heightCm,
      activityLevel: profile.activityLevel,
      currentWeightKg: data.currentWeightKg,
      maintenanceCalories,
      calorieTarget: null,
    };
  }
}
