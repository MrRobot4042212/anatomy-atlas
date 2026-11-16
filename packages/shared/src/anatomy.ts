/**
 * Domain vocabulary shared by the viewer (web) and the catalog (api).
 *
 * Keys are ontology-backed (ADR 0004): every structure has a `termKey` that is a
 * Terminologia Anatomica 2 id (`ta2:4231`) or, for unofficial names Z-Anatomy adds, a stable
 * local key (`za:adductor-minimus`). Sided structures get one row and one GLB mesh per side;
 * the `meshId` (`ta2-4231-r`) is the mesh name inside the GLB and the single join key between
 * 3D assets and database rows.
 */

export const BODY_SYSTEMS = [
  'skeletal',
  'muscular',
  'cardiovascular',
  'nervous',
  'lymphatic',
  'digestive',
  'respiratory',
  'urinary',
  'reproductive',
  'endocrine',
  'integumentary',
] as const;
export type BodySystem = (typeof BODY_SYSTEMS)[number];

export const BODY_REGIONS = [
  'head',
  'neck',
  'thorax',
  'abdomen',
  'pelvis',
  'back',
  'upper-limb',
  'lower-limb',
] as const;
export type BodyRegion = (typeof BODY_REGIONS)[number];

/**
 * Zones of the body the viewer filters by. Finer than `BodyRegion` (arm, forearm, hand, thigh, leg
 * and foot are separate) and derived from the geometry of each mesh against anatomical landmarks,
 * so every mesh has exactly one, including the structures the catalog leaves without a region.
 */
export const BODY_ZONES = [
  'head',
  'neck',
  'thorax',
  'abdomen',
  'pelvis',
  'back',
  'shoulder',
  'arm',
  'forearm',
  'hand',
  'thigh',
  'leg',
  'foot',
] as const;
export type BodyZone = (typeof BODY_ZONES)[number];

export const LATERALITY = ['left', 'right', 'midline'] as const;
export type Laterality = (typeof LATERALITY)[number];

export interface StructureNames {
  la: string; // Terminologia Anatomica (Latin)
  en: string;
  es: string;
}

/** A node of the anatomical hierarchy. Leaves usually have geometry; groups usually do not. */
export interface Structure {
  id: string; // internal uuid
  /** `ta2:<id>` or `za:<slug>`; shared by left/right siblings. */
  termKey: string;
  ta2Id: number | null;
  /** Mesh name inside the GLB; null for group nodes without geometry. */
  meshId: string | null;
  names: StructureNames;
  system: BodySystem;
  subsystem: string | null;
  region: BodyRegion | null;
  laterality: Laterality;
  parentId: string | null;
  description: string | null;
  /** Bundle that holds this structure's mesh; null when `meshId` is null. */
  assetId: string | null;
  /** Axis-aligned bounds in model space (metres, Y up), for camera focus. */
  bounds: { min: [number, number, number]; max: [number, number, number] } | null;
}

/** One optimized GLB bundle (one per system, or per system+region) and the meshes it holds. */
export interface AssetBundle {
  id: string;
  system: BodySystem;
  url: string;
  sizeBytes: number;
  meshCount: number;
  /** Mesh names (= meshIds) inside the GLB, for lookup without parsing the file. */
  meshes: string[];
  /** meshIds grouped by subsystem (e.g. arteries / veins / heart), for layer sub-toggles. */
  subsystems: Record<string, string[]>;
  /** meshIds grouped by body zone, for the region filter. Absent until the manifest provides it. */
  zones?: Partial<Record<BodyZone, string[]>>;
  /** Content hash to bust CDN cache on re-export. */
  hash: string;
}
