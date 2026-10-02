import { Color, DoubleSide, Material, MeshStandardMaterial } from 'three';

/**
 * Viewer-owned materials. The GLB ships Z-Anatomy's 9 shared materials (Bone, Cartilage,
 * Ligament...) tuned for Blender; we keep their base colour and names but render them with one
 * consistent, non-metallic standard material per name. Hover and selection are *shared*
 * variants per base material (3 x 9 extra materials total), so highlighting a structure is a
 * material reference swap and never a clone per mesh.
 *
 * DoubleSide is deliberate: left/right structures share one geometry and the left side is an
 * instance with negative X scale. The renderer flips winding for mirrored nodes, but the
 * raycaster does not, so with FrontSide a ray passes through every mirrored structure and
 * selects what lies behind it. Cost: no backface culling on ~450k triangles; measured before
 * choosing this over duplicating geometry per side in the pipeline.
 */
export interface MaterialSet {
  base: MeshStandardMaterial;
  hover: MeshStandardMaterial;
  selected: MeshStandardMaterial;
  ghost: MeshStandardMaterial;
}

const cache = new Map<string, MaterialSet>();
const HOVER = new Color('#3b82f6');
const SELECTED = new Color('#f97316');

function readColor(source: Material): Color {
  const c = (source as { color?: Color }).color;
  return c instanceof Color ? c.clone() : new Color('#d8d2c4');
}

export function materialSetFor(source: Material): MaterialSet {
  const key = source.name || 'default';
  let set = cache.get(key);
  if (set) return set;

  const color = readColor(source);
  const base = new MeshStandardMaterial({
    name: `${key}/base`,
    color,
    metalness: 0,
    roughness: 0.65,
    side: DoubleSide,
  });
  const hover = base.clone();
  hover.name = `${key}/hover`;
  hover.emissive = HOVER;
  hover.emissiveIntensity = 0.35;
  const selected = base.clone();
  selected.name = `${key}/selected`;
  selected.emissive = SELECTED;
  selected.emissiveIntensity = 0.55;
  const ghost = base.clone();
  ghost.name = `${key}/ghost`;
  ghost.transparent = true;
  ghost.opacity = 0.12;
  ghost.depthWrite = false;

  set = { base, hover, selected, ghost };
  cache.set(key, set);
  return set;
}
