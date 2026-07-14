import { Module } from '@nestjs/common';
import { InMemoryUsersRepository } from './in-memory-users.repository';
import { USERS_REPOSITORY } from './users.repository';

@Module({
  providers: [{ provide: USERS_REPOSITORY, useClass: InMemoryUsersRepository }],
  exports: [USERS_REPOSITORY],
})
export class UsersModule {}
