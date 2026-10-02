import { Test, type TestingModule } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Hermetic: PrismaService is replaced by an in-memory fake with the few calls these routes use.
const femur = {
  id: 'femur-r',
  termKey: 'ta2:1360',
  ta2Id: 1360,
  meshId: 'ta2-1360-r',
  nameLa: 'Os femoris',
  nameEn: 'Femur',
  nameEs: 'Hueso Fémur',
  system: 'skeletal',
  subsystem: 'bones-of-lower-limb',
  region: 'lower_limb',
  laterality: 'right',
  description: null,
  parentId: null,
  assetId: 'skeletal-v1',
  boundsMin: [-0.15, 0.43, -0.05],
  boundsMax: [-0.03, 0.88, 0.05],
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const prisma = {
  $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
    const sql = strings.join('?');
    if (sql.includes('COUNT(*)')) return [{ count: 1n }];
    if (sql.includes('WITH RECURSIVE')) return [];
    return [femur];
  }),
  structure: {
    findUnique: vi.fn(async ({ where }: { where: { meshId: string } }) =>
      where.meshId === femur.meshId ? femur : null,
    ),
    findMany: vi.fn(async () => [femur]),
  },
  assetBundle: {
    findMany: vi.fn(async () => [
      {
        id: 'skeletal-v1',
        system: 'skeletal',
        url: '/models/skeletal-v1.glb',
        sizeBytes: 3979028,
        meshCount: 690,
        hash: 'abc',
        structures: [{ meshId: 'ta2-1360-r' }],
      },
    ]),
  },
};

describe('Catalog (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/assets lists bundles with their meshIds', async () => {
    const res = await request(app.getHttpServer()).get('/api/assets').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 'skeletal-v1', meshes: ['ta2-1360-r'] });
  });

  it('GET /api/structures paginates and maps regions', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/structures?system=skeletal&q=fem&pageSize=10')
      .expect(200);
    expect(res.body).toMatchObject({ total: 1, page: 1, pageSize: 10 });
    expect(res.body.items[0]).toMatchObject({ meshId: 'ta2-1360-r', region: 'lower-limb' });
  });

  it('GET /api/structures rejects an unknown system', async () => {
    await request(app.getHttpServer()).get('/api/structures?system=magic').expect(400);
  });

  it('GET /api/structures/:meshId returns detail and 404 for unknown ids', async () => {
    const res = await request(app.getHttpServer()).get('/api/structures/ta2-1360-r').expect(200);
    expect(res.body.structure.names.es).toBe('Hueso Fémur');
    expect(res.body.ancestors).toEqual([]);
    await request(app.getHttpServer()).get('/api/structures/nope').expect(404);
  });

  it('GET /api/structures/tree requires a system', async () => {
    await request(app.getHttpServer()).get('/api/structures/tree').expect(400);
    const res = await request(app.getHttpServer())
      .get('/api/structures/tree?system=skeletal')
      .expect(200);
    expect(res.body[0]).toMatchObject({ meshId: 'ta2-1360-r', children: [] });
  });
});
