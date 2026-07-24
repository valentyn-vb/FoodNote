import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { UpdateAccountRequest } from '@foodnote/shared';
import { UsersRepository } from './users.repository';
import type { CreateUserData, StoredUser } from './users.repository';

/**
 * Test double for unit tests — production uses TypeormUsersRepository.
 */
@Injectable()
export class InMemoryUsersRepository implements UsersRepository {
  private readonly byEmail = new Map<string, StoredUser>();

  findByEmail(email: string): Promise<StoredUser | null> {
    return Promise.resolve(this.byEmail.get(email) ?? null);
  }

  findById(id: string): Promise<StoredUser | null> {
    const user = [...this.byEmail.values()].find((u) => u.id === id);
    return Promise.resolve(user ?? null);
  }

  update(id: string, data: UpdateAccountRequest): Promise<StoredUser> {
    const user = [...this.byEmail.values()].find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // Email is immutable here, so the map key (email) stays valid.
    Object.assign(user, data);
    return Promise.resolve(user);
  }

  create(data: CreateUserData): Promise<StoredUser> {
    const user: StoredUser = {
      id: randomUUID(),
      ...data,
      createdAt: new Date(),
    };
    this.byEmail.set(user.email, user);
    return Promise.resolve(user);
  }
}
