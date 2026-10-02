import type {
  AssetBundle,
  BodySystem,
  Paginated,
  Structure,
  StructureDetail,
  StructureTreeNode,
} from '@atlas/shared';

/**
 * Thin client for the catalog API. Works in Server Components (page-level fetch) and in Client
 * Components (info panel). `NEXT_PUBLIC_API_URL` is inlined at build time for the browser.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, init);
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText} for ${path}`);
  return (await res.json()) as T;
}

export const api = {
  bundles: () => get<AssetBundle[]>('/assets'),
  structure: (meshId: string) => get<StructureDetail>(`/structures/${encodeURIComponent(meshId)}`),
  tree: (system: BodySystem) => get<StructureTreeNode[]>(`/structures/tree?system=${system}`),
  search: (params: { q?: string; system?: BodySystem; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.system) qs.set('system', params.system);
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    return get<Paginated<Structure>>(`/structures?${qs.toString()}`);
  },
};
