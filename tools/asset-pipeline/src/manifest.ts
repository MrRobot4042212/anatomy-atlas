/**
 * Build out/manifest.json from out/mapping.json and the optimized GLB bundles in out/.
 *
 *   pnpm --filter asset-pipeline manifest [--out out] [--mapping out/mapping.json] [--zones out/zones.json]
 *
 * The manifest is the only input the API seed accepts. Every mesh found in a bundle must be a
 * structure in the mapping (by meshId); otherwise the script fails and lists the strays. Group
 * nodes without geometry are passed through so the seed can build the full tree.
 *
 * When out/zones.json exists (scripts/build_zones.py), each bundle gets a `zones` index: zone ->
 * the meshIds of that bundle. Without the file the manifest builds as before and bundles carry
 * no index; with it, every bundle mesh must have a valid zone or the script fails (stale zones).
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { NodeIO, getBounds, type Node } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import {
  BODY_SYSTEMS,
  BODY_ZONES,
  type AssetBundle,
  type BodyRegion,
  type BodySystem,
  type BodyZone,
  type Laterality,
  type StructureNames,
} from '@atlas/shared';

const { values } = parseArgs({
  options: {
    out: { type: 'string', default: 'out' },
    mapping: { type: 'string', default: 'out/mapping.json' },
    zones: { type: 'string', default: 'out/zones.json' },
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
  /** Set (e.g. "license:cowley-kidney") when the object is withheld from every bundle. */
  excluded?: string;
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
// Quarantined structures keep their key but have no meshId; a bundle carrying a node with that
// key was exported before the quarantine and must be rebuilt, never shipped.
const quarantinedKeys = new Map(
  mapping.structures.filter((s) => s.excluded).map((s) => [s.key, s.excluded as string]),
);

const zoneOf = existsSync(values.zones) ? await readZones(values.zones) : null;
if (!zoneOf) console.log(`${values.zones} not found: bundles carry no zones index`);
const unzoned: string[] = [];

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

  // A structure is a NAMED node. After optimization (dedup + meshopt quantization) a mesh
  // shared by several structures may sit in an unnamed child node under each named node, so
  // we never identify structures by mesh name: only by node name, bounds from the subtree.
  const meshes: string[] = [];
  for (const node of document.getRoot().listNodes()) {
    const meshId = node.getName();
    if (!meshId) {
      if (node.getMesh() && !nearestNamedAncestor(node)) {
        strays.push(`${file}:<unnamed mesh node>`);
      }
      continue;
    }
    if (!subtreeHasMesh(node)) continue;
    if (!byMeshId.has(meshId)) {
      const reason = quarantinedKeys.get(meshId);
      strays.push(
        reason
          ? `${file}:${meshId} (quarantined, ${reason}: rebuild the bundle)`
          : `${file}:${meshId}`,
      );
      continue;
    }
    if (placed.has(meshId)) {
      strays.push(`${file}:${meshId} (duplicate node)`);
      continue;
    }
    meshes.push(meshId);
    const { min, max } = getBounds(node);
    placed.set(meshId, {
      assetId: id,
      bounds: { min: [min[0], min[1], min[2]], max: [max[0], max[1], max[2]] },
    });
  }

  const subsystems: Record<string, string[]> = {};
  for (const meshId of meshes) {
    const key = byMeshId.get(meshId)?.subsystem ?? 'other';
    (subsystems[key] ??= []).push(meshId);
  }

  const bundle: AssetBundle = {
    id,
    system,
    url: `/models/${file}`,
    sizeBytes: (await stat(path)).size,
    meshCount: meshes.length,
    meshes,
    subsystems,
    hash: createHash('sha256').update(bytes).digest('hex').slice(0, 16),
  };
  if (zoneOf)
    bundle.zones = zonesIndex(meshes, zoneOf, (meshId) => unzoned.push(`${file}:${meshId}`));
  bundles.push(bundle);
}

if (strays.length > 0) {
  console.error(
    `Meshes in bundles that are not in the mapping (${strays.length}):`,
    strays.slice(0, 30),
  );
  process.exit(1);
}
if (unzoned.length > 0) {
  console.error(
    `Meshes in bundles without a zone in ${values.zones} (${unzoned.length}); rerun scripts/build_zones.py:`,
    unzoned.slice(0, 30),
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

/** meshId -> zone from zones.json, refusing values outside BODY_ZONES. */
async function readZones(path: string): Promise<Map<string, BodyZone>> {
  const raw = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
  const valid = new Set<string>(BODY_ZONES);
  const zones = new Map<string, BodyZone>();
  const invalid: string[] = [];
  for (const [meshId, zone] of Object.entries(raw)) {
    if (typeof zone === 'string' && valid.has(zone)) zones.set(meshId, zone as BodyZone);
    else invalid.push(`${meshId}: ${String(zone)}`);
  }
  if (invalid.length > 0) {
    console.error(`Zones outside BODY_ZONES in ${path} (${invalid.length}):`, invalid.slice(0, 30));
    process.exit(1);
  }
  return zones;
}

/** zone -> meshIds of one bundle, in BODY_ZONES order, empty zones left out. */
function zonesIndex(
  meshes: string[],
  zones: Map<string, BodyZone>,
  onMissing: (meshId: string) => void,
): Partial<Record<BodyZone, string[]>> {
  const grouped = new Map<BodyZone, string[]>();
  for (const meshId of meshes) {
    const zone = zones.get(meshId);
    if (!zone) {
      onMissing(meshId);
      continue;
    }
    const ids = grouped.get(zone) ?? [];
    ids.push(meshId);
    grouped.set(zone, ids);
  }
  const index: Partial<Record<BodyZone, string[]>> = {};
  for (const zone of BODY_ZONES) {
    const ids = grouped.get(zone);
    if (ids) index[zone] = ids;
  }
  return index;
}

function subtreeHasMesh(node: Node): boolean {
  if (node.getMesh()) return true;
  return node.listChildren().some(subtreeHasMesh);
}

function nearestNamedAncestor(node: Node): Node | null {
  let parent = node.getParentNode();
  while (parent) {
    if (parent.getName()) return parent;
    parent = parent.getParentNode();
  }
  return null;
}
