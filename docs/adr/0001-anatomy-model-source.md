# ADR 0001: Anatomy model source

Date: 2026-10-03
Status: accepted

## Context

The platform needs a full-body 3D model with every organ, bone, muscle, vessel and nerve as a
separately selectable structure. Modeling this in-house is years of work. Commercial anatomy packs
(Zygote, TurboSquid bundles) have licenses that forbid distributing meshes over the web and cost
thousands of dollars.

## Decision

Use **Z-Anatomy** (Blender project, CC BY-SA 4.0, derived from BodyParts3D by DBCLS, CC BY-SA 2.1 JP)
as the single model source. Structures are keyed by their FMA (Foundational Model of Anatomy) id,
which also becomes the mesh name in every exported GLB.

## Consequences

- Attribution to Z-Anatomy and BodyParts3D must be visible in the UI.
- Any derived model we publish stays CC BY-SA. The application code is unaffected.
- Mesh quality is adequate for teaching but not photorealistic. If higher fidelity is needed later
  for specific organs, those meshes can be replaced one by one as long as the FMA id is preserved.
- The asset pipeline (`tools/asset-pipeline`) owns the label-to-FMA mapping.
