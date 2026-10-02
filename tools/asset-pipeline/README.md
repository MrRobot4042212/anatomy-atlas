# Asset pipeline

Turns raw anatomy sources (Z-Anatomy `.blend`) into optimized GLB bundles and the manifest that
seeds the catalog. See `docs/pipeline.md` for the full contract.

```
raw/        git-ignored. Drop the Z-Anatomy .blend here.
out/raw/    git-ignored. Unoptimized glTF per system, straight from Blender.
out/        git-ignored. Optimized GLBs + manifest.json.
blender/    export_system.py (headless Blender export, renames meshes to FMA ids)
data/       label-to-fma.csv (Z-Anatomy label -> FMA id -> names la/en/es)
src/        Node scripts: optimize.ts, manifest.ts
```

Requirements: Blender 4.x on PATH, Node 24, pnpm.

```bash
blender -b raw/z-anatomy.blend -P blender/export_system.py -- --system skeletal
pnpm optimize -- --in out/raw/skeletal.glb --out out/skeletal-v1.glb
pnpm manifest
```
