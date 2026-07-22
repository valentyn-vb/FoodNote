import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { projectedDate } from '@foodnote/shared';
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

  toResponse(goal: Goal, currentWeightKg: number | null): GoalResponse {
    const remainingKg =
      currentWeightKg === null
        ? 0
        : Math.abs(currentWeightKg - goal.targetWeightKg);
    return {
      id: goal.id,
      startWeightKg: goal.startWeightKg,
      targetWeightKg: goal.targetWeightKg,
      preferredWeeklyChangeKg: goal.preferredWeeklyChangeKg as Pace,
      startDate: goal.startDate,
      projectedGoalDate:
        currentWeightKg === null
          ? null
          : projectedDate(
              remainingKg,
              goal.preferredWeeklyChangeKg,
              this.today(),
            ),
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
      await manager.update(
        Goal,
        { userId, status: 'active' },
        { status: 'replaced' },
      );
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
