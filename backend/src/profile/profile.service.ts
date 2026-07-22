import { Injectable, NotFoundException } from '@nestjs/common';
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
   * The stored profile, or 404 until it exists. currentWeightKg /
   * maintenanceCalories are null on reads: they need a weight, and this service
   * stays decoupled from the journal (maintenance is only computed on PUT, from
   * the weight the client passes). calorieTarget is always null — goal's concern.
   */
  async getCurrent(userId: string): Promise<ProfileResponse> {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('No profile');
    }
    return {
      age: profile.age,
      sex: profile.sex,
      heightCm: profile.heightCm,
      activityLevel: profile.activityLevel,
      currentWeightKg: null, // worse considering removing this fields from zod schema
      maintenanceCalories: null,
      calorieTarget: null,
    };
  }

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
