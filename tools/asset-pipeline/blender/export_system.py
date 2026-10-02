"""Headless Blender export of one body system from the Z-Anatomy .blend.

    blender -b raw/z-anatomy.blend -P blender/export_system.py -- --system skeletal [--out out/raw]

Finds the collection whose name matches the system (see COLLECTION_MAP), renames every mesh
object to its FMA id using data/label-to-fma.csv, applies transforms, and exports a single glTF
binary with one node per structure. Objects whose label is not in the CSV are reported and
skipped, so the export never produces an unnamed mesh.
"""

import argparse
import csv
import sys
from pathlib import Path

import bpy

# Z-Anatomy collection name -> BodySystem. Adjust after inspecting the .blend outline.
COLLECTION_MAP = {
    "skeletal": ["Skeletal system", "Bones"],
    "muscular": ["Muscular system", "Muscles"],
    "cardiovascular": ["Cardiovascular system", "Heart", "Arteries", "Veins"],
    "nervous": ["Nervous system"],
    "lymphatic": ["Lymphatic system"],
    "digestive": ["Digestive system"],
    "respiratory": ["Respiratory system"],
    "urinary": ["Urinary system"],
    "reproductive": ["Reproductive system"],
    "endocrine": ["Endocrine system"],
    "integumentary": ["Integumentary system", "Skin"],
}


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--system", required=True, choices=COLLECTION_MAP.keys())
    parser.add_argument("--out", default="out/raw")
    parser.add_argument("--names", default="data/label-to-fma.csv")
    return parser.parse_args(argv)


def load_label_map(path: Path) -> dict[str, str]:
    with path.open(newline="", encoding="utf-8") as f:
        return {row["label"]: row["fmaId"] for row in csv.DictReader(f)}


def iter_objects(collection):
    yield from collection.objects
    for child in collection.children:
        yield from iter_objects(child)


def main():
    args = parse_args()
    root = Path(bpy.path.abspath("//")).parent  # tools/asset-pipeline
    label_map = load_label_map(root / args.names)

    collections = [c for c in bpy.data.collections if c.name in COLLECTION_MAP[args.system]]
    if not collections:
        sys.exit(f"No collection found for system {args.system!r}. Edit COLLECTION_MAP.")

    bpy.ops.object.select_all(action="DESELECT")
    skipped: list[str] = []
    exported = 0
    for col in collections:
        for obj in iter_objects(col):
            if obj.type != "MESH":
                continue
            fma = label_map.get(obj.name)
            if not fma:
                skipped.append(obj.name)
                continue
            obj.name = fma
            obj.data.name = fma
            obj.select_set(True)
            exported += 1

    if exported == 0:
        sys.exit("Nothing to export: no object label matched the CSV.")

    out_dir = root / args.out
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"{args.system}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(out_file),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_yup=True,
    )
    print(f"Exported {exported} structures to {out_file}")
    if skipped:
        print(f"Skipped {len(skipped)} objects with no FMA mapping:")
        for name in skipped[:50]:
            print("  -", name)


if __name__ == "__main__":
    main()
