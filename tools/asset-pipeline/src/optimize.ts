/**
 * Optimize a raw glTF/GLB exported from Blender into a web-ready bundle.
 *
 *   pnpm --filter asset-pipeline optimize --in out/raw/skeletal.glb --out out/skeletal-v1.glb [--ratio 0.5]
 *
 * Pipeline: dedup -> prune -> weld -> simplify -> meshopt compression.
 * Mesh names (meshIds, ADR 0004) are preserved; the script fails if any mesh lacks a valid one.
 */
import { parseArgs } from 'node:util';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

/** meshId contract (ADR 0004): ta2-<id> or za-<slug>, optional -l/-r side. */
const MESH_ID = /^(ta2-\d+(-\d+)*|za-[a-z0-9-]+)(-[lr])?$/;

const { values } = parseArgs({
  options: {
    in: { type: 'string' },
    out: { type: 'string' },
    ratio: { type: 'string', default: '0.5' },
    error: { type: 'string', default: '0.001' },
  },
});

if (!values.in || !values.out) {
  console.error('Usage: optimize --in <file.glb> --out <file.glb> [--ratio 0.5] [--error 0.001]');
  process.exit(1);
}

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

const document = await io.read(values.in);

// The contract is on NODE names (a structure is a named node; mesh data may be shared and
// carries whatever name Blender left on it).
const badNames = document
  .getRoot()
  .listNodes()
  .filter((n) => n.getMesh())
  .map((n) => n.getName())
  .filter((n) => !MESH_ID.test(n));
if (badNames.length > 0) {
  console.error(`Nodes without a valid meshId (${badNames.length}):`, badNames.slice(0, 20));
  process.exit(1);
}

await document.transform(
  dedup(),
  prune(),
  weld(),
  simplify({
    simplifier: MeshoptSimplifier,
    ratio: Number(values.ratio),
    error: Number(values.error),
  }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);

await io.write(values.out, document);

const meshCount = document.getRoot().listMeshes().length;
console.log(`Wrote ${values.out}: ${meshCount} meshes`);
