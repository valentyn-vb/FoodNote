import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  createGoalRequestSchema,
  updateGoalRequestSchema,
} from '@foodnote/shared';
import type {
  CreateGoalRequest,
  GoalResponse,
  UpdateGoalRequest,
} from '@foodnote/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { WeightsService } from '../weights/weights.service';
import { GoalsService } from './goals.service';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(
    private readonly goals: GoalsService,
    private readonly weights: WeightsService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(
    @Body(new ZodValidationPipe(createGoalRequestSchema))
    body: CreateGoalRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<GoalResponse> {
    const goal = await this.goals.create(req.user.id, body);
    const latest = await this.weights.getLatestForUser(req.user.id);
    return this.goals.toResponse(goal, latest ? latest.weightKg : null);
  }

  @Get('current')
  async current(@Req() req: AuthenticatedRequest): Promise<GoalResponse> {
    const goal = await this.goals.getActiveGoal(req.user.id);
    if (!goal) throw new NotFoundException('No active goal');
    const latest = await this.weights.getLatestForUser(req.user.id);
    return this.goals.toResponse(goal, latest ? latest.weightKg : null);
  }

  @Patch('current')
  async update(
    @Body(new ZodValidationPipe(updateGoalRequestSchema))
    body: UpdateGoalRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<GoalResponse> {
    const goal = await this.goals.update(req.user.id, body);
    if (!goal) throw new NotFoundException('No active goal');
    const latest = await this.weights.getLatestForUser(req.user.id);
    return this.goals.toResponse(goal, latest ? latest.weightKg : null);
  }
}
