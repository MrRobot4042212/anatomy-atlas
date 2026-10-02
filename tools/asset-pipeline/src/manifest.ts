/**
 * Build out/manifest.json from the optimized GLB bundles and data/label-to-fma.csv.
 *
 *   pnpm --filter asset-pipeline manifest [--out out] [--names data/label-to-fma.csv]
 *
 * The manifest is the only input the API seed accepts. Every mesh found in a bundle must have a
 * row in the names CSV, otherwise the script fails and lists the missing FMA ids.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { NodeIO, type Node } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { BODY_SYSTEMS, type BodySystem, type Structure } from '@atlas/shared';

const { values } = parseArgs({
  options: {
    out: { type: 'string', default: 'out' },
    names: { type: 'string', default: 'data/label-to-fma.csv' },
  },
});

interface NameRow {
  fmaId: string;
  label: string; // Z-Anatomy label
  la: string;
  en: string;
  es: string;
  system: BodySystem;
  subsystem: string;
  region: Structure['region'];
  laterality: Structure['laterality'];
  parentFmaId: string;
}

interface ManifestStructure extends Omit<Structure, 'id' | 'parentId'> {
  parentFmaId: string | null;
}

interface Manifest {
  generatedAt: string;
  bundles: {
    id: string;
    system: BodySystem;
    url: string;
    sizeBytes: number;
    meshCount: number;
    meshes: string[];
    hash: string;
  }[];
  structures: ManifestStructure[];
}

function parseCsv(text: string): NameRow[] {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? ''])) as unknown as NameRow;
  });
}

const names = new Map(parseCsv(await readFile(values.names, 'utf8')).map((r) => [r.fmaId, r]));

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const files = (await readdir(values.out)).filter((f) => f.endsWith('.glb'));
const manifest: Manifest = { generatedAt: new Date().toISOString(), bundles: [], structures: [] };
const missing: string[] = [];

for (const file of files) {
  const path = join(values.out, file);
  const bytes = await readFile(path);
  const document = await io.readBinary(new Uint8Array(bytes));
  const id = file.replace(/\.glb$/, '');
  const system = BODY_SYSTEMS.find((s) => id.startsWith(s));
  if (!system) {
    console.error(`Bundle ${file} does not start with a BodySystem name`);
    process.exit(1);
  }

  const meshes: string[] = [];
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const fmaId = mesh.getName();
    meshes.push(fmaId);
    const row = names.get(fmaId);
    if (!row) {
      missing.push(fmaId);
      continue;
    }
    const [min, max] = nodeBounds(node);
    manifest.structures.push({
      fmaId,
      names: { la: row.la, en: row.en, es: row.es },
      system: row.system,
      subsystem: row.subsystem || undefined,
      region: row.region,
      laterality: row.laterality,
      parentFmaId: row.parentFmaId || null,
      assetId: id,
      bounds: { min, max },
    });
  }

  manifest.bundles.push({
    id,
    system,
    url: `/models/${file}`,
    sizeBytes: (await stat(path)).size,
    meshCount: meshes.length,
    meshes,
    hash: createHash('sha256').update(bytes).digest('hex').slice(0, 16),
  });
}

if (missing.length > 0) {
  console.error(`FMA ids missing from ${values.names} (${missing.length}):`, missing.slice(0, 50));
  process.exit(1);
}

await writeFile(join(values.out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(
  `manifest.json: ${manifest.bundles.length} bundles, ${manifest.structures.length} structures`,
);

function nodeBounds(node: Node): [[number, number, number], [number, number, number]] {
  const mesh = node.getMesh()!;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    if (!pos) continue;
    const pmin = pos.getMin([0, 0, 0]);
    const pmax = pos.getMax([0, 0, 0]);
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], pmin[i]);
      max[i] = Math.max(max[i], pmax[i]);
    }
  }
  return [min, max];
}
