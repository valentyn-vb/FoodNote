import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@foodnote/shared';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'foodnote-api',
      timestamp: new Date().toISOString(),
    };
  }
}
