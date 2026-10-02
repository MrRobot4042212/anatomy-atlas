# ADR 0003: Catalog storage and asset delivery

Date: 2026-10-03
Status: accepted

## Context

The API must answer: which structures exist, how they nest, how to find one by name in three
languages, and where its mesh lives. Mesh bundles are tens of megabytes each and must not go
through the API process.

## Decision

- PostgreSQL with Prisma. One `Structure` table with a self-referencing `parentId` and one
  `AssetBundle` table. Hierarchy queries via recursive CTE; search via Postgres full-text with
  `unaccent`.
- GLB bundles are served from object storage behind a CDN (local dev: `apps/web/public/models`).
  The API stores URL, size, mesh list and content hash only.
- Prisma over TypeORM: generated types match `@atlas/shared` more naturally and migrations are
  simpler to review. The owner's familiarity with Nest is unaffected by the ORM choice.

## Consequences

- Meilisearch or a closure table are deliberately deferred. Trigger to revisit: p95 search latency
  above 100 ms, or tree queries deeper than ~12 levels becoming slow.
- Enums are duplicated between `schema.prisma` and `packages/shared`; a test should assert they
  match once the API has its first module.
