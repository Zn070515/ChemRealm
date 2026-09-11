"""Check that every acceptance criterion in SPEC-0001 is mapped to at least one
milestone in PLAN-0001, and that no milestone references a criterion that does
not exist.

WHY THIS EXISTS
---------------
The same defect recurred across four consecutive owner-review rounds: a
criterion was added to the spec, the plan was not updated, and the gap was found
by a human re-reading the documents rather than by a machine. Each time the
agent reported "no dangling references" and was wrong.

Human recollection is not evidence. This is. The check is mechanical, cheap, and
runs in CI from M0 onward.

WHAT IT CHECKS
--------------
1. Every `AC-*` defined in SPEC-0001 appears in at least one PLAN milestone.
2. Every `AC-*` referenced in PLAN-0001 is defined in SPEC-0001.

Exit code 1 on any failure.

Usage:
    py -3.12 tools/check_acceptance_coverage.py
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "docs" / "specs" / "SPEC-0001-world-foundation-acid-base-titration.md"
PLAN = ROOT / "docs" / "plans" / "PLAN-0001-world-foundation-acid-base-titration.md"

# AC-S1, AC-R12, AC-V9, AC-A7, AC-U5, AC-P4, AC-C2, AC-F1, AC-X2
AC_RE = re.compile(r"\bAC-[A-Z]\d+\b")
# A criterion is *defined* by a table row whose first cell is the id.
DEF_RE = re.compile(r"^\|\s*(AC-[A-Z]\d+)\s*\|", re.MULTILINE)
# Milestones are `## M0 — ...` through `## M10 — ...`
MILESTONE_RE = re.compile(r"^## (M\d+)\b.*$", re.MULTILINE)
# Range notation, e.g. `AC-S1..AC-S16`. The plan uses it heavily for readability.
RANGE_RE = re.compile(r"AC-([A-Z])(\d+)\.\.AC-\1(\d+)")


def expand_ranges(text):
    """Rewrite `AC-S1..AC-S16` into the explicit list.

    Without this the check only sees the two endpoints and reports the interior
    as unmapped -- a false failure that would train the reader to ignore it.
    Expanding keeps range notation usable in the plan AND keeps the check honest.
    """
    def repl(m):
        kind, lo, hi = m.group(1), int(m.group(2)), int(m.group(3))
        if hi < lo or hi - lo > 200:
            return m.group(0)
        return " ".join(f"AC-{kind}{i}" for i in range(lo, hi + 1))
    return RANGE_RE.sub(repl, text)


def defined_criteria(text):
    """Ids defined by a table row, with their heading for reporting."""
    out = {}
    for m in DEF_RE.finditer(text):
        out[m.group(1)] = text[: m.start()].count("\n") + 1
    return out


def milestone_map(plan_text):
    """Milestone id -> set of AC ids mentioned anywhere in its section."""
    plan_text = expand_ranges(plan_text)
    marks = [(m.start(), m.group(1)) for m in MILESTONE_RE.finditer(plan_text)]
    if not marks:
        return {}
    sections = {}
    for i, (pos, mid) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(plan_text)
        sections[mid] = sorted(set(AC_RE.findall(plan_text[pos:end])))
    return sections


def main():
    spec_text = SPEC.read_text(encoding="utf-8")
    plan_text = PLAN.read_text(encoding="utf-8")

    defined = defined_criteria(spec_text)
    sections = milestone_map(plan_text)

    mapped = {}
    for mid, ids in sections.items():
        for ac in ids:
            mapped.setdefault(ac, []).append(mid)

    unmapped = sorted(set(defined) - set(mapped), key=_ac_sort_key)
    dangling = sorted(set(mapped) - set(defined), key=_ac_sort_key)

    print("SPEC-0001 acceptance-criterion coverage across PLAN-0001 milestones")
    print("=" * 72)
    print(f"  defined in SPEC : {len(defined)}")
    print(f"  referenced in PLAN: {len(mapped)}")
    print()

    print("  Coverage by milestone:")
    for mid, ids in sorted(sections.items(), key=lambda kv: int(kv[0][1:])):
        print(f"    {mid:<4} {len(ids):>3}  {' '.join(ids) if ids else '(none)'}")
    print()

    if unmapped:
        print("  UNMAPPED — defined in SPEC, absent from every PLAN milestone:")
        for ac in unmapped:
            print(f"    {ac}   (SPEC line {defined[ac]})")
        print()

    if dangling:
        print("  DANGLING — referenced in PLAN, not defined in SPEC:")
        for ac in dangling:
            print(f"    {ac}   (in {', '.join(mapped[ac])})")
        print()

    ok = not unmapped and not dangling
    print("=" * 72)
    print(f"RESULT: {'PASS' if ok else 'FAIL'}"
          f"  ({len(unmapped)} unmapped, {len(dangling)} dangling)")
    return 0 if ok else 1


def _ac_sort_key(ac):
    kind, num = ac.split("-")[1][0], int(ac.split("-")[1][1:])
    return (kind, num)


if __name__ == "__main__":
    sys.exit(main())
