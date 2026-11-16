## What

<!-- One or two sentences. Link the roadmap item or ADR if there is one. -->

## Why

## Checklist

- [ ] Conventional commit title (`feat(web): ...`, `fix(api): ...`, `chore(pipeline): ...`)
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass locally
- [ ] Viewer change: draw calls / frame time checked in the dev overlay, numbers in the description
- [ ] Schema change: `prisma/schema.prisma` enums still match `packages/shared/src/anatomy.ts`
- [ ] Hard-to-reverse decision recorded as an ADR in `docs/adr/`
- [ ] No raw `.blend`, OBJ or generated GLB committed
