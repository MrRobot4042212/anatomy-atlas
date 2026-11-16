"""Check out/zones.json against reference structures and report the distribution.

    python scripts/check_zones.py [--zones out/zones.json] [--mapping out/mapping.json]

Fails (exit 1) when a reference structure lands in another zone, when a mesh with geometry has
no zone or a zone outside BODY_ZONES (read from packages/shared, so the vocabulary cannot drift),
or when a zone holds fewer than MIN_PER_ZONE meshes. Prints meshes per zone per body system.
References are TA2 keys; a sided key is checked on both sides.
"""

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

MIN_PER_ZONE = 3
SHARED_ANATOMY = Path(__file__).resolve().parents[3] / "packages" / "shared" / "src" / "anatomy.ts"

# (key, expected zone, label). Sided keys have no suffix here; both -l and -r are checked.
REFERENCES = [
    ("ta2-520", "head", "frontal bone"),
    ("ta2-504", "head", "parietal bone"),
    ("ta2-552", "head", "occipital bone"),
    ("ta2-835", "head", "mandible"),
    ("ta2-2108", "head", "temporalis"),
    ("ta2-5639", "head", "lateral ventricle"),
    ("ta2-5714", "head", "hypothalamus (source bounding box error)"),
    ("ta2-876", "neck", "hyoid bone"),
    ("ta2-967", "neck", "thyroid cartilage"),
    ("ta2-3863", "neck", "thyroid gland"),
    ("ta2-2156", "neck", "sternocleidomastoid"),
    ("ta2-1032-3", "neck", "vertebra C3"),
    ("ta2-1130", "thorax", "manubrium of sternum"),
    ("ta2-1134", "thorax", "body of sternum"),
    ("ta2-1106-7", "thorax", "seventh rib"),
    ("ta2-1114-12", "thorax", "twelfth rib"),
    ("ta2-4022", "thorax", "right atrium"),
    ("ta2-4062", "thorax", "left ventricle"),
    ("ta2-4186", "thorax", "thoracic aorta"),
    ("ta2-3213", "thorax", "trachea"),
    ("ta2-2887", "thorax", "oesophagus"),
    ("ta2-3300", "thorax", "superior lobe of left lung"),
    ("ta2-3293", "thorax", "inferior lobe of right lung"),
    ("ta2-2307", "thorax", "serratus anterior"),
    ("ta2-3023", "abdomen", "liver"),
    ("ta2-3073", "abdomen", "posterior segment of liver (I)"),
    ("ta2-2901", "abdomen", "stomach"),
    ("ta2-3114", "abdomen", "pancreas"),
    ("ta2-5159", "abdomen", "spleen"),
    ("ta2-3358", "abdomen", "kidney"),
    ("ta2-4205", "abdomen", "abdominal aorta"),
    ("ta2-2357", "abdomen", "rectus abdominis"),
    ("ta2-3401", "pelvis", "urinary bladder"),
    ("ta2-3637", "pelvis", "prostate"),
    ("ta2-1071", "pelvis", "sacrum"),
    ("ta2-1307", "pelvis", "hip bone"),
    ("ta2-2598", "pelvis", "gluteus maximus"),
    ("ta2-1059-6", "back", "vertebra T6"),
    ("ta2-1068-3", "back", "vertebra L3"),
    ("ta2-6085", "back", "white matter of spinal cord"),
    ("ta2-2258", "back", "iliocostalis lumborum (erector spinae)"),
    ("ta2-2260", "back", "iliocostalis thoracis (erector spinae)"),
    ("ta2-2263", "back", "longissimus thoracis (erector spinae)"),
    ("ta2-2231", "back", "latissimus dorsi"),
    ("ta2-2227", "back", "descending part of trapezius"),
    ("ta2-1143", "shoulder", "scapula"),
    ("ta2-1168", "shoulder", "clavicle"),
    ("ta2-2453", "shoulder", "clavicular part of deltoid"),
    ("ta2-2454", "shoulder", "acromial part of deltoid"),
    ("ta2-2455", "shoulder", "scapular spinal part of deltoid"),
    ("ta2-2457", "shoulder", "supraspinatus"),
    ("ta2-2458", "shoulder", "infraspinatus"),
    ("ta2-2460", "shoulder", "subscapularis"),
    ("ta2-4616", "shoulder", "axillary artery"),
    ("ta2-1180", "arm", "humerus"),
    ("ta2-2465", "arm", "long head of biceps brachii"),
    ("ta2-2466", "arm", "short head of biceps brachii"),
    ("ta2-2469", "arm", "brachialis"),
    ("ta2-2473", "arm", "lateral head of triceps brachii"),
    ("ta2-4632", "arm", "brachial artery"),
    ("ta2-1210", "forearm", "radius"),
    ("ta2-1230", "forearm", "ulna"),
    ("ta2-2479", "forearm", "superficial head of pronator teres"),
    ("ta2-2485", "forearm", "ulnar head of flexor carpi ulnaris"),
    ("ta2-2509", "forearm", "ulnar head of extensor carpi ulnaris"),
    ("ta2-4655", "forearm", "ulnar artery"),
    ("ta2-1250", "hand", "scaphoid"),
    ("ta2-1252", "hand", "lunate"),
    ("ta2-1259", "hand", "hamate"),
    ("ta2-1265-1", "hand", "first metacarpal"),
    ("ta2-1269", "hand", "third metacarpal"),
    ("ta2-1360", "thigh", "femur"),
    ("ta2-2610", "thigh", "sartorius"),
    ("ta2-2614", "thigh", "rectus femoris"),
    ("ta2-2618", "thigh", "vastus lateralis"),
    ("ta2-2630", "thigh", "adductor magnus"),
    ("ta2-4674", "thigh", "femoral artery"),
    ("ta2-1397", "leg", "tibia"),
    ("ta2-1427", "leg", "fibula"),
    ("ta2-2644", "leg", "tibialis anterior"),
    ("ta2-2658", "leg", "lateral head of gastrocnemius"),
    ("ta2-2660", "leg", "soleus"),
    ("ta2-4727", "leg", "fibular artery"),
    ("ta2-1468", "foot", "calcaneus"),
    ("ta2-1448", "foot", "talus"),
    ("ta2-1486", "foot", "medial cuneiform"),
    ("ta2-1500", "foot", "first metatarsal"),
]


def body_zones():
    text = SHARED_ANATOMY.read_text(encoding="utf-8")
    match = re.search(r"BODY_ZONES = \[(.*?)\] as const", text, re.S)
    if not match:
        sys.exit(f"BODY_ZONES not found in {SHARED_ANATOMY}")
    return re.findall(r"'([a-z-]+)'", match.group(1))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--zones", default="out/zones.json")
    ap.add_argument("--mapping", default="out/mapping.json")
    args = ap.parse_args()

    zones = json.load(open(args.zones, encoding="utf-8"))
    structures = json.load(open(args.mapping, encoding="utf-8"))["structures"]
    vocabulary = body_zones()
    failures = []

    meshes = {s["meshId"]: s for s in structures if s["meshId"] and s["hasGeometry"]}
    missing = sorted(set(meshes) - set(zones))
    extra = sorted(set(zones) - set(meshes))
    unknown = sorted({z for z in zones.values() if z not in vocabulary})
    if missing:
        failures.append(f"{len(missing)} meshes without a zone, e.g. {missing[:5]}")
    if extra:
        failures.append(f"{len(extra)} zones for meshes not in the mapping, e.g. {extra[:5]}")
    if unknown:
        failures.append(f"zones outside BODY_ZONES: {unknown}")

    checked = 0
    for key, expected, label in REFERENCES:
        ids = [key] if key in meshes else [f"{key}-l", f"{key}-r"]
        for mesh_id in ids:
            got = zones.get(mesh_id)
            if mesh_id not in meshes:
                failures.append(f"reference {mesh_id} ({label}) is not a mesh in the mapping")
                continue
            checked += 1
            ok = got == expected
            if not ok:
                failures.append(f"{mesh_id} ({label}): expected {expected}, got {got}")
            print(f"{'ok  ' if ok else 'FAIL'} {mesh_id:<16} {label:<42} {got}")

    per_system = defaultdict(Counter)
    for mesh_id, zone in zones.items():
        if mesh_id in meshes:
            per_system[meshes[mesh_id]["system"]][zone] += 1
    systems = sorted(per_system)
    print()
    print(f"{'zone':<9}" + "".join(f"{s[:7]:>8}" for s in systems) + f"{'total':>8}")
    totals = Counter(zones.values())
    for zone in vocabulary:
        row = "".join(f"{per_system[s][zone] or '.':>8}" for s in systems)
        print(f"{zone:<9}{row}{totals[zone]:>8}")
    print(f"{'total':<9}" + "".join(f"{sum(per_system[s].values()):>8}" for s in systems) + f"{len(zones):>8}")

    thin = [z for z in vocabulary if totals[z] < MIN_PER_ZONE]
    if thin:
        failures.append(f"zones with fewer than {MIN_PER_ZONE} meshes: {thin}")

    print()
    if failures:
        print("\n".join(f"FAIL {f}" for f in failures))
        sys.exit(f"{len(failures)} check(s) failed")
    print(f"all {checked} reference meshes in their zone; every one of {len(zones)} meshes has exactly one zone")


if __name__ == "__main__":
    main()
