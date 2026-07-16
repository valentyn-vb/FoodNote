export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

/**
 * Abstract class instead of an interface so it can serve as both the
 * TypeScript type and the runtime DI token — no Symbol/@Inject ceremony.
 */
export abstract class UsersRepository {
  abstract findByEmail(email: string): Promise<StoredUser | null>;
  abstract create(data: {
    email: string;
    passwordHash: string;
  }): Promise<StoredUser>;
}
