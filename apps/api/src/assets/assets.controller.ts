import { Controller, Get, Param } from '@nestjs/common';
import type { AssetBundle } from '@atlas/shared';
import { AssetsService } from './assets.service.js';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  list(): Promise<AssetBundle[]> {
    return this.assets.list();
  }

  @Get(':id')
  byId(@Param('id') id: string): Promise<AssetBundle> {
    return this.assets.byId(id);
  }
}
