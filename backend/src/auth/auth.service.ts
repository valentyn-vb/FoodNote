import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import type { AuthResponse, AuthUser } from '@foodnote/shared';
import * as bcrypt from 'bcrypt';
import { USERS_REPOSITORY } from '../users/users.repository';
import type { StoredUser, UsersRepository } from '../users/users.repository';

const BCRYPT_COST = 10;

export interface TokenPair extends AuthResponse {
  refreshToken: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly accessSecret =
    process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
  private readonly refreshSecret =
    process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret';
  private readonly accessTtl = (process.env.JWT_ACCESS_TTL ??
    '15m') as JwtSignOptions['expiresIn'];
  private readonly refreshTtl = (process.env.JWT_REFRESH_TTL ??
    '7d') as JwtSignOptions['expiresIn'];

  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string): Promise<TokenPair> {
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const user = await this.users.create({ email, passwordHash });
    return this.issueTokens(user);
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.users.findByEmail(email);
    // Same error for unknown email and wrong password — no user-existence leak
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.users.findByEmail(payload.email);
    if (!user || user.id !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return { accessToken: await this.signAccessToken(user) };
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.accessSecret,
      });
      return { id: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private async issueTokens(user: StoredUser): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.jwt.signAsync(
        { sub: user.id, email: user.email },
        { secret: this.refreshSecret, expiresIn: this.refreshTtl },
      ),
    ]);
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email },
    };
  }

  private signAccessToken(user: StoredUser): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { secret: this.accessSecret, expiresIn: this.accessTtl },
    );
  }
}
