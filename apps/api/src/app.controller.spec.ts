import { Test, type TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';

describe('AppController', () => {
  let controller: AppController;
  const prisma = { $queryRaw: vi.fn() };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = app.get(AppController);
  });

  it('reports ok when the database answers', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    const report = await controller.health();
    expect(report.status).toBe('ok');
    expect(report.database).toBe('up');
  });

  it('reports degraded when the database fails', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
    const report = await controller.health();
    expect(report.status).toBe('degraded');
    expect(report.database).toBe('down');
  });
});
