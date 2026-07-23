import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { dashboardQuerySchema } from '@foodnote/shared';
import type { DashboardQuery, DashboardResponse } from '@foodnote/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  get(
    @Query(new ZodValidationPipe(dashboardQuerySchema)) query: DashboardQuery,
    @Req() req: AuthenticatedRequest,
  ): Promise<DashboardResponse> {
    return this.dashboard.getDashboard(req.user.id, query.date);
  }
}
