import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { TypeormUsersRepository } from './typeorm-users.repository';
import { UsersRepository } from './users.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [{ provide: UsersRepository, useClass: TypeormUsersRepository }],
  exports: [UsersRepository],
})
export class UsersModule {}
