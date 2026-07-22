import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateWeightRequest } from '@foodnote/shared';
import { WeightEntry } from './weight-entry.entity';

@Injectable()
export class WeightsService {
  constructor(
    @InjectRepository(WeightEntry)
    private readonly repo: Repository<WeightEntry>,
  ) {}

  // Plain append: the weight journal is a list. One-per-day upsert is #31.
  async create(
    userId: string,
    data: CreateWeightRequest,
  ): Promise<WeightEntry> {
    const entry = this.repo.create({
      userId,
      weightKg: data.weightKg,
      recordedAt: new Date(data.recordedAt),
    });
    return this.repo.save(entry);
  }

  // Current Weight source: the entry with the latest recordedAt.
  async getLatestForUser(userId: string): Promise<WeightEntry | null> {
    return this.repo.findOne({
      where: { userId },
      order: { recordedAt: 'DESC' },
    });
  }
}
