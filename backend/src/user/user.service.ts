import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import type { RegisterRequestDto, UserResponseDto } from './dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email } });
  }

  async create(dto: RegisterRequestDto): Promise<UserResponseDto> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.users.create({ email: dto.email, passwordHash });
    const saved = await this.users.save(user);

    return {
      id: saved.id,
      email: saved.email,
      createdAt: saved.createdAt.toISOString(),
    };
  }
}
