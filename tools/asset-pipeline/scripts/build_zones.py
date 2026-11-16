"""Derive one body zone per mesh from its geometry: out/zones.json (meshId -> BodyZone).

    python scripts/build_zones.py [--objects out/objects.json] [--mapping out/mapping.json] [--out out/zones.json]

Frame (objects.json, Blender): metres, +z up, origin on the floor between the feet, +x is the
body's left, -y is anterior. A mesh is placed by the centre of its bounding box. Every boundary
comes from named bones in the same data (looked up by TA2 key, never by a fixed number), so a
re-registered model moves its boundaries with it. Limbs use the bones of their own side; the side
of a mesh is the sign of its centre x (the geometry, not the name suffix, decides where it is).

Landmarks:
  head/neck      oblique plane from the lowest point of the mandible (anterior) to the base of
                 the skull (lowest point of the occipital bone) at the depth of the atlas
  neck/thorax    superior thoracic aperture: oblique plane from the jugular notch (top of the
                 manubrium, anterior) to the top of T1 at the depth of its centre
  thorax/abdomen horizontal plane at the centre of T10 (the oesophageal hiatus)
  abdomen/pelvis pelvic inlet: oblique plane from the top of the pubic symphysis to the top of
                 the sacrum (promontory)
  hip            lowest point of the hip bone (ischial tuberosity), per side
  knee, ankle    halfway between femur and tibia, between the tibia and the top of the talus
  shoulder/arm   the upper quarter of the humerus (head, tubercles, surgical neck) is shoulder
  elbow, wrist   halfway between humerus and radius, between the radius and the top of the scaphoid
  limb x         above the elbow the limb starts halfway between the rib cage and the humerus;
                 below it, halfway between the femur and the forearm bones (a hand hangs beside
                 the thigh)
  rib cage       per height, an ellipse whose half-width and depth are interpolated between the
                 centres of the ribs (the bones' lateral extremes sit near their centre height)
  column         per height, the box of the thoracic and lumbar vertebrae, interpolated

Rules, first match wins:
  1. the thoracic skeleton (TA2 "Thoracic skeleton": ribs, costal cartilages, sternum) is thorax
     and the bones of the pectoral girdle (clavicle, scapula) are shoulder: these bars wrap a
     cavity or the trunk, so their centres fall in the abdomen, the back or the rib cage.
  2. parts of a visceral organ (liver segments, lobes) take the zone of the nearest ancestor that
     has geometry: an organ is shown whole.
  3. above the head/neck plane: head.
  4. lateral to the trunk (limb x) and below the shoulder/arm line: arm above the elbow, forearm
     above the wrist, hand below. A muscle that crosses a joint goes to the zone of its centre.
  5. below the hip line: pelvis within the perineal band (medial to the femoral head), else
     thigh above the knee, leg above the ankle, foot below.
  6. above the superior thoracic aperture: neck (the nuchal region is neck, not back).
  7. above the pelvic inlet, within the vertebral bodies and canal (the middle 40 % of the
     column's width, behind its front plus a tenth of its depth, so the aorta and the ureters
     lying on it stay in front), or a muscle of the TA2 "Dorsal part of muscular system" (the
     paravertebral gutter lies inside the rib cage ellipse, so geometry alone cannot place it):
     back.
  8. lateral to the trunk above the shoulder/arm line, or outside the rib cage within the box of
     the clavicle or of the scapula: shoulder.
  9. outside the rib cage: above the clavicle, neck (root of the neck: the brachial plexus
     trunks); behind the centre of the column and above the pelvic inlet, back.
 10. above T10: thorax; above the pelvic inlet: abdomen; else pelvis.

Viscera (digestive, respiratory, urinary, reproductive, endocrine) are never back: the kidneys and
the colon lie against the posterior wall but belong to the cavity in front of it.

GEOMETRY_ERRORS overrides the few meshes whose dumped bounding box is wrong in the source (stray
vertices the exporter drops); each entry names the evidence.

Every mesh with geometry gets exactly one zone; the script fails if a landmark is missing or a
mesh has no bounds. Deterministic: same inputs, same output (keys sorted).
"""

import argparse
import json
import sys
from collections import Counter, defaultdict

ZONES = (
    "head", "neck", "thorax", "abdomen", "pelvis", "back",
    "shoulder", "arm", "forearm", "hand", "thigh", "leg", "foot",
)

# Landmark structures by TA2 key (stable ids, ADR 0004). Sided ones get "-l"/"-r".
MANDIBLE = "ta2-835"
OCCIPITAL = "ta2-552"
ATLAS = "ta2-1038"
MANUBRIUM = "ta2-1130"
T1 = "ta2-1063-1"
T10 = "ta2-1065-10"
SACRUM = "ta2-1071"
PUBIC_SYMPHYSIS = "ta2-1855"
SIDED = {
    "hip": "ta2-1307",
    "femur": "ta2-1360",
    "tibia": "ta2-1397",
    "talus": "ta2-1448",
    "clavicle": "ta2-1168",
    "scapula": "ta2-1143",
    "humerus": "ta2-1180",
    "radius": "ta2-1210",
    "ulna": "ta2-1230",
    "scaphoid": "ta2-1250",
}
# Subtrees used as anchors (rules 1 and 7) and as the sources of the rib cage and the column.
THORACIC_SKELETON = "ta2-1096"
PECTORAL_GIRDLE = "ta2-1142"
RIBS = "ta2-1105"
THORACIC_VERTEBRAE = "ta2-1058"
LUMBAR_VERTEBRAE = "ta2-1067"
DORSAL_MUSCLES = "ta2-2224"
VISCERAL_SYSTEMS = {"digestive", "respiratory", "urinary", "reproductive", "endocrine"}

GEOMETRY_ERRORS = {
    # objects.json spans z 1.148..1.624 (stray vertices down to the thorax); the exported mesh
    # spans 1.604..1.624, inside the diencephalon.
    "ta2-5714": "head",
}


def centre(b):
    return [(b["min"][i] + b["max"][i]) / 2 for i in range(3)]


def half_width(b):
    return max(abs(b["min"][0]), abs(b["max"][0]))


def lerp_plane(anterior, posterior, y):
    """Height of an oblique plane at depth y, from two (y, z) points; flat beyond them."""
    (ya, za), (yp, zp) = anterior, posterior
    t = min(1.0, max(0.0, (y - ya) / (yp - ya)))
    return za + t * (zp - za)


def interpolate(profile, z):
    """Linear interpolation of (z, values...) rows sorted by z; None outside the profile."""
    if z < profile[0][0] or z > profile[-1][0]:
        return None
    for lo, hi in zip(profile, profile[1:]):
        if lo[0] <= z <= hi[0]:
            t = 0.0 if hi[0] == lo[0] else (z - lo[0]) / (hi[0] - lo[0])
            return [a + t * (b - a) for a, b in zip(lo[1:], hi[1:])]
    return list(profile[-1][1:])


class Body:
    """Landmarks of one model, derived from its bones, and the zone rules that use them."""

    def __init__(self, structures, bounds):
        self.bounds = bounds
        self.by_key = {s["key"]: s for s in structures}
        self.children = defaultdict(list)
        for s in structures:
            self.children[s["parentKey"]].append(s["key"])
        self.mesh_of = {s["key"]: s["meshId"] for s in structures if s["meshId"] and s["meshId"] in bounds}
        self.structure_of = {s["meshId"]: s for s in structures if s["meshId"]}

        mandible, occipital, atlas = self.box(MANDIBLE), self.box(OCCIPITAL), self.box(ATLAS)
        self.head_plane = ((mandible["min"][1], mandible["min"][2]), (centre(atlas)[1], occipital["min"][2]))
        manubrium, t1 = self.box(MANUBRIUM), self.box(T1)
        self.neck_plane = ((manubrium["min"][1], manubrium["max"][2]), (centre(t1)[1], t1["max"][2]))
        self.z_t10 = centre(self.box(T10))[2]
        symphysis, sacrum = self.box(PUBIC_SYMPHYSIS), self.box(SACRUM)
        self.pelvic_inlet = ((symphysis["min"][1], symphysis["max"][2]), (sacrum["min"][1], sacrum["max"][2]))

        ribs = [self.box(k) for k in self.mesh_keys(RIBS)]
        if not ribs:
            sys.exit("no ribs with geometry: the rib cage cannot be built")
        self.cage_x = max(half_width(r) for r in ribs)
        # one row per rib height: (z, half-width, front, back); left and right ribs coincide
        rows = sorted((centre(r)[2], half_width(r), r["min"][1], r["max"][1]) for r in ribs)
        self.cage = rows
        self.cage_top = max(r["max"][2] for r in ribs)
        self.cage_bottom = min(r["min"][2] for r in ribs)

        self.side = {}
        for suffix in ("l", "r"):
            b = {name: self.box(f"{key}-{suffix}") for name, key in SIDED.items()}
            humerus = b["humerus"]
            length = humerus["max"][2] - humerus["min"][2]
            forearm_medial = min(abs(v) for f in ("radius", "ulna") for v in (b[f]["min"][0], b[f]["max"][0]))
            self.side[suffix] = {
                "hip": b["hip"]["min"][2],
                "knee": (b["femur"]["min"][2] + b["tibia"]["max"][2]) / 2,
                "ankle": (b["tibia"]["min"][2] + b["talus"]["max"][2]) / 2,
                "shoulder": humerus["max"][2] - length / 4,
                "elbow": (humerus["min"][2] + b["radius"]["max"][2]) / 2,
                "wrist": (b["radius"]["min"][2] + b["scaphoid"]["max"][2]) / 2,
                # the femoral head is the medial limit of the thigh
                "perineum": min(abs(b["femur"]["min"][0]), abs(b["femur"]["max"][0])),
                "arm_x": (self.cage_x + min(abs(humerus["min"][0]), abs(humerus["max"][0]))) / 2,
                "forearm_x": (half_width(b["femur"]) + forearm_medial) / 2,
                "girdle": (b["clavicle"], b["scapula"]),
            }

        column = [self.box(k) for k in self.mesh_keys(THORACIC_VERTEBRAE) + self.mesh_keys(LUMBAR_VERTEBRAE)]
        self.column = sorted(
            (centre(v)[2], (v["max"][0] - v["min"][0]) / 2, v["min"][1], v["max"][1]) for v in column
        )
        self.anchors = {}
        for mesh_id in self.mesh_ids(THORACIC_SKELETON):
            self.anchors[mesh_id] = "thorax"
        for mesh_id in self.mesh_ids(PECTORAL_GIRDLE):
            self.anchors[mesh_id] = "shoulder"
        self.dorsal_muscles = set(self.mesh_ids(DORSAL_MUSCLES))

    def box(self, key):
        mesh_id = self.mesh_of.get(key)
        if not mesh_id:
            sys.exit(f"landmark {key} has no geometry in the mapping")
        return self.bounds[mesh_id]

    def descendants(self, key):
        out, stack = [], [key]
        while stack:
            k = stack.pop()
            out.append(k)
            stack.extend(self.children.get(k, []))
        return out

    def mesh_keys(self, key):
        return [k for k in self.descendants(key) if k in self.mesh_of]

    def mesh_ids(self, key):
        return [self.mesh_of[k] for k in self.mesh_keys(key)]

    def cage_contains(self, x, y, z):
        """Inside the rib cage ellipse at this height (outside above or below the ribs)."""
        if z < self.cage_bottom or z > self.cage_top:
            return False
        rows = self.cage
        # beyond the highest or lowest rib centre, that rib's section holds until its edge
        clamped = min(max(z, rows[0][0]), rows[-1][0])
        half_w, front, back = interpolate(rows, clamped)
        yc, half_d = (front + back) / 2, (back - front) / 2
        return (x / half_w) ** 2 + ((y - yc) / half_d) ** 2 <= 1

    def in_column(self, x, y, z):
        """Within the vertebral bodies and canal at this height (not the transverse processes)."""
        rows = self.column
        clamped = min(max(z, rows[0][0]), rows[-1][0])
        half_w, front, back = interpolate(rows, clamped)
        return abs(x) <= 0.4 * half_w and y >= front + (back - front) / 10

    def column_centre_y(self, z):
        rows = self.column
        _, front, back = interpolate(rows, min(max(z, rows[0][0]), rows[-1][0]))
        return (front + back) / 2

    def organ_ancestor(self, mesh_id):
        """Nearest ancestor with geometry of a visceral structure, if any."""
        s = self.structure_of[mesh_id]
        if s["system"] not in VISCERAL_SYSTEMS:
            return None
        key = s["parentKey"]
        while key and key in self.by_key:
            parent = self.by_key[key]
            if parent["system"] not in VISCERAL_SYSTEMS:
                return None
            if key in self.mesh_of:
                return self.mesh_of[key]
            key = parent["parentKey"]
        return None

    def zone(self, mesh_id):
        if mesh_id in GEOMETRY_ERRORS:
            return GEOMETRY_ERRORS[mesh_id]
        if mesh_id in self.anchors:
            return self.anchors[mesh_id]
        organ = self.organ_ancestor(mesh_id)
        if organ:
            return self.zone(organ)
        system = self.structure_of[mesh_id]["system"]
        return self.zone_at(
            *centre(self.bounds[mesh_id]),
            dorsal=mesh_id in self.dorsal_muscles,
            visceral=system in VISCERAL_SYSTEMS,
        )

    def zone_at(self, x, y, z, dorsal=False, visceral=False):
        s = self.side["l" if x >= 0 else "r"]
        ax = abs(x)

        if z > lerp_plane(*self.head_plane, y):
            return "head"
        limb_x = s["arm_x"] if z >= s["elbow"] else s["forearm_x"]
        if ax >= limb_x and z < s["shoulder"]:
            if z >= s["elbow"]:
                return "arm"
            return "forearm" if z >= s["wrist"] else "hand"
        if z < s["hip"]:
            if ax < s["perineum"]:
                return "pelvis"
            if z >= s["knee"]:
                return "thigh"
            return "leg" if z >= s["ankle"] else "foot"
        if z > lerp_plane(*self.neck_plane, y):
            return "neck"
        above_inlet = z > lerp_plane(*self.pelvic_inlet, y)
        if above_inlet and not visceral and (dorsal or self.in_column(x, y, z)):
            return "back"
        if ax >= s["arm_x"] and z >= s["shoulder"]:
            return "shoulder"
        g = s["girdle"]
        in_cage = self.cage_contains(x, y, z)
        if not in_cage:
            if any(b["min"][0] <= x <= b["max"][0] and b["min"][1] <= y <= b["max"][1]
                   and b["min"][2] <= z <= b["max"][2] for b in g):
                return "shoulder"
            if z > max(b["max"][2] for b in g):
                return "neck"
            if above_inlet and not visceral and y > self.column_centre_y(z):
                return "back"
        if z >= self.z_t10:
            return "thorax"
        return "abdomen" if above_inlet else "pelvis"

    def landmarks(self):
        out = {
            "headPlane": self.head_plane,
            "neckPlane": self.neck_plane,
            "thoraxAbdomenZ": self.z_t10,
            "pelvicInlet": self.pelvic_inlet,
        }
        for suffix, s in self.side.items():
            out[suffix] = {k: v for k, v in s.items() if k != "girdle"}
        return rounded(out)


def rounded(value):
    if isinstance(value, float):
        return round(value, 4)
    if isinstance(value, dict):
        return {k: rounded(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [rounded(v) for v in value]
    return value


def load_bounds(objects_path, mapping_path):
    objects = json.load(open(objects_path, encoding="utf-8"))["objects"]
    structures = json.load(open(mapping_path, encoding="utf-8"))["structures"]
    by_name = {o["name"]: o for o in objects}
    bounds = {}
    for s in structures:
        if not s["meshId"] or not s["hasGeometry"]:
            continue
        obj = by_name.get(s["blenderName"])
        if not obj or not obj.get("bounds"):
            sys.exit(f"{s['meshId']} ({s['blenderName']}) has no bounds in {objects_path}")
        bounds[s["meshId"]] = obj["bounds"]
    return structures, bounds


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--objects", default="out/objects.json")
    ap.add_argument("--mapping", default="out/mapping.json")
    ap.add_argument("--out", default="out/zones.json")
    args = ap.parse_args()

    structures, bounds = load_bounds(args.objects, args.mapping)
    body = Body(structures, bounds)
    zones = {mesh_id: body.zone(mesh_id) for mesh_id in sorted(bounds)}
    stray = sorted(set(zones.values()) - set(ZONES))
    if stray:
        sys.exit(f"unknown zones produced: {stray}")

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(zones, f, indent=1, sort_keys=True)
        f.write("\n")

    print("landmarks (m):", json.dumps(body.landmarks()))
    counts = Counter(zones.values())
    print(f"{args.out}: {len(zones)} meshes, " + ", ".join(f"{z} {counts.get(z, 0)}" for z in ZONES))


if __name__ == "__main__":
    main()
