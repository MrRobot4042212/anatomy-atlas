// Seed the catalog from the asset pipeline manifest.
// Usage: pnpm --filter api db:seed
// The manifest is produced by tools/asset-pipeline and lists every mesh (fmaId)
// with its names, system, region and bounds. Until the pipeline runs, this
// seeds a tiny fixture so the API has something to serve.
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  const bundle = await prisma.assetBundle.upsert({
    where: { id: 'skeletal-v0' },
    update: {},
    create: {
      id: 'skeletal-v0',
      system: 'skeletal',
      url: '/models/skeletal-v0.glb',
      sizeBytes: 0,
      meshCount: 1,
      hash: 'fixture',
    },
  });

  await prisma.structure.upsert({
    where: { fmaId: 'FMA9915' },
    update: {},
    create: {
      fmaId: 'FMA9915',
      nameLa: 'Femur',
      nameEn: 'Femur',
      nameEs: 'Fémur',
      system: 'skeletal',
      subsystem: 'bones',
      region: 'lower_limb',
      laterality: 'bilateral',
      description: 'Longest and strongest bone of the body; articulates with the hip and the knee.',
      assetId: bundle.id,
      boundsMin: [],
      boundsMax: [],
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
