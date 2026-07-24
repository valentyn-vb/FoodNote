import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import type { DashboardResponse } from '@foodnote/shared';
import { GoalsService } from '../goal/goals.service';
import { MealEntry } from '../meal/meal-entry.entity';
import { ProfileService } from '../profile/profile.service';

/**
 * Thin single-Tracking-Day read model (ADR-0005): composes the Profile and
 * Goals read paths so the dashboard tiles never drift from those pages, and
 * sums the day's meals itself. Chart series are NOT served here — the client
 * builds them from GET /weights and GET /meals.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly profile: ProfileService,
    private readonly goals: GoalsService,
    @InjectRepository(MealEntry)
    private readonly meals: Repository<MealEntry>,
  ) {}

  // Today as a UTC 'YYYY-MM-DD' string — same rule the rest of the contract uses.
  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async getDashboard(
    userId: string,
    date?: string,
  ): Promise<DashboardResponse> {
    // 404 until onboarding is complete. These two read paths are independent,
    // so run them concurrently. ProfileService.get rejects when there is no
    // profile — that rejection naturally takes precedence over the goal gate.
    const [profile, goal] = await Promise.all([
      this.profile.get(userId),
      this.goals.getCurrentResponse(userId),
    ]);
    if (!goal) throw new NotFoundException('No active goal');

    // currentWeightKg / the calorie fields are null only when the weight
    // journal is empty. Once a goal exists that means every entry was deleted
    // after the goal was created (POST /goals requires a weight), so the
    // dashboard is uncomputable — treat it as onboarding-incomplete.
    if (
      profile.currentWeightKg === null ||
      profile.maintenanceCalories === null ||
      profile.calorieTarget === null
    ) {
      throw new NotFoundException('No current weight');
    }

    // `date` scopes only the meal window (ADR-0005); weight, calories and the
    // goal block always reflect present state via the reused read paths above.
    const day = date ?? this.today();

    return {
      date: day,
      maintenanceCalories: profile.maintenanceCalories,
      calorieTarget: profile.calorieTarget,
      today: await this.sumForDay(userId, day),
      goal: {
        startWeightKg: goal.startWeightKg,
        currentWeightKg: profile.currentWeightKg,
        targetWeightKg: goal.targetWeightKg,
        projectedGoalDate: goal.projectedGoalDate,
      },
    };
  }

  // Sum a Tracking Day's meal entries into contract macro totals + a count.
  // Reads meal_entries directly until the Meals API (#32) exposes a canonical
  // aggregate to consolidate onto (ADR-0005).
  private async sumForDay(
    userId: string,
    date: string,
  ): Promise<DashboardResponse['today']> {
    // `date` is a UTC calendar day (YYYY-MM-DD); widen to the whole day so the
    // window is inclusive of every entry, matching WeightsService.list.
    const from = new Date(`${date}T00:00:00.000Z`);
    const to = new Date(`${date}T23:59:59.999Z`);
    const entries = await this.meals.find({
      where: { userId, recordedAt: Between(from, to) },
    });

    return entries.reduce(
      (totals, entry) => ({
        totalCalories: totals.totalCalories + entry.totalCalories,
        proteinGrams: totals.proteinGrams + entry.proteinGrams,
        carbsGrams: totals.carbsGrams + entry.carbsGrams,
        fatGrams: totals.fatGrams + entry.fatGrams,
        mealsLogged: totals.mealsLogged + 1,
      }),
      {
        totalCalories: 0,
        proteinGrams: 0,
        carbsGrams: 0,
        fatGrams: 0,
        mealsLogged: 0,
      },
    );
  }
}
