# Anatomy Atlas

Interactive 3D human anatomy platform. A full-body model with every organ, bone, muscle, vessel and
nerve as a selectable structure, filterable by body system and region, with a multilingual
anatomical catalog behind it.

## Stack

- `apps/web`: Next.js 16, React Three Fiber, Tailwind v4
- `apps/api`: NestJS 12, Prisma, PostgreSQL
- `packages/shared`: domain types shared by both
- `tools/asset-pipeline`: Blender + gltf-transform scripts that produce the GLB bundles

## Getting started

```bash
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:up
pnpm db:migrate
pnpm dev
```

Web runs on http://localhost:3000, API on http://localhost:3001/api.

## Model credits

3D anatomy models derived from [Z-Anatomy](https://www.z-anatomy.com/) (CC BY-SA 4.0), itself
derived from [BodyParts3D](https://lifesciencedb.jp/bp3d/) by DBCLS (CC BY-SA 2.1 JP).
Derived models in this project are distributed under CC BY-SA 4.0.

## Docs

- [Roadmap](docs/ROADMAP.md)
- [Architecture decisions](docs/adr/)
