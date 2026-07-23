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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  createMealRequestSchema,
  listMealsQuerySchema,
  updateMealRequestSchema,
} from '@foodnote/shared';
import type {
  CreateMealRequest,
  ListMealsQuery,
  MealResponse,
  UpdateMealRequest,
} from '@foodnote/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import type { MealEntry } from '../meal/meal-entry.entity';
import { MealsService } from './meals.service';

// Totals are the source of truth; items are echoed back as an array (empty
// for a manual entry with no breakdown), never summed by the server.
function toResponse(meal: MealEntry): MealResponse {
  return {
    id: meal.id,
    mealName: meal.mealName,
    mealType: meal.mealType,
    recordedAt: meal.recordedAt.toISOString(),
    totalCalories: meal.totalCalories,
    proteinGrams: meal.proteinGrams,
    carbsGrams: meal.carbsGrams,
    fatGrams: meal.fatGrams,
    source: meal.source,
    items: (meal.items ?? []).map((item) => ({
      name: item.name,
      quantityDescription: item.quantityDescription,
      calories: item.calories,
      proteinGrams: item.proteinGrams,
      carbsGrams: item.carbsGrams,
      fatGrams: item.fatGrams,
    })),
  };
}

@Controller('meals')
@UseGuards(JwtAuthGuard)
export class MealsController {
  constructor(private readonly meals: MealsService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createMealRequestSchema))
    body: CreateMealRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<MealResponse> {
    const meal = await this.meals.create(req.user.id, body);
    return toResponse(meal);
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
