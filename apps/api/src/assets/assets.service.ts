import { Injectable, NotFoundException } from '@nestjs/common';
import type { AssetBundle } from '@atlas/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { toAssetBundle } from './asset-bundle.mapper.js';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bundle manifest for the viewer: which GLB holds which meshIds, by subsystem and zone. */
  async list(): Promise<AssetBundle[]> {
    const bundles = await this.prisma.assetBundle.findMany({
      orderBy: { id: 'asc' },
      include: {
        structures: {
          where: { meshId: { not: null } },
          select: { meshId: true, subsystem: true },
          orderBy: { meshId: 'asc' },
        },
      },
    });
    return bundles.map(toAssetBundle);
  }

  async byId(id: string): Promise<AssetBundle> {
    const bundle = (await this.list()).find((b) => b.id === id);
    if (!bundle) throw new NotFoundException(`No asset bundle ${id}`);
    return bundle;
  }
}
