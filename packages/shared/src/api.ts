import type { BodyRegion, BodySystem, Structure } from './anatomy.js';

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
  lang?: keyof Structure['names'];
  page?: number;
  pageSize?: number;
}

export interface StructureTreeNode {
  id: string;
  fmaId: string;
  name: string;
  children: StructureTreeNode[];
}
