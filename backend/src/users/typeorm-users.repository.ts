import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import type { UpdateAccountRequest } from '@foodnote/shared';
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

  findById(id: string): Promise<StoredUser | null> {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: string, data: UpdateAccountRequest): Promise<StoredUser> {
    const user = await this.repo.preload({ id, ...data });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.repo.save(user);
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
