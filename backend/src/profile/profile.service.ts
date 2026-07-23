import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  calorieTargetForPace,
  tdee,
  type Pace,
  type ProfileResponse,
  type PutProfileRequest,
} from '@foodnote/shared';
import { Goal } from '../goal/goal.entity';
import { WeightEntry } from '../weight/weight-entry.entity';
import { UserProfile } from './user-profile.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profiles: Repository<UserProfile>,
    @InjectRepository(WeightEntry)
    private readonly weights: Repository<WeightEntry>,
    @InjectRepository(Goal)
    private readonly goals: Repository<Goal>,
  ) {}

  /**
   * The stored profile, or 404 until it exists. The derived fields are
   * recomputed on read (CONTEXT.md): Current Weight from the latest journal
   * entry, maintenanceCalories from it, and calorieTarget from the active goal.
   */
  async getCurrent(userId: string): Promise<ProfileResponse> {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('No profile');
    }
    return this.buildResponse(userId, profile);
  }

  /**
   * Create-or-replace the profile (the onboarding entry point). Weight is never
   * written here — it lives in the journal (POST /weights) — so the derived
   * fields are recomputed from the journal on the way out, exactly as on a read.
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

    return this.buildResponse(userId, profile);
  }

  private async latestWeightKg(userId: string): Promise<number | null> {
    const latest = await this.weights.findOne({
      where: { userId },
      order: { recordedAt: 'DESC' },
    });
    return latest?.weightKg ?? null;
  }

  private activeGoal(userId: string): Promise<Goal | null> {
    return this.goals.findOne({ where: { userId, status: 'active' } });
  }

  /**
   * Assemble the response, recomputing the never-stored derived fields from the
   * journal. Null-tiered: no weight → all null; a weight but no active goal →
   * currentWeightKg + maintenanceCalories; with an active goal → all three.
   */
  private async buildResponse(
    userId: string,
    profile: UserProfile,
  ): Promise<ProfileResponse> {
    const currentWeightKg = await this.latestWeightKg(userId);
    const activeGoal =
      currentWeightKg === null ? null : await this.activeGoal(userId);

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
      if (activeGoal) {
        calorieTarget = calorieTargetForPace(
          {
            age: profile.age,
            sex: profile.sex,
            heightCm: profile.heightCm,
            activityLevel: profile.activityLevel,
            currentWeightKg,
            targetWeightKg: activeGoal.targetWeightKg,
          },
          activeGoal.preferredWeeklyChangeKg as Pace,
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
