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

  async upsertToday(
    userId: string,
    data: CreateWeightRequest,
  ): Promise<{ entry: WeightEntry; created: boolean }> {
    const recordedAt = new Date(data.recordedAt);
    const day = recordedAt.toISOString().slice(0, 10);
    const existing = await this.repo.findOne({ where: { userId, day } });

    if (existing) {
      existing.weightKg = data.weightKg;
      existing.recordedAt = recordedAt;
      return { entry: await this.repo.save(existing), created: false };
    }

    const created = this.repo.create({
      userId,
      day,
      weightKg: data.weightKg,
      recordedAt,
    });
    return { entry: await this.repo.save(created), created: true };
  }
}
