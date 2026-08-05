import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { SavedMeal } from '../saved-meal/saved-meal.entity';
import { SavedMealItem } from '../saved-meal/saved-meal-item.entity';
import { SavedMealsController } from './saved-meals.controller';
import { SavedMealsService } from './saved-meals.service';

/**
 * Its own module, not a second controller inside MealsModule: nothing here
 * needs the meal parser or its OpenAI wiring, and a Saved Meal is a separate
 * aggregate that happens to share a column shape (ADR-0014).
 */
@Module({
  imports: [TypeOrmModule.forFeature([SavedMeal, SavedMealItem]), AuthModule],
  controllers: [SavedMealsController],
  providers: [SavedMealsService],
  // Exported so the seed can build templates through the real service.
  exports: [SavedMealsService],
})
export class SavedMealsModule {}
