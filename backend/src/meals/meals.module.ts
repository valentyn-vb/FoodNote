import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MealEntry } from '../meal/meal-entry.entity';
import { MealItem } from '../meal/meal-item.entity';
import { MealsController } from './meals.controller';
import { MealsService } from './meals.service';

@Module({
  imports: [TypeOrmModule.forFeature([MealEntry, MealItem]), AuthModule],
  controllers: [MealsController],
  providers: [MealsService],
})
export class MealsModule {}
