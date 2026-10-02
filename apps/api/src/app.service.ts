import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

export interface HealthReport {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  timestamp: string;
}

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async health(): Promise<HealthReport> {
    let database: HealthReport['database'] = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
