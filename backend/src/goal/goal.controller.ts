import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { createGoalRequestSchema } from '@foodnote/shared';
import type { CreateGoalRequest, GoalResponse } from '@foodnote/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { GoalService } from './goal.service';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalController {
  constructor(private readonly goals: GoalService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createGoalRequestSchema))
    body: CreateGoalRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<GoalResponse> {
    return this.goals.create(req.user.id, body);
  }

  @Get('current')
  async current(@Req() req: AuthenticatedRequest): Promise<GoalResponse> {
    return this.goals.getCurrent(req.user.id);
  }
}
