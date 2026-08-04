import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import type { CreateSavedMealRequest } from '@foodnote/shared';
import { toItemColumns, toMealColumns } from '../meal/meal-mapping';
import { SavedMeal } from '../saved-meal/saved-meal.entity';
import { SavedMealItem } from '../saved-meal/saved-meal-item.entity';

@Injectable()
export class SavedMealsService {
  constructor(
    @InjectRepository(SavedMeal)
    private readonly savedMeals: Repository<SavedMeal>,
    private readonly dataSource: DataSource,
  ) {}

  // The row and its items are written together, as MealsService does: one
  // transaction so a failure never leaves a template with a half-written list.
  async create(
    userId: string,
    data: CreateSavedMealRequest,
  ): Promise<SavedMeal> {
    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(
        manager.create(SavedMeal, { userId, ...toMealColumns(data) }),
      );
      saved.items = await this.replaceItems(
        manager,
        saved.id,
        data.items ?? [],
      );
      return saved;
    });
  }

  /**
   * Every template the user owns, by name. Not by recency: the list sits under
   * a search field, where a stable order beats a moving one — and a
   * most-recently-used order would mean a write on every log.
   */
  async list(userId: string): Promise<SavedMeal[]> {
    return this.savedMeals.find({
      where: { userId },
      relations: { items: true },
      order: { mealName: 'ASC' },
    });
  }

  // Delete-then-insert the whole list, as MealsService does: there are no
  // per-item endpoints, so a list is only ever replaced entire. Returns the
  // rows in the order given so the caller can echo them back.
  private async replaceItems(
    manager: EntityManager,
    savedMealId: string,
    items: NonNullable<CreateSavedMealRequest['items']>,
  ): Promise<SavedMealItem[]> {
    await manager.delete(SavedMealItem, { savedMealId });
    if (items.length === 0) return [];
    return manager.save(
      items.map((item) =>
        manager.create(SavedMealItem, { savedMealId, ...toItemColumns(item) }),
      ),
    );
  }
}
