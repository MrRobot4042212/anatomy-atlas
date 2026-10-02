/**
 * Build out/manifest.json from out/mapping.json and the optimized GLB bundles in out/.
 *
 *   pnpm --filter asset-pipeline manifest [--out out] [--mapping out/mapping.json]
 *
 * The manifest is the only input the API seed accepts. Every mesh found in a bundle must be a
 * structure in the mapping (by meshId); otherwise the script fails and lists the strays. Group
 * nodes without geometry are passed through so the seed can build the full tree.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { NodeIO, type Node } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import {
  BODY_SYSTEMS,
  type AssetBundle,
  type BodyRegion,
  type BodySystem,
  type Laterality,
  type StructureNames,
} from '@atlas/shared';

const { values } = parseArgs({
  options: {
    out: { type: 'string', default: 'out' },
    mapping: { type: 'string', default: 'out/mapping.json' },
  },
});

interface MappingStructure {
  key: string;
  termKey: string;
  ta2Id: number | null;
  meshId: string | null;
  blenderName: string;
  objectType: 'MESH' | 'CURVE' | 'COLLECTION';
  names: StructureNames;
  system: BodySystem;
  subsystem: string | null;
  region: BodyRegion | null;
  laterality: Laterality;
  parentKey: string | null;
  hasGeometry: boolean;
  official: boolean;
}

export interface ManifestStructure {
  key: string;
  termKey: string;
  ta2Id: number | null;
  meshId: string | null;
  names: StructureNames;
  system: BodySystem;
  subsystem: string | null;
  region: BodyRegion | null;
  laterality: Laterality;
  parentKey: string | null;
  assetId: string | null;
  bounds: { min: [number, number, number]; max: [number, number, number] } | null;
}

export interface Manifest {
  generatedAt: string;
  bundles: AssetBundle[];
  structures: ManifestStructure[];
}

const mapping = JSON.parse(await readFile(values.mapping, 'utf8')) as {
  structures: MappingStructure[];
};
const byMeshId = new Map(
  mapping.structures.filter((s) => s.meshId).map((s) => [s.meshId as string, s]),
);

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const files = (await readdir(values.out)).filter((f) => f.endsWith('.glb')).sort();
if (files.length === 0) {
  console.error(`No .glb bundles found in ${values.out}`);
  process.exit(1);
}

const bundles: AssetBundle[] = [];
const placed = new Map<string, { assetId: string; bounds: ManifestStructure['bounds'] }>();
const strays: string[] = [];

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
    const meshId = node.getName() || mesh.getName();
    if (!byMeshId.has(meshId)) {
      strays.push(`${file}:${meshId}`);
      continue;
    }
    meshes.push(meshId);
    placed.set(meshId, { assetId: id, bounds: nodeBounds(node) });
  }

  bundles.push({
    id,
    system,
    url: `/models/${file}`,
    sizeBytes: (await stat(path)).size,
    meshCount: meshes.length,
    meshes,
    hash: createHash('sha256').update(bytes).digest('hex').slice(0, 16),
  });
}

if (strays.length > 0) {
  console.error(
    `Meshes in bundles that are not in the mapping (${strays.length}):`,
    strays.slice(0, 30),
  );
  process.exit(1);
}

const structures: ManifestStructure[] = mapping.structures.map((s) => {
  const hit = s.meshId ? placed.get(s.meshId) : undefined;
  return {
    key: s.key,
    termKey: s.termKey,
    ta2Id: s.ta2Id,
    meshId: s.meshId,
    names: s.names,
    system: s.system,
    subsystem: s.subsystem,
    region: s.region,
    laterality: s.laterality,
    parentKey: s.parentKey,
    assetId: hit?.assetId ?? null,
    bounds: hit?.bounds ?? null,
  };
});

const manifest: Manifest = { generatedAt: new Date().toISOString(), bundles, structures };
await writeFile(join(values.out, 'manifest.json'), JSON.stringify(manifest, null, 1));

const withGeometry = structures.filter((s) => s.assetId).length;
console.log(
  `manifest.json: ${bundles.length} bundles, ${structures.length} structures (${withGeometry} with geometry in a bundle)`,
);

function nodeBounds(node: Node): ManifestStructure['bounds'] {
  const mesh = node.getMesh();
  if (!mesh) return null;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const [tx, ty, tz] = node.getTranslation();
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
  if (!Number.isFinite(min[0])) return null;
  // Node translation only: Z-Anatomy objects carry identity rotation/scale, and export_apply
  // bakes modifiers. Revisit if a bundle ever has rotated nodes.
  return {
    min: [min[0] + tx, min[1] + ty, min[2] + tz],
    max: [max[0] + tx, max[1] + ty, max[2] + tz],
  };
}
