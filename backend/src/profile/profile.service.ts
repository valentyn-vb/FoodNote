import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { calorieTargetForPace, hasReachedTarget, tdee } from '@foodnote/shared';
import type {
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
    // A merge onto the existing row, not a fresh entity: PUT replaces the
    // onboarding facts and its payload deliberately carries nothing else (ADR
    // 0014), so anything the request never mentions — the appearance today, the
    // next preference tomorrow — has to survive it. `create()` + `save()` would
    // blank every unlisted column instead, one silent reset per field.
    const profile = this.profiles.merge(
      (await this.find(userId)) ?? this.profiles.create({ userId }),
      data,
    );
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
        // A reached goal must never prescribe a surplus. Past a loss target the
        // stored target sits *above* the current weight, which calorieTargetForPace
        // reads as a gain plan — so it would tell someone who overshot to eat
        // more. Feeding the current weight as the target makes it return plain
        // maintenance instead, which is what a met goal deserves.
        const reached = hasReachedTarget({
          startWeightKg: goal.startWeightKg,
          targetWeightKg: goal.targetWeightKg,
          preferredWeeklyChangeKg: goal.preferredWeeklyChangeKg,
          currentWeightKg,
        });
        calorieTarget = calorieTargetForPace(
          {
            age: profile.age,
            sex: profile.sex,
            heightCm: profile.heightCm,
            activityLevel: profile.activityLevel,
            currentWeightKg,
            targetWeightKg: reached ? currentWeightKg : goal.targetWeightKg,
          },
          goal.preferredWeeklyChangeKg,
        );
      }
    }

    return {
      age: profile.age,
      sex: profile.sex,
      heightCm: profile.heightCm,
      activityLevel: profile.activityLevel,
      appearance: profile.appearance,
      currentWeightKg,
      maintenanceCalories,
      calorieTarget,
      targetWeightKg: goal ? goal.targetWeightKg : null,
      preferredWeeklyChangeKg: goal ? goal.preferredWeeklyChangeKg : null,
    };
  }
}
