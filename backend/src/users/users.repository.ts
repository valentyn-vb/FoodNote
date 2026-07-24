import type { RegisterRequest } from '@foodnote/shared';

export type CreateUserData = Omit<RegisterRequest, 'password'> & {
  passwordHash: string;
};

export type StoredUser = CreateUserData & {
  id: string;
  createdAt: Date;
};

/**
 * Abstract class instead of an interface so it can serve as both the
 * TypeScript type and the runtime DI token — no Symbol/@Inject ceremony.
 */
export abstract class UsersRepository {
  abstract findByEmail(email: string): Promise<StoredUser | null>;
  abstract create(data: CreateUserData): Promise<StoredUser>;
}
