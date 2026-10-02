"""Print the structure of a .blend so we can design the export mapping.

    blender -b <file.blend> -P blender/inspect_blend.py -- [--samples 8] [--json out/inspect.json]

Reports scene units and bounds, the collection tree with mesh counts, naming patterns
(suffixes like .l/.r, dots, numbers), custom properties found on objects, and a sample of
object names per collection. Writes a JSON summary when --json is given.
"""

import argparse
import json
import re
import sys
from collections import Counter

import bpy
from mathutils import Vector


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--samples", type=int, default=8)
    p.add_argument("--json", default=None)
    return p.parse_args(argv)


def walk(col, depth, out, samples):
    meshes = [o for o in col.objects if o.type == "MESH"]
    others = Counter(o.type for o in col.objects if o.type != "MESH")
    line = f"{'  ' * depth}{col.name}  [meshes={len(meshes)}"
    if others:
        line += " " + " ".join(f"{k}={v}" for k, v in others.items())
    line += "]"
    print(line)
    for o in meshes[:samples]:
        print(f"{'  ' * depth}   - {o.name}  (data={o.data.name}, verts={len(o.data.vertices)})")
    out.append(
        {
            "name": col.name,
            "depth": depth,
            "meshCount": len(meshes),
            "sample": [o.name for o in meshes[:samples]],
            "children": [c.name for c in col.children],
        }
    )
    for c in col.children:
        walk(c, depth + 1, out, samples)


def main():
    args = parse_args()
    scene = bpy.context.scene
    print(f"Blender {bpy.app.version_string}")
    print(f"File: {bpy.data.filepath}")
    print(f"Units: {scene.unit_settings.system} scale={scene.unit_settings.scale_length}")

    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    print(f"Objects: {len(bpy.data.objects)} total, {len(meshes)} meshes, "
          f"{sum(len(o.data.vertices) for o in meshes):,} vertices")

    lo = Vector((float("inf"),) * 3)
    hi = Vector((float("-inf"),) * 3)
    for o in meshes:
        for corner in o.bound_box:
            w = o.matrix_world @ Vector(corner)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    print(f"World bounds: min={tuple(round(v, 3) for v in lo)} max={tuple(round(v, 3) for v in hi)}")

    patterns = Counter()
    for o in meshes:
        n = o.name
        if re.search(r"\.[lr]$", n, re.I):
            patterns["suffix .l/.r"] += 1
        if re.search(r"\.\d{3}$", n):
            patterns["suffix .NNN (duplicate)"] += 1
        if re.search(r"^\d+", n):
            patterns["starts with number"] += 1
        if ";" in n:
            patterns["contains ;"] += 1
    print("Name patterns:", dict(patterns))

    props = Counter()
    for o in meshes:
        for k in o.keys():
            if not k.startswith("_"):
                props[k] += 1
    print("Custom properties on meshes:", dict(props.most_common(15)))

    print("\nCollections:")
    tree = []
    for col in scene.collection.children:
        walk(col, 0, tree, args.samples)

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "blender": bpy.app.version_string,
                    "file": bpy.data.filepath,
                    "meshCount": len(meshes),
                    "bounds": {"min": list(lo), "max": list(hi)},
                    "namePatterns": patterns,
                    "customProps": props,
                    "collections": tree,
                },
                f,
                indent=2,
                ensure_ascii=False,
            )
        print(f"\nWrote {args.json}")


if __name__ == "__main__":
    main()
