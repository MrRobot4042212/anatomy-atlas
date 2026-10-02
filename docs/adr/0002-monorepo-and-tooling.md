# ADR 0002: Monorepo with pnpm workspaces and Turborepo

Date: 2026-10-03
Status: accepted

## Context

Frontend (Next.js) and backend (NestJS) share domain types (body systems, structure shape, asset
manifest). The owner wants one repository with the frontend first and the backend added alongside.

## Decision

- pnpm workspaces + Turborepo. Layout: `apps/web`, `apps/api`, `packages/shared`,
  `tools/asset-pipeline`.
- Turborepo over Nx: less ceremony, no generators we would not use, and the task graph is the only
  feature we need.
- Prettier at the root; ESLint stays in `apps/web` (Next preset), oxlint in `apps/api` (Nest 12
  default). Husky + lint-staged format on commit.
- Node 24. Postgres 17 via docker compose for local development.

## Consequences

- `@atlas/shared` is consumed as TypeScript source (no build step); both apps transpile it.
- Adding a new workspace means adding it to `pnpm-workspace.yaml` and, if it has tasks, nothing
  else: `turbo.json` tasks are generic.
