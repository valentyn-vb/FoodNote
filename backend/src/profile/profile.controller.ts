import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  patchProfileRequestSchema,
  putProfileRequestSchema,
} from '@foodnote/shared';
import type {
  PatchProfileRequest,
  ProfileResponse,
  PutProfileRequest,
} from '@foodnote/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ProfileService } from './profile.service';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Put()
  @HttpCode(200)
  put(
    @Body(new ZodValidationPipe(putProfileRequestSchema))
    body: PutProfileRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<ProfileResponse> {
    return this.profile.put(req.user.id, body);
  }

  @Get()
  get(@Req() req: AuthenticatedRequest): Promise<ProfileResponse> {
    return this.profile.get(req.user.id);
  }

  @Patch()
  patch(
    @Body(new ZodValidationPipe(patchProfileRequestSchema))
    body: PatchProfileRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<ProfileResponse> {
    return this.profile.patch(req.user.id, body);
  }
}
