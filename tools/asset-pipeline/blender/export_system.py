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
import zipfile
from pathlib import Path

import bpy

BP3D_ZIP = "raw/bodyparts3d/partof_BP3D_4.0_obj_99.zip"


def mesh_object(name, verts, faces, material_name):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    for poly in mesh.polygons:
        poly.use_smooth = True
    material = bpy.data.materials.get(material_name)
    if material is None:
        sys.exit(f"material {material_name!r} not found in the blend")
    mesh.materials.append(material)
    return bpy.data.objects.new(name, mesh)


def authored_object(root, structure, models):
    """Mesh from a parametric generator in sources/authored (original work, no third-party data)."""
    sys.path.insert(0, str(root / "sources" / "authored"))
    import build  # noqa: E402  (sources/authored/build.py)

    spec = next(m for m in models["models"] if m["blenderName"] == structure["blenderName"])
    verts, faces = build.build(spec["generator"], spec["side"], spec["centre"])
    return mesh_object(structure["meshId"], verts, faces, spec["material"])


def bodyparts3d_object(root, structure, element, registration, replacements):
    """Build a mesh object from a BodyParts3D OBJ (millimetres) in the Z-Anatomy frame (metres).

    z[i] = scale * sign[i] * bp[perm[i]] + shift[i] + organ shift, from
    sources/bodyparts3d/registration.json (scripts/register_bodyparts3d.py). The mesh is read
    straight from the archive, so its provenance is the dataset and not the blend.
    """
    reg = registration
    organ_shift = reg["local"][element]["shift"]
    text = zipfile.ZipFile(root / BP3D_ZIP).read(f"partof_BP3D_4.0_obj_99/{element}.obj").decode()
    verts, faces = [], []
    for line in text.splitlines():
        if line.startswith("v "):
            bp = [float(x) for x in line.split()[1:4]]
            verts.append(tuple(
                reg["scale"] * reg["signs"][i] * bp[reg["perm"][i]] + reg["shift"][i] + organ_shift[i]
                for i in range(3)
            ))
        elif line.startswith("f "):
            faces.append([int(tok.split("/")[0]) - 1 for tok in line.split()[1:]])
    spec = next(r for r in replacements["replacements"] if r["element"] == element)
    return mesh_object(structure["meshId"], verts, faces, spec["material"])


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

    registration = replacements = None
    if any(str(s.get("source", "")).startswith("bodyparts3d:") for s in wanted):
        registration = json.load(open(root / "sources/bodyparts3d/registration.json", encoding="utf-8"))
        replacements = json.load(open(root / "sources/bodyparts3d/replacements.json", encoding="utf-8"))

    models = None
    if any(str(s.get("source", "")).startswith("authored:") for s in wanted):
        models = json.load(open(root / "sources/authored/models.json", encoding="utf-8"))

    export_col = bpy.data.collections.new("EXPORT")
    bpy.context.scene.collection.children.link(export_col)

    missing, exported, curves = [], 0, 0
    for s in wanted:
        source = str(s.get("source", ""))
        if source.startswith("bodyparts3d:"):
            obj = bodyparts3d_object(root, s, source.split(":", 1)[1], registration, replacements)
            export_col.objects.link(obj)
            exported += 1
            continue
        if source.startswith("authored:"):
            export_col.objects.link(authored_object(root, s, models))
            exported += 1
            continue
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
