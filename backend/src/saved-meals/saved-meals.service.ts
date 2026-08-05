import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import type {
  CreateSavedMealRequest,
  UpdateSavedMealRequest,
} from '@foodnote/shared';
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

  /**
   * Corrects a template in place. The only way its figures ever change: logging
   * one copies it, so nothing in the meal flow reaches back here (ADR-0014), and
   * a correction applies to meals logged from here on — never to days already
   * counted.
   *
   * Presence is the switch on `items`, as on meals: omitted leaves the breakdown
   * alone, any array (including empty) replaces the whole list.
   */
  async update(
    userId: string,
    id: string,
    patch: UpdateSavedMealRequest,
  ): Promise<SavedMeal> {
    return this.dataSource.transaction(async (manager) => {
      // Scoped by (id, userId) together, so a wrong-owner id and a missing one
      // are indistinguishable 404s.
      const saved = await manager.findOne(SavedMeal, {
        where: { id, userId },
        relations: { items: true },
      });
      if (!saved) throw new NotFoundException('Saved meal not found');

      // Assigned onto the loaded entity rather than spread into a new object:
      // `{ ...saved, ...patch }` would be a plain object, and TypeORM needs the
      // instance it gave us. Zod's `.partial()` omits absent keys rather than
      // setting them undefined, so a present key always means "change this".
      //
      // `items` is the one field that can't be assigned — it is `per100g`
      // objects on the wire and four flat columns in the table. Unlike a meal,
      // nothing else here needs converting: a Saved Meal has no date and no meal
      // type, which is why MealsService.update still goes field by field.
      const { items, ...fields } = patch;
      Object.assign(saved, fields);
      await manager.save(saved);

      if (items !== undefined) {
        saved.items = await this.replaceItems(manager, saved.id, items);
      }
      return saved;
    });
  }

  /**
   * Drops a template. Item rows cascade via the FK; the meals logged from it are
   * untouched, because nothing links them to it (ADR-0014) — deleting what you
   * keep must never rewrite a day you have already counted.
   *
   * Scoped by (id, userId) together, as MealsService does, so a wrong-owner id
   * and a missing one are the same 404.
   */
  async remove(userId: string, id: string): Promise<void> {
    const result = await this.savedMeals.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Saved meal not found');
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
