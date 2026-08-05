import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { CreatePlanRequest, GoalResponse } from '@foodnote/shared';
import { GoalsService } from '../goal/goals.service';
import { ProfileService } from '../profile/profile.service';
import { WeightsService } from '../weights/weights.service';

/**
 * The Plan: a Profile, a first Weight Entry and a Goal written together.
 *
 * It owns the transaction only. The three writes go through the services that
 * already own those tables — `GoalsService.create` in particular, because its
 * `completed` / `replaced` choice is the only place a goal status is ever set
 * (ADR-0007) and a second copy of that rule would drift from the first.
 */
@Injectable()
export class PlanService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly profiles: ProfileService,
    private readonly weights: WeightsService,
    private readonly goals: GoalsService,
  ) {}

  async create(userId: string, data: CreatePlanRequest): Promise<GoalResponse> {
    // 409 rather than a replacement: this is the same story `requireNotOnboarded()`
    // tells at the routing layer, and it has to be told here too because a Server
    // Action is a public POST endpoint (see docs/adr/0016).
    if (await this.goals.getActiveGoal(userId)) {
      throw new ConflictException('A plan already exists');
    }

    const goal = await this.dataSource.transaction(async (manager) => {
      // The weight goes first: the goal's startWeightKg is read back from the
      // journal, so there has to be an entry by the time the goal is written.
      // The server stamps the moment, never the client — the entry it picks
      // decides where the goal starts.
      await this.weights.create(
        userId,
        {
          weightKg: data.currentWeightKg,
          recordedAt: new Date().toISOString(),
        },
        manager,
      );

      await this.profiles.putEntity(
        userId,
        {
          age: data.age,
          sex: data.sex,
          heightCm: data.heightCm,
          activityLevel: data.activityLevel,
        },
        manager,
      );

      return this.goals.create(
        userId,
        {
          targetWeightKg: data.targetWeightKg,
          preferredWeeklyChangeKg: data.preferredWeeklyChangeKg,
        },
        manager,
      );
    });

    // After the commit, so the derived fields read a whole plan.
    return this.goals.buildResponse(goal);
  }
}
