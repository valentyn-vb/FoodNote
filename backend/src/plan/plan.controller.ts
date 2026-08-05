import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { createPlanRequestSchema } from '@foodnote/shared';
import type { CreatePlanRequest, GoalResponse } from '@foodnote/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PlanService } from './plan.service';

@Controller('plan')
@UseGuards(JwtAuthGuard)
export class PlanController {
  constructor(private readonly plan: PlanService) {}

  // Returns the goal, not a PlanResponse: `GET /goals/current` returning
  // something *is* the definition of "onboarded", so the goal is precisely the
  // fact the caller's next question asks about.
  @Post()
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(createPlanRequestSchema))
    body: CreatePlanRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<GoalResponse> {
    return this.plan.create(req.user.id, body);
  }
}
