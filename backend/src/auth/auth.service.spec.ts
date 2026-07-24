import type { RegisterRequest } from '@foodnote/shared';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { InMemoryUsersRepository } from '../users/in-memory-users.repository';
import { UsersRepository } from '../users/users.repository';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: InMemoryUsersRepository;

  const FIRST_NAME = 'Sergio';
  const LAST_NAME = 'Ramos';
  const EMAIL = 'sergio@example.com';
  const PASSWORD = 'correct horse battery';

  const registration = (
    overrides: Partial<RegisterRequest> = {},
  ): RegisterRequest => ({
    firstName: FIRST_NAME,
    lastName: LAST_NAME,
    email: EMAIL,
    password: PASSWORD,
    ...overrides,
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        { provide: UsersRepository, useClass: InMemoryUsersRepository },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    users = moduleRef.get(UsersRepository);
  });

  describe('register', () => {
    it('stores a bcrypt hash, never the plain password', async () => {
      await service.register(registration());

      const stored = await users.findByEmail(EMAIL);
      expect(stored).not.toBeNull();
      expect(stored!.firstName).toBe(FIRST_NAME);
      expect(stored!.lastName).toBe(LAST_NAME);
      expect(stored!.passwordHash).not.toContain(PASSWORD);
      expect(await bcrypt.compare(PASSWORD, stored!.passwordHash)).toBe(true);
    });

    it('returns a token pair and the public user shape', async () => {
      const result = await service.register(registration());

      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
      expect(typeof result.user.id).toBe('string');
      expect(result.user.email).toBe(EMAIL);
      expect(result.user.firstName).toBe(FIRST_NAME);
      expect(result.user.lastName).toBe(LAST_NAME);
    });

    it('rejects a duplicate email with ConflictException', async () => {
      await service.register(registration());

      await expect(
        service.register(registration({ password: 'other password' })),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    beforeEach(() => service.register(registration()));

    it('returns tokens for valid credentials', async () => {
      const result = await service.login(EMAIL, PASSWORD);
      expect(typeof result.accessToken).toBe('string');
      expect(result.user.email).toBe(EMAIL);
    });

    it.each([
      ['wrong password', EMAIL, 'not the password'],
      ['unknown email', 'nobody@example.com', PASSWORD],
    ])(
      'rejects %s with the same generic UnauthorizedException',
      async (_case, email, password) => {
        await expect(service.login(email, password)).rejects.toMatchObject({
          constructor: UnauthorizedException,
          message: 'Invalid credentials',
        });
      },
    );
  });

  describe('refresh', () => {
    it('issues a new valid access token from a refresh token', async () => {
      const { refreshToken, user } = await service.register(registration());

      const { accessToken } = await service.refresh(refreshToken);

      // The access token carries only identity (id + email), not the name.
      expect(await service.verifyAccessToken(accessToken)).toEqual({
        id: user.id,
        email: user.email,
      });
    });

    it('rejects garbage tokens', async () => {
      await expect(service.refresh('not-a-jwt')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an access token used as a refresh token', async () => {
      const { accessToken } = await service.register(registration());

      await expect(service.refresh(accessToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('account', () => {
    it('updateAccount changes the name and getUser reflects it', async () => {
      const { user } = await service.register(registration());

      const updated = await service.updateAccount(user.id, {
        firstName: 'Sergi',
        lastName: 'Roberto',
      });

      expect(updated).toEqual({
        id: user.id,
        email: EMAIL,
        firstName: 'Sergi',
        lastName: 'Roberto',
      });
      expect(await service.getUser(user.id)).toEqual(updated);
    });

    it('getUser rejects an unknown id', async () => {
      await expect(service.getUser('missing-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
