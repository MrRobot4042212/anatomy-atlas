import type { BodyRegion, BodySystem, Laterality, Structure } from './anatomy.js';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StructureSearchQuery {
  q?: string;
  system?: BodySystem;
  region?: BodyRegion;
  page?: number;
  pageSize?: number;
}

/** `GET /api/structures/:meshId`: the structure with its breadcrumb and direct children. */
export interface StructureDetail {
  structure: Structure;
  /** Root first, direct parent last. */
  ancestors: Structure[];
  children: Structure[];
}

/** `GET /api/structures/tree?system=`: lightweight nodes for the hierarchy panel. */
export interface StructureTreeNode {
  id: string;
  termKey: string;
  meshId: string | null;
  name: string;
  laterality: Laterality;
  children: StructureTreeNode[];
}
