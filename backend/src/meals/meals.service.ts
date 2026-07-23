import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  EntityManager,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import type { CreateMealRequest, UpdateMealRequest } from '@foodnote/shared';
import { MealEntry } from '../meal/meal-entry.entity';
import { MealItem } from '../meal/meal-item.entity';

@Injectable()
export class MealsService {
  constructor(
    @InjectRepository(MealEntry)
    private readonly meals: Repository<MealEntry>,
    private readonly dataSource: DataSource,
  ) {}

  // The entry and its items are written together: totals are the source of
  // truth, items an optional breakdown the server never reconciles. One
  // transaction so a failure never leaves a meal with a half-written list.
  async create(userId: string, data: CreateMealRequest): Promise<MealEntry> {
    return this.dataSource.transaction(async (manager) => {
      const meal = manager.create(MealEntry, {
        userId,
        mealName: data.mealName,
        mealType: data.mealType,
        recordedAt: new Date(data.recordedAt),
        totalCalories: data.totalCalories,
        proteinGrams: data.proteinGrams,
        carbsGrams: data.carbsGrams,
        fatGrams: data.fatGrams,
        source: data.source,
      });
      const saved = await manager.save(meal);
      saved.items = await this.replaceItems(
        manager,
        saved.id,
        data.items ?? [],
      );
      return saved;
    });
  }

  async list(userId: string, from?: string, to?: string): Promise<MealEntry[]> {
    // `from`/`to` are UTC calendar days (YYYY-MM-DD); widen to the day's
    // start/end so the bound is inclusive of the whole day, not just 00:00.
    const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : undefined;
    const recordedAt =
      fromDate && toDate
        ? Between(fromDate, toDate)
        : fromDate
          ? MoreThanOrEqual(fromDate)
          : toDate
            ? LessThanOrEqual(toDate)
            : undefined;

    return this.meals.find({
      where: { userId, ...(recordedAt && { recordedAt }) },
      relations: { items: true },
      order: { recordedAt: 'ASC' },
    });
  }

  async update(
    userId: string,
    id: string,
    patch: UpdateMealRequest,
  ): Promise<MealEntry> {
    return this.dataSource.transaction(async (manager) => {
      // Scope the lookup by (id, userId) together, not id-then-check-owner —
      // a wrong-owner id and a nonexistent id must be indistinguishable 404s.
      const meal = await manager.findOne(MealEntry, {
        where: { id, userId },
        relations: { items: true },
      });
      if (!meal) throw new NotFoundException('Meal not found');

      if (patch.mealName !== undefined) meal.mealName = patch.mealName;
      if (patch.mealType !== undefined) meal.mealType = patch.mealType;
      if (patch.recordedAt !== undefined) {
        meal.recordedAt = new Date(patch.recordedAt);
      }
      if (patch.totalCalories !== undefined) {
        meal.totalCalories = patch.totalCalories;
      }
      if (patch.proteinGrams !== undefined) {
        meal.proteinGrams = patch.proteinGrams;
      }
      if (patch.carbsGrams !== undefined) meal.carbsGrams = patch.carbsGrams;
      if (patch.fatGrams !== undefined) meal.fatGrams = patch.fatGrams;
      if (patch.source !== undefined) meal.source = patch.source;
      await manager.save(meal);

      // Presence is the switch: omitted leaves items untouched; any array
      // (including []) replaces the whole list — there are no per-item edits.
      if (patch.items !== undefined) {
        meal.items = await this.replaceItems(manager, meal.id, patch.items);
      }
      return meal;
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    // Item rows cascade via the FK's ON DELETE CASCADE.
    const result = await this.meals.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Meal not found');
  }

  // Delete-then-insert the full item list for a meal. Returns the persisted
  // rows in the order given so the caller can echo them back.
  private async replaceItems(
    manager: EntityManager,
    mealEntryId: string,
    items: NonNullable<CreateMealRequest['items']>,
  ): Promise<MealItem[]> {
    await manager.delete(MealItem, { mealEntryId });
    if (items.length === 0) return [];
    const rows = items.map((item) =>
      manager.create(MealItem, { mealEntryId, ...item }),
    );
    return manager.save(rows);
  }
}
