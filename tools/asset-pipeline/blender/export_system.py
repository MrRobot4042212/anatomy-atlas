"""Headless Blender export of one body system from the Z-Anatomy .blend.

    blender -b raw/z-anatomy/Z-Anatomy/Startup.blend -P blender/export_system.py -- --system skeletal [--out out/raw]

Reads out/mapping.json (from scripts/build_mapping.py), collects every object of the requested
system that has geometry, renames it to its meshId, links the set into a fresh EXPORT collection
and writes one GLB. Curves (vessels, nerves) are converted to meshes by the glTF exporter;
modifiers are applied. Nothing outside the mapping is ever exported.
"""

import argparse
import json
import sys
from pathlib import Path

import bpy


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--system", required=True)
    p.add_argument("--mapping", default="out/mapping.json")
    p.add_argument("--out", default="out/raw")
    # Curve tessellation (vessels, nerves). Z-Anatomy ships resolution_u=12, bevel_resolution=4,
    # which is far more than a 0.5 mm tube needs on screen. Lower values cut triangles at the
    # source instead of relying on mesh simplification afterwards.
    p.add_argument("--curve-resolution", type=int, default=None, help="resolution_u per spline segment")
    p.add_argument("--bevel-resolution", type=int, default=None, help="bevel_resolution of round profiles")
    return p.parse_args(argv)


def main():
    args = parse_args()
    root = Path.cwd()
    mapping = json.load(open(root / args.mapping, encoding="utf-8"))
    wanted = [s for s in mapping["structures"] if s["system"] == args.system and s["hasGeometry"]]
    if not wanted:
        sys.exit(f"mapping has no geometry for system {args.system!r}")

    export_col = bpy.data.collections.new("EXPORT")
    bpy.context.scene.collection.children.link(export_col)

    missing, exported, curves = [], 0, 0
    for s in wanted:
        obj = bpy.data.objects.get(s["blenderName"])
        if obj is None:
            missing.append(s["blenderName"])
            continue
        if obj.type == "CURVE":
            curves += 1
            if args.curve_resolution is not None:
                obj.data.resolution_u = args.curve_resolution
            if args.bevel_resolution is not None:
                obj.data.bevel_resolution = args.bevel_resolution
        obj.name = s["meshId"]
        if obj.data is not None:
            obj.data.name = s["meshId"]
        obj.hide_viewport = False
        obj.hide_render = False
        obj.hide_set(False)
        export_col.objects.link(obj)
        exported += 1

    if missing:
        print(f"WARNING {len(missing)} mapped objects not found in the blend:")
        for n in missing[:30]:
            print("  -", n)

    out_dir = root / args.out
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"{args.system}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(out_file),
        export_format="GLB",
        collection="EXPORT",
        use_selection=False,
        use_visible=False,
        use_renderable=False,
        export_apply=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_yup=True,
        export_materials="EXPORT",
        export_texcoords=False,
        export_skins=False,
        export_morph=False,
    )
    print(
        f"Exported {exported} structures ({curves} curves, resolution_u={args.curve_resolution or 'source'}, "
        f"bevel_resolution={args.bevel_resolution or 'source'}) of system {args.system!r} to {out_file}"
    )


if __name__ == "__main__":
    main()
