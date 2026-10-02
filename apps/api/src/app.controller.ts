import { Controller, Get } from '@nestjs/common';
import { AppService, type HealthReport } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  health(): Promise<HealthReport> {
    return this.appService.health();
  }
}
