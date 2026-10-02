import { Injectable, NotFoundException } from '@nestjs/common';
import type { AssetBundle } from '@atlas/shared';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bundle manifest for the viewer: which GLB holds which meshIds. */
  async list(): Promise<AssetBundle[]> {
    const bundles = await this.prisma.assetBundle.findMany({
      orderBy: { id: 'asc' },
      include: {
        structures: { where: { meshId: { not: null } }, select: { meshId: true } },
      },
    });
    return bundles.map((b) => ({
      id: b.id,
      system: b.system,
      url: b.url,
      sizeBytes: b.sizeBytes,
      meshCount: b.meshCount,
      hash: b.hash,
      meshes: b.structures.map((s) => s.meshId as string),
    }));
  }

  async byId(id: string): Promise<AssetBundle> {
    const bundle = (await this.list()).find((b) => b.id === id);
    if (!bundle) throw new NotFoundException(`No asset bundle ${id}`);
    return bundle;
  }
}
