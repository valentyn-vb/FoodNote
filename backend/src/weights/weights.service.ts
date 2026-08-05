import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  EntityManager,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import type {
  CreateWeightRequest,
  UpdateWeightRequest,
} from '@foodnote/shared';
import { WeightEntry } from '../weight/weight-entry.entity';

@Injectable()
export class WeightsService {
  constructor(
    @InjectRepository(WeightEntry)
    private readonly repo: Repository<WeightEntry>,
  ) {}

  /**
   * The journal's repository, or the one bound to a caller's transaction.
   *
   * `PlanService` writes an entry and a goal together, and the goal reads the
   * entry it just wrote to find its `startWeightKg` — through `getLatestForUser`
   * below. Both have to run on the transaction's manager or the read misses the
   * uncommitted insert.
   */
  private scoped(manager?: EntityManager): Repository<WeightEntry> {
    return manager ? manager.getRepository(WeightEntry) : this.repo;
  }

  // Plain list, no per-day uniqueness (contract amended by #27) — every call
  // just inserts a new row.
  async create(
    userId: string,
    data: CreateWeightRequest,
    manager?: EntityManager,
  ): Promise<WeightEntry> {
    const repo = this.scoped(manager);
    const entry = repo.create({
      userId,
      weightKg: data.weightKg,
      recordedAt: new Date(data.recordedAt),
    });
    return repo.save(entry);
  }

  // Current Weight source: the entry with the latest recordedAt.
  async getLatestForUser(
    userId: string,
    manager?: EntityManager,
  ): Promise<WeightEntry | null> {
    return this.scoped(manager).findOne({
      where: { userId },
      order: { recordedAt: 'DESC' },
    });
  }

  async list(
    userId: string,
    from?: string,
    to?: string,
  ): Promise<WeightEntry[]> {
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

    return this.repo.find({
      where: { userId, ...(recordedAt && { recordedAt }) },
      order: { recordedAt: 'ASC' },
    });
  }

  async update(
    userId: string,
    id: string,
    patch: UpdateWeightRequest,
  ): Promise<WeightEntry> {
    // Scope the lookup by (id, userId) together, not id-then-check-owner —
    // a wrong-owner id and a nonexistent id must be indistinguishable 404s.
    const entry = await this.repo.findOne({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Weight entry not found');

    if (patch.weightKg !== undefined) entry.weightKg = patch.weightKg;
    if (patch.recordedAt !== undefined) {
      entry.recordedAt = new Date(patch.recordedAt);
    }
    return this.repo.save(entry);
  }

  async remove(userId: string, id: string): Promise<void> {
    const entry = await this.repo.findOne({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Weight entry not found');
    await this.repo.remove(entry);
  }
}
