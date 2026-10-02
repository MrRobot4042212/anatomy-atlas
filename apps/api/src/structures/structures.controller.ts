import { Controller, Get, Param, Query } from '@nestjs/common';
import type { Paginated, Structure, StructureDetail, StructureTreeNode } from '@atlas/shared';
import { ListStructuresDto, TreeQueryDto } from './dto/list-structures.dto.js';
import { StructuresService } from './structures.service.js';

@Controller('structures')
export class StructuresController {
  constructor(private readonly structures: StructuresService) {}

  @Get()
  list(@Query() query: ListStructuresDto): Promise<Paginated<Structure>> {
    return this.structures.list(query);
  }

  // Declared before `:meshId` so "tree" is never read as a mesh id.
  @Get('tree')
  tree(@Query() query: TreeQueryDto): Promise<StructureTreeNode[]> {
    return this.structures.tree(query.system);
  }

  @Get(':meshId')
  byMeshId(@Param('meshId') meshId: string): Promise<StructureDetail> {
    return this.structures.byMeshId(meshId);
  }
}
