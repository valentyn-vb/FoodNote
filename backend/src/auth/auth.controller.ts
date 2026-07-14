import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  loginRequestSchema,
  registerRequestSchema,
  type AuthResponse,
  type AuthUser,
  type LoginRequest,
  type RefreshResponse,
  type RegisterRequest,
} from '@foodnote/shared';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import type { TokenPair } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedRequest } from './jwt-auth.guard';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Matches the global 'api' prefix — the cookie is only sent to auth routes
const REFRESH_COOKIE_PATH = '/api/auth';

const AUTH_THROTTLE = {
  default: {
    limit: Number(process.env.AUTH_THROTTLE_LIMIT ?? 5),
    ttl: 60_000,
  },
};

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  async register(
    @Body(new ZodValidationPipe(registerRequestSchema)) body: RegisterRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respondWithTokens(
      await this.authService.register(body.email, body.password),
      res,
    );
  }

  @Post('login')
  @HttpCode(200)
  @Throttle(AUTH_THROTTLE)
  async login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: LoginRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respondWithTokens(
      await this.authService.login(body.email, body.password),
      res,
    );
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request): Promise<RefreshResponse> {
    const token = (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_COOKIE
    ];
    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }
    return this.authService.refresh(token);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthenticatedRequest): AuthUser {
    return req.user;
  }

  private respondWithTokens(pair: TokenPair, res: Response): AuthResponse {
    const { refreshToken, ...response } = pair;
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });
    return response;
  }
}
