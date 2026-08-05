import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  createSavedMealRequestSchema,
  updateSavedMealRequestSchema,
} from '@foodnote/shared';
import type {
  CreateSavedMealRequest,
  SavedMealResponse,
  UpdateSavedMealRequest,
} from '@foodnote/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { toMealFields } from '../meal/meal-mapping';
import type { SavedMeal } from '../saved-meal/saved-meal.entity';
import { SavedMealsService } from './saved-meals.service';

// A Saved Meal is a MealResponse without its occasion, so the shared mapping is
// the whole of it — nothing here to compose on top (meal-mapping.ts).
function toResponse(saved: SavedMeal): SavedMealResponse {
  return toMealFields(saved);
}

/**
 * Saved Meals — meals the user keeps by name to log again.
 *
 * These endpoints never touch `meal_entries`, and logging never comes back
 * here: a Saved Meal is copied into a Meal Entry by the client posting to
 * `/meals`, so the two records have no link (ADR-0014).
 */
@Controller('saved-meals')
@UseGuards(JwtAuthGuard)
export class SavedMealsController {
  constructor(private readonly savedMeals: SavedMealsService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createSavedMealRequestSchema))
    body: CreateSavedMealRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<SavedMealResponse> {
    const saved = await this.savedMeals.create(req.user.id, body);
    return toResponse(saved);
  }

  @Get()
  async list(@Req() req: AuthenticatedRequest): Promise<SavedMealResponse[]> {
    const saved = await this.savedMeals.list(req.user.id);
    return saved.map(toResponse);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSavedMealRequestSchema))
    body: UpdateSavedMealRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<SavedMealResponse> {
    const saved = await this.savedMeals.update(req.user.id, id, body);
    return toResponse(saved);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.savedMeals.remove(req.user.id, id);
  }
}
