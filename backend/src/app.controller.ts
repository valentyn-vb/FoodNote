import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { HealthResponse } from '@foodnote/shared';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Render polls this continuously; without the skip those checks would eat the
  // global per-IP budget for whichever address they resolve to.
  @Get('health')
  @SkipThrottle()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'foodnote-api',
      timestamp: new Date().toISOString(),
    };
  }
}
