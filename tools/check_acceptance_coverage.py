"""Check that every acceptance criterion in SPEC-0001 is mapped to at least one
milestone in PLAN-0001, that no milestone references a criterion that does not
exist, and that every claimed criterion has evidence attached.

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
All three conditions BLOCK (exit 1). "Mentioned somewhere in the section" is too
weak a bar, and so is a criterion that is named but never evidenced.

    1. UNMAPPED    - defined in SPEC-0001, but no PLAN milestone claims it in an
                     `**Addresses:**` line.
    2. DANGLING    - referenced in PLAN-0001 but not defined in SPEC-0001.
    3. UNEVIDENCED - a milestone claims the criterion in `**Addresses:**` but
                     neither that milestone's test/evidence table nor its stop
                     condition mentions it.

UNEVIDENCED was a warning in the first version of this checker. That contradicts
`CLAUDE.md`: "Each acceptance criterion MUST have a corresponding verification
method." A criterion named in a header with no test behind it is exactly the
"agent claims coverage, nothing verifies it" failure this tool exists to catch,
so it fails the build like the other two.

Usage:
    uv run python tools/check_acceptance_coverage.py
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "docs" / "specs" / "SPEC-0001-world-foundation-acid-base-titration.md"
PLAN = ROOT / "docs" / "plans" / "PLAN-0001-world-foundation-acid-base-titration.md"

AC_RE = re.compile(r"\bAC-[A-Z]\d+\b")
DEF_RE = re.compile(r"^\|\s*(AC-[A-Z]\d+)\s*\|", re.MULTILINE)
MILESTONE_RE = re.compile(r"^## (M\d+)\b.*$", re.MULTILINE)
RANGE_RE = re.compile(r"AC-([A-Z])(\d+)\.\.AC-\1(\d+)")
# The line a milestone uses to declare which criteria it owns.
ADDRESSES_RE = re.compile(r"\*\*Addresses:\*\*[^\n]*", re.IGNORECASE)
# Headings after which a criterion mention counts as evidence.
EVIDENCE_HEAD_RE = re.compile(
    r"^###\s+(Tests and evidence|Stop condition)", re.MULTILINE | re.IGNORECASE
)


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
    return {
        m.group(1): text[: m.start()].count("\n") + 1
        for m in DEF_RE.finditer(text)
    }


def milestone_sections(plan_text):
    """milestone id -> (addressed, evidenced) sets of AC ids."""
    plan_text = expand_ranges(plan_text)
    marks = [(m.start(), m.group(1)) for m in MILESTONE_RE.finditer(plan_text)]
    out = {}
    for i, (pos, mid) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(plan_text)
        body = plan_text[pos:end]

        addressed = set()
        for m in ADDRESSES_RE.finditer(body):
            addressed |= set(AC_RE.findall(m.group(0)))

        evidence_pos = len(body)
        for m in EVIDENCE_HEAD_RE.finditer(body):
            evidence_pos = min(evidence_pos, m.start())
        evidenced = set(AC_RE.findall(body[evidence_pos:]))

        out[mid] = (addressed, evidenced)
    return out


def main():
    defined = defined_criteria(SPEC.read_text(encoding="utf-8"))
    sections = milestone_sections(PLAN.read_text(encoding="utf-8"))

    claimed, evidenced = {}, {}
    for mid, (addressed, ev) in sections.items():
        for ac in addressed:
            claimed.setdefault(ac, []).append(mid)
        for ac in ev:
            evidenced.setdefault(ac, []).append(mid)

    unmapped = sorted(set(defined) - set(claimed), key=_key)
    # NOTE: parentheses are load-bearing. `|` binds LOOSER than `-` for sets,
    # so the unparenthesised form computes claimed | (evidenced - defined) and
    # reports every correctly-defined criterion as dangling.
    dangling = sorted((set(claimed) | set(evidenced)) - set(defined), key=_key)
    # claimed in a milestone whose tests/stop condition never mentions it
    unevidenced = sorted(
        (
            ac for ac, mids in claimed.items()
            if ac in defined and not any(ac in sections[m][1] for m in mids)
        ),
        key=_key,
    )

    print("SPEC-0001 acceptance-criterion coverage across PLAN-0001 milestones")
    print("=" * 74)
    print(f"  defined in SPEC     : {len(defined)}")
    print(f"  claimed in a PLAN ms: {len(claimed)}")
    print(f"  with evidence       : {len(evidenced)}")
    print()

    print("  Per milestone (claimed / evidenced):")
    for mid in sorted(sections, key=lambda s: int(s[1:])):
        a, e = sections[mid]
        print(f"    {mid:<4} claimed {len(a):>3}   evidenced {len(e):>3}")
    print()

    for title, items, detail in (
        ("UNMAPPED", unmapped, lambda ac: f"(SPEC line {defined[ac]})"),
        ("DANGLING", dangling, lambda ac: f"(in {', '.join(claimed.get(ac, []) or evidenced.get(ac, []))})"),
    ):
        if items:
            print(f"  {title} -- blocking:")
            for ac in items:
                print(f"    {ac}   {detail(ac)}")
            print()

    if unevidenced:
        print("  UNEVIDENCED -- blocking. Claimed in an Addresses line, but no test")
        print("  or stop condition in the claiming milestone mentions it:")
        for ac in unevidenced:
            print(f"    {ac}   (claimed by {', '.join(claimed[ac])})")
        print()

    ok = not unmapped and not dangling and not unevidenced
    print("=" * 74)
    print(f"RESULT: {'PASS' if ok else 'FAIL'}  ({len(unmapped)} unmapped, "
          f"{len(dangling)} dangling, {len(unevidenced)} unevidenced)")
    return 0 if ok else 1


def _key(ac):
    return (ac.split("-")[1][0], int(ac.split("-")[1][1:]))


if __name__ == "__main__":
    sys.exit(main())
