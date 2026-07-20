import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { createWeightRequestSchema } from '@foodnote/shared';
import type { CreateWeightRequest, WeightEntryResponse } from '@foodnote/shared';
import type { Response } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { WeightsService } from './weights.service';

@Controller('weights')
@UseGuards(JwtAuthGuard)
export class WeightsController {
  constructor(private readonly weights: WeightsService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createWeightRequestSchema))
    body: CreateWeightRequest,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WeightEntryResponse> {
    const { entry, created } = await this.weights.upsertToday(
      req.user.id,
      body,
    );
    res.status(created ? 201 : 200);
    return {
      id: entry.id,
      weightKg: entry.weightKg,
      recordedAt: entry.recordedAt.toISOString(),
    };
  }
}
