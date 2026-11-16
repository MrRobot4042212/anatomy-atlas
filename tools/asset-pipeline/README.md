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

`editorial/names.es.json` holds the Spanish names (our own, ADR 0005). `build_mapping.py` reads
them and never the Spanish column of `TA2.csv`. Style guide: `editorial/STYLE.md`.

`sources/bodyparts3d/` re-sources quarantined organs from BodyParts3D (CC BY 4.0): the exporter
builds their mesh from the original OBJ. `scripts/register_bodyparts3d.py` computes the
transform; the archive goes in `raw/bodyparts3d/` (git-ignored).

`sources/authored/` holds parametric models (pure Python, no dependencies) for quarantined
structures that no clean dataset covers; `python scripts/check_authored.py` verifies them.

`licensing/quarantine.json` lists objects withheld from every export because they probably derive
from non-commercial components credited by Z-Anatomy. Edit that file, never the exporter, and
rerun `build_mapping.py`. Policy: `docs/adr/0005-model-licensing-policy.md`.
Download `Z-Anatomy.zip` and `TA2.csv` into `raw/` and extract the zip to `raw/z-anatomy/`.
