import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  projectedDate,
  type CreateGoalRequest,
  type GoalResponse,
  type Pace,
} from '@foodnote/shared';
import { WeightEntry } from '../weight/weight-entry.entity';
import { Goal } from './goal.entity';

@Injectable()
export class GoalService {
  constructor(
    @InjectRepository(Goal)
    private readonly goals: Repository<Goal>,
    @InjectRepository(WeightEntry)
    private readonly weights: Repository<WeightEntry>,
  ) {}

  /**
   * Create a new active goal, replacing any prior active one. startWeightKg and
   * startDate are server-set and immutable: the start weight is snapshotted from
   * the latest journal entry (the client never supplies it), so a weight must
   * already be logged — during onboarding POST /weights precedes POST /goals.
   */
  async create(userId: string, data: CreateGoalRequest): Promise<GoalResponse> {
    const startWeightKg = await this.latestWeightKg(userId);
    if (startWeightKg === null) {
      throw new BadRequestException('Log a weight before creating a goal');
    }

    await this.goals.update(
      { userId, status: 'active' },
      { status: 'replaced' },
    );

    const goal = await this.goals.save(
      this.goals.create({
        userId,
        startWeightKg,
        targetWeightKg: data.targetWeightKg,
        preferredWeeklyChangeKg: data.preferredWeeklyChangeKg,
        startDate: new Date().toISOString().slice(0, 10),
        status: 'active',
      }),
    );

    return this.buildResponse(goal, startWeightKg);
  }

  /** The active goal, or 404 — the contract's "onboarding not complete" signal. */
  async getCurrent(userId: string): Promise<GoalResponse> {
    const goal = await this.goals.findOne({
      where: { userId, status: 'active' },
    });
    if (!goal) {
      throw new NotFoundException('No active goal');
    }
    const currentWeightKg = await this.latestWeightKg(userId);
    return this.buildResponse(goal, currentWeightKg ?? goal.startWeightKg);
  }

  private async latestWeightKg(userId: string): Promise<number | null> {
    const latest = await this.weights.findOne({
      where: { userId },
      order: { recordedAt: 'DESC' },
    });
    return latest?.weightKg ?? null;
  }

  /**
   * projectedGoalDate is derived on read: current weight's remaining distance to
   * the target ÷ pace (null once the target is reached).
   */
  private buildResponse(goal: Goal, currentWeightKg: number): GoalResponse {
    const remainingKg = Math.abs(currentWeightKg - goal.targetWeightKg);
    return {
      id: goal.id,
      startWeightKg: goal.startWeightKg,
      targetWeightKg: goal.targetWeightKg,
      preferredWeeklyChangeKg: goal.preferredWeeklyChangeKg as Pace,
      startDate: goal.startDate,
      projectedGoalDate: projectedDate(
        remainingKg,
        goal.preferredWeeklyChangeKg,
        new Date().toISOString().slice(0, 10),
      ),
      status: goal.status,
    };
  }
}
