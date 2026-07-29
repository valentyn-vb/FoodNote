import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hasReachedTarget, projectedDate } from '@foodnote/shared';
import type {
  CreateGoalRequest,
  GoalResponse,
  Pace,
  UpdateGoalRequest,
} from '@foodnote/shared';
import { WeightsService } from '../weights/weights.service';
import { Goal } from './goal.entity';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal)
    private readonly goals: Repository<Goal>,
    private readonly weights: WeightsService,
  ) {}

  getActiveGoal(userId: string): Promise<Goal | null> {
    return this.goals.findOne({ where: { userId, status: 'active' } });
  }

  // Today as a UTC 'YYYY-MM-DD' string — same rule the rest of the contract uses.
  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  // Fetch Current Weight and assemble the response — the read-shape the
  // controller returns for every goal endpoint.
  private async buildResponse(goal: Goal): Promise<GoalResponse> {
    const latest = await this.weights.getLatestForUser(goal.userId);
    return this.toResponse(goal, latest ? latest.weightKg : null);
  }

  async createResponse(
    userId: string,
    data: CreateGoalRequest,
  ): Promise<GoalResponse> {
    return this.buildResponse(await this.create(userId, data));
  }

  async getCurrentResponse(userId: string): Promise<GoalResponse | null> {
    const goal = await this.getActiveGoal(userId);
    return goal ? this.buildResponse(goal) : null;
  }

  async updateResponse(
    userId: string,
    data: UpdateGoalRequest,
  ): Promise<GoalResponse | null> {
    const goal = await this.update(userId, data);
    return goal ? this.buildResponse(goal) : null;
  }

  private toResponse(goal: Goal, currentWeightKg: number | null): GoalResponse {
    const pace = goal.preferredWeeklyChangeKg as Pace;
    // With an empty weight journal there is nothing to compare against, so
    // neither the projection nor the reached test can say anything.
    const reachedTarget =
      currentWeightKg !== null &&
      hasReachedTarget({
        startWeightKg: goal.startWeightKg,
        targetWeightKg: goal.targetWeightKg,
        preferredWeeklyChangeKg: pace,
        currentWeightKg,
      });

    return {
      id: goal.id,
      startWeightKg: goal.startWeightKg,
      targetWeightKg: goal.targetWeightKg,
      preferredWeeklyChangeKg: pace,
      startDate: goal.startDate,
      // A reached goal projects nothing. projectedDate takes a magnitude, so
      // past the target it would otherwise return a date for a weight the user
      // has already gone by; pace 0 (maintenance) it rules out itself.
      projectedGoalDate:
        currentWeightKg === null || reachedTarget
          ? null
          : projectedDate(
              Math.abs(currentWeightKg - goal.targetWeightKg),
              pace,
              this.today(),
            ),
      reachedTarget,
      status: goal.status,
    };
  }

  async create(userId: string, data: CreateGoalRequest): Promise<Goal> {
    const latest = await this.weights.getLatestForUser(userId);
    if (!latest) {
      throw new BadRequestException(
        'Log a weight entry before creating a goal',
      );
    }
    // Replace the previous active goal and insert the new one atomically.
    // The partial unique index (ADR-0003) is the backstop.
    return this.goals.manager.transaction(async (manager) => {
      // The outgoing goal is `completed` only if its target was actually met;
      // otherwise the user abandoned it, which is `replaced`. This is the only
      // place the status is ever set to `completed` — reaching a target must not
      // touch it, or GET /goals/current would 404 and the OnboardingGuard would
      // bounce the user into the wizard (see docs/adr/0007).
      const previous = await manager.findOne(Goal, {
        where: { userId, status: 'active' },
      });
      if (previous) {
        previous.status = hasReachedTarget({
          startWeightKg: previous.startWeightKg,
          targetWeightKg: previous.targetWeightKg,
          preferredWeeklyChangeKg: previous.preferredWeeklyChangeKg as Pace,
          currentWeightKg: latest.weightKg,
        })
          ? 'completed'
          : 'replaced';
        await manager.save(previous);
      }
      const goal = manager.create(Goal, {
        userId,
        startWeightKg: latest.weightKg,
        targetWeightKg: data.targetWeightKg,
        preferredWeeklyChangeKg: data.preferredWeeklyChangeKg,
        startDate: this.today(),
        status: 'active',
      });
      return manager.save(goal);
    });
  }

  async update(userId: string, data: UpdateGoalRequest): Promise<Goal | null> {
    const goal = await this.getActiveGoal(userId);
    if (!goal) return null;
    if (data.targetWeightKg !== undefined) {
      goal.targetWeightKg = data.targetWeightKg;
    }
    if (data.preferredWeeklyChangeKg !== undefined) {
      goal.preferredWeeklyChangeKg = data.preferredWeeklyChangeKg;
    }
    return this.goals.save(goal);
  }
}
