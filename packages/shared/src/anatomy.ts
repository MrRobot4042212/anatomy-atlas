/**
 * Domain vocabulary shared by the viewer (web) and the catalog (api).
 *
 * IDs are ontology-backed: every structure carries a stable `fmaId`
 * (Foundational Model of Anatomy) that is also the mesh name inside the GLB.
 * That single key is the contract between 3D assets and database rows.
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

/** Finer grouping inside a system, e.g. cardiovascular -> arteries | veins. */
export const SUBSYSTEMS = {
  cardiovascular: ['heart', 'arteries', 'veins'],
  nervous: ['central', 'peripheral', 'cranial-nerves'],
  skeletal: ['bones', 'cartilage', 'ligaments', 'joints'],
} as const satisfies Partial<Record<BodySystem, readonly string[]>>;

export const BODY_REGIONS = [
  'head',
  'neck',
  'thorax',
  'abdomen',
  'pelvis',
  'upper-limb',
  'lower-limb',
  'back',
] as const;
export type BodyRegion = (typeof BODY_REGIONS)[number];

export const LATERALITY = ['left', 'right', 'midline', 'bilateral'] as const;
export type Laterality = (typeof LATERALITY)[number];

export interface StructureNames {
  la: string; // Terminologia Anatomica (Latin)
  en: string;
  es: string;
}

/** A single anatomical structure as served by the API. */
export interface Structure {
  id: string; // internal uuid
  fmaId: string; // e.g. "FMA7163" (liver)
  taCode?: string; // Terminologia Anatomica code, optional
  names: StructureNames;
  system: BodySystem;
  subsystem?: string;
  region: BodyRegion;
  laterality: Laterality;
  parentId: string | null;
  description?: string;
  /** Which asset bundle holds this structure's mesh. */
  assetId: string;
  /** Axis-aligned bounds in model space, used for camera focus. */
  bounds?: { min: [number, number, number]; max: [number, number, number] };
}

/** One optimized GLB bundle (one per system or region) and the meshes it contains. */
export interface AssetBundle {
  id: string;
  system: BodySystem;
  url: string;
  sizeBytes: number;
  meshCount: number;
  /** Mesh names (= fmaIds) inside the GLB, for lookup without parsing the file. */
  meshes: string[];
  /** Content hash to bust CDN cache on re-export. */
  hash: string;
}
