# Catalog API conventions

Location: `apps/api/src/`. NestJS 12, ESM (`.js` suffix on relative imports), vitest, oxlint.

## Modules

- `prisma/`: `PrismaModule` (global) exposing `PrismaService` (extends `PrismaClient`,
  connects in `onModuleInit`).
- `structures/`: `GET /api/structures` (search + filters, paginated),
  `GET /api/structures/:meshId`, `GET /api/structures/:meshId/children`,
  `GET /api/structures/tree?system=` (recursive CTE, returns `StructureTreeNode[]`).
- `assets/`: `GET /api/assets` (bundle manifest for the viewer), `GET /api/assets/:id`.
- Later: `auth/`, `users/`, `progress/`, `quiz/`.

## Rules

- Controllers only parse/validate and delegate. Services hold logic. One service per module.
- DTOs in `dto/` with class-validator decorators. Response types import from `@atlas/shared`;
  map Prisma rows to shared types in the service (`toStructure(row)`), never return raw rows.
- Prisma client is generated into `src/generated/prisma` (git-ignored). Run
  `pnpm --filter api prisma:generate` after changing the schema; migrations via `prisma migrate dev`.
- Enums in `schema.prisma` must match `packages/shared/src/anatomy.ts`. Region uses snake_case
  in Prisma (`upper_limb`) and kebab-case in shared (`upper-limb`); convert in the mapper.
- Search: Postgres full-text over the three name columns with `unaccent`; add the extension in
  the first migration. Escalate to Meilisearch only with measured p95 latency above 100 ms.
- Seed reads `tools/asset-pipeline/out/manifest.json`; it must be idempotent (`upsert` by `meshId`).
- Tests: unit tests for services with a mocked `PrismaService`; e2e for each controller.
