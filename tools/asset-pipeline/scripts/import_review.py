"""Import an anatomist's review of the Spanish names: python scripts/import_review.py <reviewed.csv> --reviewer "Name"

Reads the review sheet (docs/review/names-es-review.csv, filled in by the reviewer) and updates
editorial/names.es.json:

  decision = ok       the draft is approved as written: status becomes "reviewed"
  decision = change   spanish_final replaces the draft: status becomes "reviewed"
  decision empty      the row is skipped, nothing changes

Every row touched records the reviewer and the date. The script refuses unknown terms, a
"change" without spanish_final, or any other decision, and writes nothing unless the whole file is
valid. It never edits a name that was not decided.
"""

import argparse
import csv
import datetime
import io
import json
import sys

NAMES = "editorial/names.es.json"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("--reviewer", required=True, help="name of the anatomist, recorded in the file")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    doc = json.load(open(NAMES, encoding="utf-8"))
    names = doc["names"]
    today = datetime.date.today().isoformat()
    errors, approved, changed, skipped = [], [], [], 0

    with io.open(args.sheet, encoding="utf-8-sig", newline="") as f:
        for n, row in enumerate(csv.DictReader(f), start=2):
            term = (row.get("termKey") or "").strip()
            decision = (row.get("decision") or "").strip().lower()
            final = (row.get("spanish_final") or "").strip()
            if not decision:
                skipped += 1
                continue
            if term not in names:
                errors.append(f"line {n}: unknown term {term!r}")
            elif decision == "ok":
                approved.append(term)
            elif decision == "change":
                if not final:
                    errors.append(f"line {n}: {term} is a change without spanish_final")
                else:
                    changed.append((term, final))
            else:
                errors.append(f"line {n}: {term} has decision {decision!r}, expected ok or change")

    if errors:
        print("\n".join(errors[:30]))
        sys.exit(f"{len(errors)} problem(s); nothing written")

    for term in approved:
        names[term].update({"status": "reviewed", "reviewer": args.reviewer, "reviewedAt": today})
    for term, final in changed:
        names[term].update({"es": final, "status": "reviewed", "reviewer": args.reviewer, "reviewedAt": today})
    print(f"{len(approved)} approved, {len(changed)} changed, {skipped} not decided")
    print(f"reviewed in total: {sum(1 for n in names.values() if n['status'] == 'reviewed')} of {len(names)}")
    if not args.dry_run:
        with open(NAMES, "w", encoding="utf-8", newline="\n") as f:
            f.write(json.dumps(doc, ensure_ascii=False, indent=1))
        print("written to " + NAMES + "; rebuild with build_mapping.py (add --es-min-status reviewed to ship only approved names)")


if __name__ == "__main__":
    main()
