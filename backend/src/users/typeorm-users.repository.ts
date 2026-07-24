import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { UsersRepository } from './users.repository';
import type { CreateUserData, StoredUser } from './users.repository';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class TypeormUsersRepository implements UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<StoredUser | null> {
    return this.repo.findOne({ where: { email } });
  }

  async create(data: CreateUserData): Promise<StoredUser> {
    try {
      return await this.repo.save(this.repo.create(data));
    } catch (error) {
      // Two concurrent registers can pass the service's existence check;
      // the DB unique index is the source of truth
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION
      ) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }
}
