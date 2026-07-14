import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { User } from './user.entity';

describe('UserService', () => {
  let service: UserService;
  let repo: { findOne: jest.Mock };

  beforeEach(async () => {
    repo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('findByEmail', () => {
    it('returns the user and queries by email when a match exists', async () => {
      const user = { id: '1', email: 'jo@x.com' } as User;
      repo.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('jo@x.com');

      expect(result).toBe(user);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: 'jo@x.com' },
      });
    });

    it('returns null when no user is found', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('missing@x.com');

      expect(result).toBeNull();
    });
  });
});
