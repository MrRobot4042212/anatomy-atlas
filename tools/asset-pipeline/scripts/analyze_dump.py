"""Offline analysis of out/objects.json against raw/TA2.csv.

    python scripts/analyze_dump.py [--dump out/objects.json] [--ta2 raw/TA2.csv]

Answers the questions that drive the export mapping: which objects are real structures,
how many of their names resolve to a TA2 term, where the hierarchy lives, and how
laterality is encoded.
"""

import argparse
import json
import re
from collections import Counter, defaultdict

STRUCTURE_TYPES = {"MESH", "CURVE"}
LABEL_SUFFIXES = (".r.t", ".l.t", ".st", ".t", ".j", ".g")
SKIP_TOP = {"Reference lines, reference planes, movements", "Cross section planes"}


def load_ta2(path):
    rows = {}
    with open(path, encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            if line.startswith('"') and line.endswith('"'):
                line = line[1:-1]
            cells = line.split(";")
            if cells[0] == "TA2ID":
                continue
            rows[cells[0]] = {"en": cells[1].strip(), "la": cells[2].strip(), "es": cells[4].strip()}
    by_en = {}
    for ta2, r in rows.items():
        key = r["en"].casefold()
        if key:
            by_en.setdefault(key, ta2)
    return rows, by_en


def split_name(name):
    """Return (base, laterality, kind). kind: structure | label | group | insertion."""
    for suf in LABEL_SUFFIXES:
        if name.endswith(suf):
            return name[: -len(suf)], None, "group" if suf == ".g" else "label"
    m = re.match(r"^(.*)\.(o|e)(\d*)([lr])?$", name)  # muscle origin/insertion areas
    if m:
        return m.group(1), m.group(4), "insertion"
    m = re.match(r"^(.*)\.([lr])$", name)
    if m:
        return m.group(1), m.group(2), "structure"
    return name, None, "structure"


def normalize(base):
    base = base.strip()
    base = re.sub(r"^\((.*)\)$", r"\1", base)  # "(unofficial name)"
    base = re.sub(r"\.\d{3}$", "", base)  # Blender duplicate suffix
    return base.casefold()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dump", default="out/objects.json")
    ap.add_argument("--ta2", default="raw/TA2.csv")
    args = ap.parse_args()

    data = json.load(open(args.dump, encoding="utf-8"))
    ta2, by_en = load_ta2(args.ta2)
    objects = data["objects"]

    # top-level collection for each collection name
    top_of = {}

    def walk(node, top):
        top_of[node["name"]] = top
        for c in node["children"]:
            walk(c, top)

    for root in data["collections"]:
        walk(root, root["name"])

    kinds = Counter(o["type"] for o in objects)
    print("Object types:", dict(kinds))

    per_top = defaultdict(lambda: Counter())
    unmatched = defaultdict(list)
    lateral = Counter()
    curves_with_bevel = 0
    multi_top = 0
    for o in objects:
        if o["type"] not in STRUCTURE_TYPES:
            continue
        base, side, kind = split_name(o["name"])
        if kind != "structure":
            continue
        tops = {top_of.get(c, c) for c in o["collections"]}
        tops -= SKIP_TOP
        if not tops:
            continue
        if len(tops) > 1:
            multi_top += 1
        if o["type"] == "CURVE" and (o.get("bevel_depth") or o.get("bevel_object")):
            curves_with_bevel += 1
        lateral[side or "m"] += 1
        hit = normalize(base) in by_en
        for t in tops:
            per_top[t]["total"] += 1
            per_top[t]["matched" if hit else "unmatched"] += 1
            if not hit:
                unmatched[t].append(o["name"])

    print(f"\nLaterality (structures): {dict(lateral)}; curves with bevel: {curves_with_bevel}; "
          f"objects linked in >1 top collection: {multi_top}")
    print("\nTA2 name coverage per top-level collection:")
    for t, c in sorted(per_top.items()):
        pct = 100 * c["matched"] / c["total"] if c["total"] else 0
        print(f"  {t:45} total={c['total']:5} matched={c['matched']:5} ({pct:5.1f}%)")
    print("\nSample unmatched names:")
    for t, names in sorted(unmatched.items()):
        print(f"  [{t}] " + " | ".join(names[:8]))

    # hierarchy depth under each top-level collection
    def depth(node):
        return 1 + max((depth(c) for c in node["children"]), default=0)

    print("\nCollection tree depth per root:")
    for root in data["collections"]:
        print(f"  {root['name']:45} depth={depth(root)} children={len(root['children'])}")


if __name__ == "__main__":
    main()
