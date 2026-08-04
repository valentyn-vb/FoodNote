import {
  BadGatewayException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  aiParseRequestSchema,
  createMealRequestSchema,
  listMealsQuerySchema,
  updateMealRequestSchema,
} from '@foodnote/shared';
import type {
  AiParseRequest,
  AiParseResponse,
  CreateMealRequest,
  ListMealsQuery,
  MealResponse,
  UpdateMealRequest,
} from '@foodnote/shared';
import { PerUserThrottlerGuard } from '../common/per-user-throttler.guard';
import { AI_PARSE_THROTTLE } from '../common/throttle.constants';
import { MealParseFailedError, MealParser } from './meal-parser';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import type { MealEntry } from '../meal/meal-entry.entity';
import { toMealFields } from '../meal/meal-mapping';
import { MealsService } from './meals.service';

// Totals are the source of truth; items are echoed back as an array (empty
// for a manual entry with no breakdown), never summed by the server. Everything
// but the occasion is shared with the saved-meals endpoint (meal-mapping.ts).
function toResponse(meal: MealEntry): MealResponse {
  return {
    ...toMealFields(meal),
    mealType: meal.mealType,
    recordedAt: meal.recordedAt.toISOString(),
  };
}

@Controller('meals')
@UseGuards(JwtAuthGuard)
export class MealsController {
  constructor(
    private readonly meals: MealsService,
    private readonly parser: MealParser,
  ) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createMealRequestSchema))
    body: CreateMealRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<MealResponse> {
    const meal = await this.meals.create(req.user.id, body);
    return toResponse(meal);
  }

  /**
   * An AI Parse: description in, Parsed Meal or "not food" out. Stores nothing —
   * the client confirms a Parsed Meal through POST /meals with `source: 'ai'`.
   *
   * Guard order matters: JwtAuthGuard is class-scoped so it runs first and
   * populates req.user, which PerUserThrottlerGuard needs as its tracker.
   */
  @Post('ai-parse')
  // 200, not Nest's default 201 for POST: a parse creates nothing. The contract
  // documents 200 for both outcomes (CONTRACT.md).
  @HttpCode(200)
  @UseGuards(PerUserThrottlerGuard)
  @Throttle({ default: AI_PARSE_THROTTLE })
  async aiParse(
    @Body(new ZodValidationPipe(aiParseRequestSchema))
    body: AiParseRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<AiParseResponse> {
    try {
      return await this.parser.parse(body.description, req.user.id);
    } catch (error) {
      // "Not food" already came back as a 200; reaching here means the provider
      // failed or returned output the contract rejects (ADR-0006).
      if (error instanceof MealParseFailedError) {
        throw new BadGatewayException(
          'Could not read that meal right now. Please try again.',
        );
      }
      throw error;
    }
  }

  @Get()
  async list(
    @Query(new ZodValidationPipe(listMealsQuerySchema))
    query: ListMealsQuery,
    @Req() req: AuthenticatedRequest,
  ): Promise<MealResponse[]> {
    const meals = await this.meals.list(req.user.id, query.from, query.to);
    return meals.map(toResponse);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateMealRequestSchema))
    body: UpdateMealRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<MealResponse> {
    const meal = await this.meals.update(req.user.id, id, body);
    return toResponse(meal);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.meals.remove(req.user.id, id);
  }
}
