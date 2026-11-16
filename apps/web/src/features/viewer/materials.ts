import { Color, DoubleSide, Material, MeshStandardMaterial, type Plane } from 'three';

/**
 * Viewer-owned materials. The GLB ships Z-Anatomy's shared materials (Bone, Cartilage,
 * Ligament, Artery...) tuned for Blender; we keep their base colour and names but render them
 * with one consistent, non-metallic standard material per name. Hover, selection, ghost and
 * translucent are *shared* variants per base material, so changing a structure's state is a
 * material reference swap and never a clone per mesh.
 *
 * DoubleSide is deliberate: left/right structures share one geometry and the left side is an
 * instance with negative X scale. The renderer flips winding for mirrored nodes, but the
 * raycaster does not, so with FrontSide a ray passes through every mirrored structure and
 * selects what lies behind it. It also makes cut surfaces readable with clipping planes.
 */
export type Variant = 'base' | 'hover' | 'selected' | 'ghost' | 'translucent';
export type MaterialSet = Record<Variant, MeshStandardMaterial>;

const cache = new Map<string, MaterialSet>();
// Platform colours (DESIGN.md): hover is the accent light blue, selection magenta from the brand gradient
// palette, the one hue that reads on bone, arteries and veins alike.
const HOVER = new Color('#6fb1fc');
const SELECTED = new Color('#ff3ca6');
let currentPlanes: Plane[] = [];

/**
 * Scene palette (DESIGN.md). Z-Anatomy colours several materials through its own shader and
 * exports them as pure white; we give those the colours anatomy atlases use so a student reads
 * tissue type at a glance: muscle red, nerve yellow, lymph green, cortex pink, bone ivory.
 * Materials not listed keep the colour that came in the GLB (arteries red, veins blue...).
 */
const SCENE_PALETTE: Record<string, { color?: string; opacity?: number }> = {
  Flexion: { color: '#a9463f' }, // muscles
  Trapezius: { color: '#a9463f' },
  'Orbicularis/Constrictor': { color: '#a9463f' },
  Nerve: { color: '#e3c75a' },
  'Frontal lobe': { color: '#e0a48e' }, // cerebral cortex
  'Bronchi-1': { color: '#d9cfc0' },
  'Lymph-5': { color: '#79b77f' },
  Organ: { color: '#c97b6b' },
  'Organ-2': { color: '#c97b6b' },
  'Bone-1': { color: '#ece5d6' },
  'Bone-4': { color: '#ece5d6' },
  Dentine: { color: '#efe6d8' },
  // Fascia and sheaths wrap muscles; as a veil they show what they cover.
  Fascia: { opacity: 0.35 },
  Bursa: { opacity: 0.6 },
};

function readColor(source: Material): Color {
  const override = SCENE_PALETTE[source.name]?.color;
  if (override) return new Color(override);
  const c = (source as { color?: Color }).color;
  return c instanceof Color ? c.clone() : new Color('#d8d2c4');
}

function variant(
  base: MeshStandardMaterial,
  name: string,
  tune: (m: MeshStandardMaterial) => void,
) {
  const m = base.clone();
  m.name = `${base.name.split('/')[0]}/${name}`;
  tune(m);
  return m;
}

/**
 * `key` is the GLB material name (stable across re-registrations); `source` is only read the
 * first time a key is seen, to pick up the colour the file shipped.
 */
export function materialSetFor(key: string, source: Material): MaterialSet {
  let set = cache.get(key);
  if (set) return set;

  const opacity = SCENE_PALETTE[key]?.opacity ?? 1;
  const base = new MeshStandardMaterial({
    name: `${key}/base`,
    color: readColor(source),
    metalness: 0,
    roughness: 0.65,
    side: DoubleSide,
    clippingPlanes: currentPlanes,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    forceSinglePass: opacity < 1,
  });
  set = {
    base,
    hover: variant(base, 'hover', (m) => {
      m.emissive = HOVER;
      m.emissiveIntensity = 0.35;
    }),
    selected: variant(base, 'selected', (m) => {
      m.emissive = SELECTED;
      m.emissiveIntensity = 0.7;
    }),
    // Transparent + DoubleSide renders in two passes by default (back faces, then front),
    // doubling draw calls while isolating. One pass is enough for these see-through states.
    ghost: variant(base, 'ghost', (m) => {
      m.transparent = true;
      m.opacity = 0.08;
      m.depthWrite = false;
      m.forceSinglePass = true;
    }),
    translucent: variant(base, 'translucent', (m) => {
      m.transparent = true;
      m.opacity = 0.35;
      m.depthWrite = false;
      m.forceSinglePass = true;
    }),
  };
  cache.set(key, set);
  return set;
}

/** Apply the cutting plane(s) to every viewer material, present and future. */
export function setClippingPlanes(planes: Plane[]) {
  currentPlanes = planes;
  for (const set of cache.values()) {
    for (const m of Object.values(set)) {
      m.clippingPlanes = planes;
      m.needsUpdate = true;
    }
  }
}
