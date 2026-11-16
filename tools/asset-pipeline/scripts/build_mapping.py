"""Build out/mapping.json: the single source of truth joining Z-Anatomy objects to catalog rows.

    python scripts/build_mapping.py [--dump out/objects.json] [--ta2 raw/TA2.csv] [--out out/mapping.json]

Implements ADR 0004. For every exportable object (meshes and bevelled curves, excluding labels,
indicator lines, insertion areas and reference geometry) it derives:

  termKey    ta2:<id> from TA2.csv by English name, else za:<slug>
  meshId     <termKey with '-'>[-l|-r]; the mesh name inside the GLB
  system     from the flat numbered collection, else from the Bonus collection group
  subsystem  second level of the Bonus collection path (e.g. "Systemic arteries")
  region     from "Regions of human body > Main divisions > ..." paths
  parentKey  the deepest group node of the same system that contains the object
  names.es   from editorial/names.es.json (our own Spanish names), never from TA2.csv
  excluded   "license:<source>" for objects listed in licensing/quarantine.json: they keep their
             catalog row but lose geometry, so no export or bundle can include them

Group nodes (sub-collections of each system) are emitted as structures without geometry so the
catalog tree is complete. Deterministic: same inputs, same output.
"""

import argparse
import json
import re
import unicodedata
from collections import Counter, defaultdict

LABEL_SUFFIXES = (".r.t", ".l.t", ".st", ".t", ".j", ".g", ".i")
# Modelling helpers that are not anatomical structures: bevel profiles, paths, reference axes.
HELPER_RE = re.compile(r"(-curve|-path|-profile)(\.[lr])?$|^BezierCircle|^(Equator|Meridians|External axis) of eyeball")
INSERTION_RE = re.compile(r"^(.*)\.(o|e)(\d*)([lr])?$")
SIDE_RE = re.compile(r"^(.*)\.([lr])$")
FLAT_RE = re.compile(r"^\d+: (.*)$")

# Bonus collection top group -> BodySystem (None = resolved by the second level)
GROUP_TO_SYSTEM = {
    "Skeletal system": "skeletal",
    "Arthrology": "skeletal",
    "Muscular system": "muscular",
    "Cardiovascular system": "cardiovascular",
    "Nervous system": "nervous",
    "Visceral systems": None,
    "Regions of human body": None,
}
VISCERAL_TO_SYSTEM = {
    "Digestive system": "digestive",
    "Respiratory system": "respiratory",
    "Urinary system": "urinary",
    "Genital systems'": "reproductive",
    "Lymphoid system": "lymphatic",
    "Endocrine glands": "endocrine",
    "Abdominopelvic cavity": "digestive",
    "Thoracic cavity": "respiratory",
}
REGIONS_TO_SYSTEM = {"Integument": "integumentary"}
# Flat numbered collections -> BodySystem (primary system when an object sits in several groups)
FLAT_TO_SYSTEM = {
    "Skeletal system": "skeletal",
    "Joints": "skeletal",
    "Muscular system": "muscular",
    "Cardiovascular system": "cardiovascular",
    "Lymphoid organs": "lymphatic",
    "Nervous system & Sense organs": "nervous",
    "Visceral systems": None,
}
SUBSYSTEM_OVERRIDES = {
    ("skeletal", "Arthrology"): "joints",
    ("cardiovascular", "Heart"): "heart",
    ("cardiovascular", "Cardiac vessels"): "heart",
    ("cardiovascular", "Systemic arteries"): "arteries",
    ("cardiovascular", "Systemic veins"): "veins",
    ("cardiovascular", "Pulmonary vessels"): "pulmonary",
    ("nervous", "Central nervous system"): "central",
    ("nervous", "Peripheral nervous system"): "peripheral",
    ("nervous", "Sense organs"): "sense-organs",
}
# Bonus collection top group that acts as the catalog root of each system
SYSTEM_ROOT = {
    "skeletal": "Skeletal system",
    "muscular": "Muscular system",
    "cardiovascular": "Cardiovascular system",
    "nervous": "Nervous system",
    "lymphatic": "Lymphoid system",
    "digestive": "Digestive system",
    "respiratory": "Respiratory system",
    "urinary": "Urinary system",
    "reproductive": "Genital systems'",
    "endocrine": "Endocrine glands",
    "integumentary": "Integument",
}
REGION_MAP = {
    "Head": "head",
    "Neck": "neck",
    "Thorax": "thorax",
    "Abdomen": "abdomen",
    "Pelvis": "pelvis",
    "Back": "back",
    "Left upper limb": "upper-limb",
    "Right upper limb": "upper-limb",
    "Left hand": "upper-limb",
    "Right hand": "upper-limb",
    "Left lower limb": "lower-limb",
    "Right lower limb": "lower-limb",
    "Left foot": "lower-limb",
    "Right foot": "lower-limb",
}


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return text or "unnamed"


def load_ta2(path):
    terms = {}
    with open(path, encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            if line.startswith('"') and line.endswith('"'):
                line = line[1:-1]
            cells = line.split(";")
            if cells[0] == "TA2ID" or not cells[1].strip():
                continue
            # ids look like "1140" or "1140*5" (fifth instance of a repeated term, e.g. ribs)
            m = re.match(r"^(\d+)(?:\*(\d+))?$", cells[0].strip())
            if not m:
                continue
            ta2_key = m.group(1) + (f"-{m.group(2)}" if m.group(2) else "")
            key = cells[1].strip().casefold()
            terms.setdefault(key, {"ta2Id": int(m.group(1)), "ta2Key": ta2_key, "en": cells[1].strip(),
                                   "la": cells[2].strip(), "es": ""})  # cells[4] is a translation: never read (ADR 0005)
    return terms


def classify(name):
    """Return (base, side, kind) where kind in structure | label | insertion."""
    if HELPER_RE.search(name.rstrip("'")):
        return name, None, "helper"
    for suf in LABEL_SUFFIXES:
        if name.endswith(suf):
            return name[: -len(suf)], None, "label"
    m = INSERTION_RE.match(name)
    if m:
        return m.group(1), m.group(4), "insertion"
    m = SIDE_RE.match(name)
    if m:
        return m.group(1), m.group(2), "structure"
    return name, None, "structure"


def clean_term(base):
    base = base.strip()
    base = re.sub(r"\.\d{3}$", "", base)
    unofficial = base.startswith("(") and base.endswith(")")
    if unofficial:
        base = base[1:-1].strip()
    base = base.rstrip("*'").strip()
    return base, unofficial


def resolve_term(base, terms):
    cleaned, unofficial = clean_term(base)
    hit = terms.get(cleaned.casefold())
    if hit:
        return {"termKey": f"ta2:{hit['ta2Key']}", "ta2Id": hit["ta2Id"],
                "names": {"la": hit["la"], "en": hit["en"], "es": hit["es"]}, "official": True}
    return {"termKey": f"za:{slugify(cleaned)}", "ta2Id": None,
            "names": {"la": "", "en": cleaned, "es": ""}, "official": False}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dump", default="out/objects.json")
    ap.add_argument("--ta2", default="raw/TA2.csv")
    ap.add_argument("--out", default="out/mapping.json")
    ap.add_argument("--quarantine", default="licensing/quarantine.json")
    ap.add_argument("--editorial", default="editorial/names.es.json")
    ap.add_argument("--es-min-status", choices=["draft", "reviewed"], default="draft",
                    help="lowest editorial status accepted for a Spanish name; use 'reviewed' to ship only anatomist-approved names")
    args = ap.parse_args()

    data = json.load(open(args.dump, encoding="utf-8"))
    terms = load_ta2(args.ta2)

    # Collection paths inside Bonus collection: name -> list of ancestor names (root excluded)
    bonus = next(c for c in data["collections"] if c["name"] == "Bonus collection")
    paths = {}

    def walk(node, chain):
        paths[node["name"]] = chain
        for c in node["children"]:
            walk(c, chain + [node["name"]])

    for group in bonus["children"]:
        walk(group, [])

    def system_of_path(path):
        """path = [group, level2, ...]. Returns (system, subsystem) or (None, None)."""
        group = path[0]
        level2 = path[1] if len(path) > 1 else None
        system = GROUP_TO_SYSTEM.get(group, "skip")
        if system == "skip":
            return None, None
        if system is None:
            table = VISCERAL_TO_SYSTEM if group == "Visceral systems" else REGIONS_TO_SYSTEM
            system = table.get(level2)
            if not system:
                return None, None
        sub = SUBSYSTEM_OVERRIDES.get((system, group)) or SUBSYSTEM_OVERRIDES.get((system, level2))
        if not sub and level2 and group != "Visceral systems":
            sub = slugify(level2)
        return system, sub

    def region_of_paths(full_paths):
        best = None
        for p in full_paths:
            if len(p) >= 3 and p[0] == "Regions of human body" and p[1] == "Main divisions":
                for name in reversed(p[2:]):
                    if name in REGION_MAP:
                        if best is None or len(p) > best[1]:
                            best = (REGION_MAP[name], len(p))
                        break
        return best[0] if best else None

    structures = {}  # nodeKey -> structure
    stats = Counter()
    collisions = defaultdict(list)

    def node_key(term_key, side):
        return f"{term_key.replace(':', '-')}-{side}" if side else term_key.replace(":", "-")

    def ensure_group(col_name, system, subsystem, parent_override=None):
        """Emit a group node for a sub-collection and return its node key."""
        term = resolve_term(col_name, terms)
        key = node_key(term["termKey"], None)
        if key not in structures:
            chain = paths.get(col_name, [])
            parent_key = parent_override
            # parent group = nearest ancestor, the system's top group included, so every
            # system has exactly one root node in the catalog tree
            if parent_key is None:
                for anc in reversed(chain):
                    parent_key = ensure_group(anc, system, subsystem)
                    break
            structures[key] = {
                "key": key, "termKey": term["termKey"], "ta2Id": term["ta2Id"], "meshId": None,
                "blenderName": col_name, "objectType": "COLLECTION", "names": term["names"],
                "system": system, "subsystem": subsystem, "region": None, "laterality": "midline",
                "parentKey": parent_key, "hasGeometry": False, "official": term["official"],
            }
            stats["groups"] += 1
        return key

    for o in data["objects"]:
        if o["type"] not in ("MESH", "CURVE"):
            continue
        base, side, kind = classify(o["name"])
        if kind != "structure":
            stats[f"skipped:{kind}"] += 1
            continue
        if o["type"] == "MESH" and o.get("verts", 0) < 3:
            stats["skipped:degenerate"] += 1
            continue

        full_paths = [paths[c] + [c] for c in o["collections"] if c in paths]
        flat = [FLAT_RE.match(c).group(1) for c in o["collections"] if FLAT_RE.match(c)]

        # primary system: flat collection first, then Bonus groups
        system = subsystem = None
        for f in flat:
            s = FLAT_TO_SYSTEM.get(f, "skip")
            if s not in (None, "skip"):
                system = s
                break
        candidates = []
        for p in full_paths:
            s, sub = system_of_path(p)
            if s:
                candidates.append((s, sub, p))
        if system is None and candidates:
            system = candidates[0][0]
        if system is None:
            stats["skipped:no-system"] += 1
            continue
        same_system = [c for c in candidates if c[0] == system]
        deepest = max(same_system, key=lambda c: len(c[2]), default=None)
        if deepest:
            subsystem = deepest[1]
            parent_key = ensure_group(deepest[2][-1], system, subsystem)
        else:
            # Only linked to a region (e.g. "Left hand") and the flat system collection:
            # group it by that region under the system's root so the tree stays navigable.
            root_name = SYSTEM_ROOT.get(system, system)
            root_key = ensure_group(root_name, system, None)
            region_leaf = next(
                (p[-1] for p in full_paths if len(p) >= 3 and p[0] == "Regions of human body" and p[1] == "Main divisions"),
                None,
            )
            parent_key = ensure_group(region_leaf, system, None, parent_override=root_key) if region_leaf else root_key
            stats["parent:region-fallback"] += 1

        term = resolve_term(base, terms)
        laterality = {"l": "left", "r": "right"}.get(side, "midline")
        key = node_key(term["termKey"], side)
        if key in structures and structures[key]["hasGeometry"]:
            # Two objects resolve to the same term+side (e.g. "Central canal" and
            # "Central canal'"). Keep both with an instance index and report it.
            collisions[key].append(o["name"])
            stats["collision"] += 1
            n = 2
            while node_key(f"{term['termKey']}-{n}", side) in structures:
                n += 1
            term = {**term, "termKey": f"{term['termKey']}-{n}"}
            key = node_key(term["termKey"], side)
        existing = structures.get(key)
        structures[key] = {
            "key": key, "termKey": term["termKey"], "ta2Id": term["ta2Id"], "meshId": key,
            "blenderName": o["name"], "objectType": o["type"], "names": term["names"],
            "system": system, "subsystem": subsystem, "region": region_of_paths(full_paths),
            "laterality": laterality,
            "parentKey": existing["parentKey"] if existing else parent_key,
            "hasGeometry": True, "official": term["official"],
        }
        stats["structures"] += 1
        stats["official" if term["official"] else "unofficial"] += 1
        stats[f"system:{system}"] += 1

    # Licence quarantine: keep the catalog row, drop the geometry.
    quarantine = json.load(open(args.quarantine, encoding="utf-8"))
    quarantined = {o["blenderName"]: o["source"] for o in quarantine["objects"]}
    found = set()
    for s in structures.values():
        source = quarantined.get(s["blenderName"])
        if source and s["hasGeometry"]:
            s["hasGeometry"] = False
            s["meshId"] = None
            s["excluded"] = f"license:{source}"
            found.add(s["blenderName"])
            stats["excluded:license"] += 1
    unmatched = sorted(set(quarantined) - found)
    if unmatched:
        raise SystemExit(f"quarantine entries not found in the mapping (typo or blend changed): {unmatched}")

    # Spanish names come only from our editorial file. Every term must be covered.
    editorial = json.load(open(args.editorial, encoding="utf-8"))["names"]
    rank = {"draft": 0, "reviewed": 1}
    missing, below = set(), set()
    for s in structures.values():
        entry = editorial.get(s["termKey"])
        if entry is None:
            missing.add(s["termKey"])
        elif rank[entry["status"]] < rank[args.es_min_status]:
            below.add(s["termKey"])
            s["names"] = {**s["names"], "es": ""}
        else:
            s["names"] = {**s["names"], "es": entry["es"]}
    if missing:
        raise SystemExit(f"editorial file lacks {len(missing)} terms, first: {sorted(missing)[:10]}")
    stats["es:below-min-status"] = len(below)

    # A group that is also a mesh node keeps the mesh; make sure no node is its own parent.
    for s in structures.values():
        if s["parentKey"] == s["key"]:
            s["parentKey"] = None

    out = {
        "source": {"dump": args.dump, "ta2": args.ta2},
        "stats": dict(stats),
        "collisions": dict(collisions),
        "structures": sorted(structures.values(), key=lambda s: s["key"]),
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    print(f"Wrote {args.out}")
    for k, v in sorted(stats.items()):
        print(f"  {k:28} {v}")
    if collisions:
        print(f"  mesh id collisions: {len(collisions)} (first 10)")
        for k, names in list(collisions.items())[:10]:
            print(f"    {k}: {names}")


if __name__ == "__main__":
    main()
