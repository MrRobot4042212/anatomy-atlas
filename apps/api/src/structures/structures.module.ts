import { Module } from '@nestjs/common';
import { StructuresController } from './structures.controller.js';
import { StructuresService } from './structures.service.js';

@Module({
  controllers: [StructuresController],
  providers: [StructuresService],
  exports: [StructuresService],
})
export class StructuresModule {}
