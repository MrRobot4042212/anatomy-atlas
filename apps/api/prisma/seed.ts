// Seed the catalog from the asset pipeline manifest (tools/asset-pipeline/out/manifest.json).
//
//   pnpm --filter api db:seed [-- --manifest <path>]
//
// Idempotent: bundles are upserted by id, structures by (termKey, laterality). Parents are
// written first so parentId can be resolved in a single pass. Fails loudly if the manifest is
// missing, so a database never gets silently seeded with fixtures.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  PrismaClient,
  type BodyRegion,
  type Laterality,
  type Prisma,
} from '../src/generated/prisma/index.js';

const { values } = parseArgs({
  options: {
    manifest: {
      type: 'string',
      default: resolve(import.meta.dirname, '../../../tools/asset-pipeline/out/manifest.json'),
    },
  },
});

interface ManifestStructure {
  key: string;
  termKey: string;
  ta2Id: number | null;
  meshId: string | null;
  names: { la: string; en: string; es: string };
  system: string;
  subsystem: string | null;
  region: string | null;
  laterality: Laterality;
  parentKey: string | null;
  assetId: string | null;
  bounds: { min: number[]; max: number[] } | null;
}

interface Manifest {
  bundles: {
    id: string;
    system: string;
    url: string;
    sizeBytes: number;
    meshCount: number;
    hash: string;
    /** Body zone -> meshIds of the bundle; absent when the manifest was built without zones. */
    zones?: Record<string, string[]>;
  }[];
  structures: ManifestStructure[];
}

const prisma = new PrismaClient();

function toRegion(region: string | null): BodyRegion | null {
  return region ? (region.replace('-', '_') as BodyRegion) : null;
}

async function main() {
  const manifest = JSON.parse(await readFile(values.manifest, 'utf8')) as Manifest;

  for (const b of manifest.bundles) {
    // A manifest without zones resets the index, so a bundle never keeps zones of an old export.
    const zones: Prisma.InputJsonObject = b.zones ?? {};
    await prisma.assetBundle.upsert({
      where: { id: b.id },
      update: { url: b.url, sizeBytes: b.sizeBytes, meshCount: b.meshCount, hash: b.hash, zones },
      create: {
        id: b.id,
        system: b.system as never,
        url: b.url,
        sizeBytes: b.sizeBytes,
        meshCount: b.meshCount,
        hash: b.hash,
        zones,
      },
    });
  }

  // Topological order: a node is written only after its parent.
  const byKey = new Map(manifest.structures.map((s) => [s.key, s]));
  const ordered: ManifestStructure[] = [];
  const seen = new Set<string>();
  const visit = (s: ManifestStructure, trail: Set<string>) => {
    if (seen.has(s.key)) return;
    if (trail.has(s.key)) throw new Error(`cycle in hierarchy at ${s.key}`);
    trail.add(s.key);
    const parent = s.parentKey ? byKey.get(s.parentKey) : undefined;
    if (parent) visit(parent, trail);
    seen.add(s.key);
    ordered.push(s);
  };
  for (const s of manifest.structures) visit(s, new Set());

  const idByKey = new Map<string, string>();
  let written = 0;
  for (const s of ordered) {
    const parentId = s.parentKey ? (idByKey.get(s.parentKey) ?? null) : null;
    const data = {
      ta2Id: s.ta2Id,
      meshId: s.meshId,
      nameLa: s.names.la,
      nameEn: s.names.en,
      nameEs: s.names.es,
      system: s.system as never,
      subsystem: s.subsystem,
      region: toRegion(s.region),
      parentId,
      assetId: s.assetId,
      boundsMin: s.bounds?.min ?? [],
      boundsMax: s.bounds?.max ?? [],
    };
    const row = await prisma.structure.upsert({
      where: { termKey_laterality: { termKey: s.termKey, laterality: s.laterality } },
      update: data,
      create: { termKey: s.termKey, laterality: s.laterality, ...data },
      select: { id: true },
    });
    idByKey.set(s.key, row.id);
    written++;
  }

  // Rows that left the manifest (renamed terms, excluded helpers) are removed so the catalog
  // never serves structures the bundles no longer contain.
  const keep = new Set(ordered.map((s) => `${s.termKey}|${s.laterality}`));
  const stale = (
    await prisma.structure.findMany({ select: { id: true, termKey: true, laterality: true } })
  ).filter((r) => !keep.has(`${r.termKey}|${r.laterality}`));
  if (stale.length > 0) {
    const ids = stale.map((r) => r.id);
    await prisma.structure.updateMany({
      where: { parentId: { in: ids } },
      data: { parentId: null },
    });
    await prisma.structure.deleteMany({ where: { id: { in: ids } } });
  }
  const bundleIds = new Set(manifest.bundles.map((b) => b.id));
  const staleBundles = (await prisma.assetBundle.findMany({ select: { id: true } })).filter(
    (b) => !bundleIds.has(b.id),
  );
  if (staleBundles.length > 0) {
    await prisma.assetBundle.deleteMany({ where: { id: { in: staleBundles.map((b) => b.id) } } });
  }

  const withMesh = ordered.filter((s) => s.assetId).length;
  const zoned = manifest.bundles.filter((b) => b.zones && Object.keys(b.zones).length > 0).length;
  console.log(
    `Seeded ${manifest.bundles.length} bundles (${zoned} with zones), ${written} structures (${withMesh} with geometry); removed ${stale.length} stale structures, ${staleBundles.length} stale bundles.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
