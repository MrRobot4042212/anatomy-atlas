/**
 * Print what a GLB contains: nodes, meshes, materials, extensions, bounds, triangle counts.
 *
 *   pnpm --filter asset-pipeline inspect <file.glb> [more.glb ...]
 */
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  const root = doc.getRoot();
  const scene = root.listScenes()[0];
  let prims = 0;
  let tris = 0;
  let verts = 0;
  const perMesh: { name: string; tris: number }[] = [];
  for (const mesh of root.listMeshes()) {
    let t = 0;
    for (const p of mesh.listPrimitives()) {
      prims++;
      const idx = p.getIndices();
      const pos = p.getAttribute('POSITION');
      verts += pos?.getCount() ?? 0;
      t += idx ? idx.getCount() / 3 : (pos?.getCount() ?? 0) / 3;
    }
    tris += t;
    perMesh.push({ name: mesh.getName(), tris: t });
  }
  perMesh.sort((a, b) => b.tris - a.tris);
  // Triangles actually drawn (instances count every use of a shared mesh).
  let drawn = 0;
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    drawn += perMesh.find((m) => m.name === mesh.getName())?.tris ?? 0;
  }
  const b = getBounds(scene);
  console.log(`${file}`);
  console.log(
    `  nodes ${root.listNodes().length}, meshes ${root.listMeshes().length}, primitives ${prims}, materials ${root.listMaterials().length}`,
  );
  console.log(
    `  unique vertices ${verts.toLocaleString()}, unique triangles ${Math.round(tris).toLocaleString()}, drawn triangles ${Math.round(drawn).toLocaleString()}`,
  );
  console.log(
    `  extensions ${root
      .listExtensionsUsed()
      .map((e) => e.extensionName)
      .join(', ')}`,
  );
  console.log(
    `  bounds min ${b.min.map((v) => v.toFixed(3)).join(', ')} max ${b.max.map((v) => v.toFixed(3)).join(', ')}`,
  );
  console.log(
    `  heaviest meshes: ${perMesh
      .slice(0, 5)
      .map((m) => `${m.name} (${Math.round(m.tris).toLocaleString()})`)
      .join('; ')}`,
  );
}
