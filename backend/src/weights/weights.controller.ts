import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  createWeightRequestSchema,
  listWeightsQuerySchema,
  updateWeightRequestSchema,
} from '@foodnote/shared';
import type {
  CreateWeightRequest,
  ListWeightsQuery,
  UpdateWeightRequest,
  WeightEntryResponse,
} from '@foodnote/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { WeightsService } from './weights.service';
import type { WeightEntry } from '../weight/weight-entry.entity';

function toResponse(entry: WeightEntry): WeightEntryResponse {
  return {
    id: entry.id,
    weightKg: entry.weightKg,
    recordedAt: entry.recordedAt.toISOString(),
  };
}

@Controller('weights')
@UseGuards(JwtAuthGuard)
export class WeightsController {
  constructor(private readonly weights: WeightsService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createWeightRequestSchema))
    body: CreateWeightRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<WeightEntryResponse> {
    const entry = await this.weights.create(req.user.id, body);
    return toResponse(entry);
  }

  @Get()
  async list(
    @Query(new ZodValidationPipe(listWeightsQuerySchema))
    query: ListWeightsQuery,
    @Req() req: AuthenticatedRequest,
  ): Promise<WeightEntryResponse[]> {
    const entries = await this.weights.list(req.user.id, query.from, query.to);
    return entries.map(toResponse);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWeightRequestSchema))
    body: UpdateWeightRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<WeightEntryResponse> {
    const entry = await this.weights.update(req.user.id, id, body);
    return toResponse(entry);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.weights.remove(req.user.id, id);
  }
}
