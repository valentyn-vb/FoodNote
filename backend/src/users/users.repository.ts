export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface UsersRepository {
  findByEmail(email: string): Promise<StoredUser | null>;
  create(data: { email: string; passwordHash: string }): Promise<StoredUser>;
}

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
