import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { createWeightRequestSchema } from '@foodnote/shared';
import type {
  CreateWeightRequest,
  WeightEntryResponse,
} from '@foodnote/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { WeightsService } from './weights.service';

@Controller('weights')
@UseGuards(JwtAuthGuard)
export class WeightsController {
  constructor(private readonly weights: WeightsService) {}

  @Post()
  @HttpCode(201)
  async create(
    @Body(new ZodValidationPipe(createWeightRequestSchema))
    body: CreateWeightRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<WeightEntryResponse> {
    const entry = await this.weights.create(req.user.id, body);
    return {
      id: entry.id,
      weightKg: entry.weightKg,
      recordedAt: entry.recordedAt.toISOString(),
    };
  }
}
