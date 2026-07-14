import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UsersRepository } from './users.repository';
import type { StoredUser } from './users.repository';

/**
 * Test double for unit tests — production uses TypeormUsersRepository.
 */
@Injectable()
export class InMemoryUsersRepository implements UsersRepository {
  private readonly byEmail = new Map<string, StoredUser>();

  findByEmail(email: string): Promise<StoredUser | null> {
    return Promise.resolve(this.byEmail.get(email) ?? null);
  }

  create(data: { email: string; passwordHash: string }): Promise<StoredUser> {
    const user: StoredUser = {
      id: randomUUID(),
      email: data.email,
      passwordHash: data.passwordHash,
      createdAt: new Date(),
    };
    this.byEmail.set(user.email, user);
    return Promise.resolve(user);
  }
}
