# Asset pipeline

Turns the Z-Anatomy `Startup.blend` into optimized GLB bundles and the manifest that seeds the
catalog. Full contract and commands: `docs/pipeline.md`, decisions: `docs/adr/0004-ta2-ontology-key.md`.

```
raw/        git-ignored. TA2.csv and the extracted Z-Anatomy template (Startup.blend, 307 MB).
out/        git-ignored. objects.json, mapping.json, raw/<system>.glb, <system>-vN.glb, manifest.json
blender/    Blender-side scripts: inspect_blend.py, dump_objects.py, export_system.py
scripts/    Offline Python: analyze_dump.py, build_mapping.py
src/        Node: optimize.ts (gltf-transform + meshopt), manifest.ts
```

Source: https://github.com/Z-Anatomy/Models-of-human-anatomy (CC BY-SA 4.0).
Download `Z-Anatomy.zip` and `TA2.csv` into `raw/` and extract the zip to `raw/z-anatomy/`.
