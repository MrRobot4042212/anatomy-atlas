"""Find the rigid transform that places BodyParts3D parts (millimetres) in the Z-Anatomy frame
(metres, Blender axes) and write it to sources/bodyparts3d/registration.json.

    python scripts/register_bodyparts3d.py

Reference structures are the ones that exist in both datasets under the same name (liver,
femur.r, ...): the best of the 48 signed axis permutations, with a uniform scale and a
translation, is chosen by least squares on bounding-box centres and extents. The residual
tells how far the two bodies differ, so it is reported, not hidden.
Needs raw/bodyparts3d/partof_BP3D_4.0_obj_99.zip and partof_element_parts.txt (git-ignored).
"""

import itertools
import json
import math
import re
import zipfile
from collections import defaultdict

ZIP = "raw/bodyparts3d/partof_BP3D_4.0_obj_99.zip"
ELEMENTS = "raw/bodyparts3d/partof_element_parts.txt"
MIN_EXTENT_M = 0.03  # ignore tiny references, their bounds are noise
NEIGHBOUR_M = 0.20  # radius of the references used for a local correction


def bp_bounds(zf, element):
    lo = [math.inf] * 3
    hi = [-math.inf] * 3
    for line in zf.read(f"partof_BP3D_4.0_obj_99/{element}.obj").decode().splitlines():
        if line.startswith("v "):
            p = [float(x) for x in line.split()[1:4]]
            for i in range(3):
                lo[i] = min(lo[i], p[i])
                hi[i] = max(hi[i], p[i])
    return lo, hi


def main():
    zf = zipfile.ZipFile(ZIP)
    members = {n.split("/")[-1][:-4] for n in zf.namelist() if n.endswith(".obj")}
    per_concept = defaultdict(list)
    names = {}
    for line in open(ELEMENTS, encoding="utf-8").read().splitlines()[1:]:
        concept, name, element = line.split("\t")[:3]
        per_concept[concept].append(element)
        names[concept] = name

    objects = json.load(open("out/objects.json", encoding="utf-8"))["objects"]
    zana = {o["name"].casefold(): o for o in objects if o["type"] == "MESH" and "bounds" in o}

    pairs = []
    for concept, elements in per_concept.items():
        if len(elements) != 1 or elements[0] not in members:
            continue
        name = names[concept].casefold()
        m = re.match(r"^(right|left) (.+)$", name)
        key = f"{m.group(2)}.{m.group(1)[0]}" if m else name
        o = zana.get(key)
        if not o:
            continue
        lo, hi = bp_bounds(zf, elements[0])
        ext_bp = [hi[i] - lo[i] for i in range(3)]
        zlo, zhi = o["bounds"]["min"], o["bounds"]["max"]
        ext_z = [zhi[i] - zlo[i] for i in range(3)]
        if max(ext_z) < MIN_EXTENT_M:
            continue
        pairs.append({
            "name": names[concept], "element": elements[0], "zname": o["name"],
            "cbp": [(lo[i] + hi[i]) / 2 for i in range(3)], "ebp": ext_bp,
            "cz": [(zlo[i] + zhi[i]) / 2 for i in range(3)], "ez": ext_z,
        })
    print(f"{len(pairs)} reference structures present in both datasets")

    best = None
    for perm in itertools.permutations(range(3)):
        for signs in itertools.product((1, -1), repeat=3):
            # axis i of the Z frame = signs[i] * bp axis perm[i]
            sum_ez = sum(sum(p["ez"]) for p in pairs)
            sum_eb = sum(sum(p["ebp"][perm[i]] for i in range(3)) for p in pairs)
            s = sum_ez / sum_eb
            shift = [0.0] * 3
            for i in range(3):
                shift[i] = sum(p["cz"][i] - s * signs[i] * p["cbp"][perm[i]] for p in pairs) / len(pairs)
            err = 0.0
            for p in pairs:
                for i in range(3):
                    d = p["cz"][i] - (s * signs[i] * p["cbp"][perm[i]] + shift[i])
                    d2 = p["ez"][i] - s * p["ebp"][perm[i]]
                    err += d * d + d2 * d2
            rms = math.sqrt(err / (len(pairs) * 3))
            if best is None or rms < best["rms"]:
                best = {"perm": list(perm), "signs": list(signs), "scale": s, "shift": shift, "rms": rms}

    resid = []
    for p in pairs:
        c = [best["scale"] * best["signs"][i] * p["cbp"][best["perm"][i]] + best["shift"][i] for i in range(3)]
        resid.append((math.dist(c, p["cz"]), p["zname"]))
    resid.sort()
    best["references"] = len(pairs)
    best["median_centre_error_m"] = resid[len(resid) // 2][0]
    best["worst"] = [{"name": n, "centre_error_m": round(d, 4)} for d, n in resid[-5:]]
    # Placement of each replaced organ. Z-Anatomy's own kidney is the same BodyParts3D mesh (same
    # vertex count, same extents), and the vessels and ureters of that body were attached to it,
    # so the organ is translated to its twin's bounding-box centre. Only the position is read.
    # The mean residual of the neighbouring references is reported for comparison.
    local = {}
    spec = json.load(open("sources/bodyparts3d/replacements.json", encoding="utf-8"))
    for rep in spec["replacements"]:
        lo, hi = bp_bounds(zf, rep["element"])
        twin = zana[rep["blenderName"].casefold()]
        verts_bp = sum(1 for l in zf.read(f"partof_BP3D_4.0_obj_99/{rep['element']}.obj").decode().splitlines() if l.startswith("v "))
        if abs(verts_bp - twin["verts"]) > 0.01 * verts_bp:
            raise SystemExit(f"{rep['blenderName']} is not the same mesh as {rep['element']}: {twin['verts']} vs {verts_bp} vertices")
        ext_err = max(abs(best["scale"] * (hi[best["perm"][i]] - lo[best["perm"][i]]) - (twin["bounds"]["max"][i] - twin["bounds"]["min"][i])) for i in range(3))
        if ext_err > 0.004:
            raise SystemExit(f"{rep['blenderName']} extents differ from {rep['element']} by {ext_err * 1000:.1f} mm")
        centre = [best["scale"] * best["signs"][i] * ((lo[best["perm"][i]] + hi[best["perm"][i]]) / 2) + best["shift"][i] for i in range(3)]
        twin_c = [(twin["bounds"]["min"][i] + twin["bounds"]["max"][i]) / 2 for i in range(3)]
        shift = [twin_c[i] - centre[i] for i in range(3)]
        near = [p for p in pairs if p["zname"] != rep["blenderName"] and math.dist(p["cz"], centre) < NEIGHBOUR_M]
        nb = [sum(p["cz"][i] - (best["scale"] * best["signs"][i] * p["cbp"][best["perm"][i]] + best["shift"][i]) for p in near) / len(near) for i in range(3)]
        local[rep["element"]] = {"shift": shift, "method": "twin-centre", "twinVertices": twin["verts"], "vertices": verts_bp,
                                 "neighbourShiftM": nb, "neighbours": len(near)}
        print(f"{rep['element']} {rep['blenderName']}: {verts_bp} vs {twin['verts']} vertices, extents within {ext_err * 1000:.1f} mm, twin shift {[round(x * 100, 2) for x in shift]} cm (neighbours say {[round(x * 100, 2) for x in nb]} cm)")
    best["local"] = local
    out = {"description": "bp3d (mm) -> Z-Anatomy (m): z[i] = scale * signs[i] * bp[perm[i]] + shift[i]", **best}
    with open("sources/bodyparts3d/registration.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)
    print(json.dumps({k: v for k, v in out.items() if k != "description"}, indent=1))


if __name__ == "__main__":
    main()
