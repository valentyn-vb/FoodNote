import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateWeightRequest } from '@foodnote/shared';
import { WeightEntry } from '../weight/weight-entry.entity';

@Injectable()
export class WeightsService {
  constructor(
    @InjectRepository(WeightEntry)
    private readonly repo: Repository<WeightEntry>,
  ) {}

  /**
   * The weight journal is a plain list (see CONTRACT.md): every log appends a
   * new entry. currentWeightKg elsewhere is derived from the latest recordedAt.
   */
  async append(userId: string, data: CreateWeightRequest): Promise<WeightEntry> {
    const entry = this.repo.create({
      userId,
      weightKg: data.weightKg,
      recordedAt: new Date(data.recordedAt),
    });
    return this.repo.save(entry);
  }
}
