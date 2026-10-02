import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AssetsModule } from './assets/assets.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StructuresModule } from './structures/structures.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, StructuresModule, AssetsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
