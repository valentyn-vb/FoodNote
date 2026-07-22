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
import { GoalsService } from './goals.service';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Post()
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(createGoalRequestSchema))
    body: CreateGoalRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<GoalResponse> {
    return this.goals.createResponse(req.user.id, body);
  }

  @Get('current')
  async current(@Req() req: AuthenticatedRequest): Promise<GoalResponse> {
    const response = await this.goals.getCurrentResponse(req.user.id);
    if (!response) throw new NotFoundException('No active goal');
    return response;
  }

  @Patch('current')
  async update(
    @Body(new ZodValidationPipe(updateGoalRequestSchema))
    body: UpdateGoalRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<GoalResponse> {
    const response = await this.goals.updateResponse(req.user.id, body);
    if (!response) throw new NotFoundException('No active goal');
    return response;
  }
}
