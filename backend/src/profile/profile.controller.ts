import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { putProfileRequestSchema } from '@foodnote/shared';
import type { ProfileResponse, PutProfileRequest } from '@foodnote/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { ProfileService } from './profile.service';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  async get(@Req() req: AuthenticatedRequest): Promise<ProfileResponse> {
    return this.profile.getCurrent(req.user.id);
  }

  @Put()
  async put(
    @Body(new ZodValidationPipe(putProfileRequestSchema))
    body: PutProfileRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<ProfileResponse> {
    return this.profile.upsert(req.user.id, body);
  }
}
