import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { InMemoryUsersRepository } from '../users/in-memory-users.repository';
import { USERS_REPOSITORY } from '../users/users.repository';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: InMemoryUsersRepository;

  const EMAIL = 'sergio@example.com';
  const PASSWORD = 'correct horse battery';

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        { provide: USERS_REPOSITORY, useClass: InMemoryUsersRepository },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    users = moduleRef.get(USERS_REPOSITORY);
  });

  describe('register', () => {
    it('stores a bcrypt hash, never the plain password', async () => {
      await service.register(EMAIL, PASSWORD);

      const stored = await users.findByEmail(EMAIL);
      expect(stored).not.toBeNull();
      expect(stored!.passwordHash).not.toContain(PASSWORD);
      expect(await bcrypt.compare(PASSWORD, stored!.passwordHash)).toBe(true);
    });

    it('returns a token pair and the public user shape', async () => {
      const result = await service.register(EMAIL, PASSWORD);

      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
      expect(typeof result.user.id).toBe('string');
      expect(result.user.email).toBe(EMAIL);
    });

    it('rejects a duplicate email with ConflictException', async () => {
      await service.register(EMAIL, PASSWORD);

      await expect(service.register(EMAIL, 'other password')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    beforeEach(() => service.register(EMAIL, PASSWORD));

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
      const { refreshToken, user } = await service.register(EMAIL, PASSWORD);

      const { accessToken } = await service.refresh(refreshToken);

      expect(await service.verifyAccessToken(accessToken)).toEqual(user);
    });

    it('rejects garbage tokens', async () => {
      await expect(service.refresh('not-a-jwt')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an access token used as a refresh token', async () => {
      const { accessToken } = await service.register(EMAIL, PASSWORD);

      await expect(service.refresh(accessToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
