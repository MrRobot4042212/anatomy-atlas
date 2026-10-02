"""Dump every object and the collection tree of a .blend to JSON for offline analysis.

    blender -b <file.blend> -P blender/dump_objects.py -- --json out/objects.json

Per object: name, type, data name, vertex count (meshes), collections it is linked to,
world-space bounds, and whether it has curve geometry (bevel) so the exporter knows what
needs conversion to mesh.
"""

import argparse
import json
import sys

import bpy
from mathutils import Vector


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--json", required=True)
    return p.parse_args(argv)


def bounds(o):
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return {
        "min": [round(min(p[i] for p in pts), 4) for i in range(3)],
        "max": [round(max(p[i] for p in pts), 4) for i in range(3)],
    }


def collection_tree(col, parent_name):
    return {
        "name": col.name,
        "parent": parent_name,
        "objects": [o.name for o in col.objects],
        "children": [collection_tree(c, col.name) for c in col.children],
    }


def main():
    args = parse_args()
    scene = bpy.context.scene
    objects = []
    for o in bpy.data.objects:
        entry = {
            "name": o.name,
            "type": o.type,
            "data": o.data.name if o.data else None,
            "collections": [c.name for c in o.users_collection],
            "parent": o.parent.name if o.parent else None,
            "hide_viewport": o.hide_viewport,
            "hide_render": o.hide_render,
        }
        if o.type == "MESH":
            entry["verts"] = len(o.data.vertices)
            entry["bounds"] = bounds(o)
            entry["modifiers"] = [m.type for m in o.modifiers]
        elif o.type == "CURVE":
            entry["bevel_depth"] = o.data.bevel_depth
            entry["bevel_object"] = o.data.bevel_object.name if o.data.bevel_object else None
            entry["splines"] = len(o.data.splines)
            entry["bounds"] = bounds(o)
            entry["modifiers"] = [m.type for m in o.modifiers]
        elif o.type == "FONT":
            try:
                entry["body"] = o.data.body
            except UnicodeDecodeError:
                entry["body"] = None
        objects.append(entry)

    tree = [collection_tree(c, None) for c in scene.collection.children]

    with open(args.json, "w", encoding="utf-8") as f:
        json.dump({"objects": objects, "collections": tree}, f, ensure_ascii=False)
    print(f"Wrote {args.json}: {len(objects)} objects")


if __name__ == "__main__":
    main()
