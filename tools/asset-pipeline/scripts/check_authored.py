"""Self-check of the authored anatomy models: python scripts/check_authored.py

For every model in sources/authored/models.json: the surface is closed and consistently
oriented (each edge is used once in each direction), the signed volume is positive (normals
point out), the bounding box has a plausible size, and left and right are mirror images.
"""

import json
import math
import sys
from collections import Counter

sys.path.insert(0, "sources/authored")
import build  # noqa: E402
from mesh import bounds, signed_volume  # noqa: E402

# plausible bounding-box extents in millimetres, per generator: (min, max) for x, y, z
RANGES = {
    "inner_ear:cochlea": [(5, 10), (5, 11), (5, 10)],
    "inner_ear:vestibule": [(8, 15), (8, 15), (8, 15)],
    "ossicles:malleus": [(2.5, 5.5), (2.0, 5.0), (7.0, 10.0)],
    "ossicles:incus": [(2.5, 6.0), (3.5, 6.5), (5.0, 8.0)],
    "ossicles:stapes": [(3.0, 5.0), (2.5, 4.0), (1.2, 3.5)],
    "renal_pelvis:pelvis": [(30, 50), (12, 28), (60, 80)],
}


def main():
    spec = json.load(open("sources/authored/models.json", encoding="utf-8"))["models"]
    meshes = {}
    failures = 0
    for m in spec:
        verts, faces = build.build(m["generator"], m["side"], m["centre"])
        directed = Counter()
        for a, b, c in faces:
            for e in ((a, b), (b, c), (c, a)):
                directed[e] += 1
        open_edges = sum(1 for (a, b), n in directed.items() if n != 1 or directed.get((b, a), 0) != 1)
        volume = signed_volume(verts, faces)
        lo, hi = bounds(verts)
        ext = [(hi[i] - lo[i]) * 1000 for i in range(3)]
        ok_size = all(RANGES[m["generator"]][i][0] <= ext[i] <= RANGES[m["generator"]][i][1] for i in range(3))
        ok = open_edges == 0 and volume > 0 and ok_size
        failures += 0 if ok else 1
        print(f"{'ok  ' if ok else 'FAIL'} {m['blenderName']:<16} {len(verts):>5} verts {len(faces):>5} tris  open edges {open_edges}  "
              f"volume {volume * 1e9:8.1f} mm3  extent mm {[round(e, 1) for e in ext]}")
        meshes[m["blenderName"]] = (verts, faces, m["centre"])
    for name, (verts, _, centre) in meshes.items():
        if name.endswith(".l"):
            rverts, _, rcentre = meshes[name[:-2] + ".r"]
            lo, hi = bounds(verts)
            rlo, rhi = bounds(rverts)
            err = max(abs((hi[i] - lo[i]) - (rhi[i] - rlo[i])) for i in range(3))
            if err > 1e-9:
                failures += 1
                print(f"FAIL {name} and its right side differ in size by {err * 1000:.3f} mm")
    if failures:
        sys.exit(f"{failures} check(s) failed")
    print("all authored models pass")


if __name__ == "__main__":
    main()
