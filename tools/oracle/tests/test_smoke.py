"""M0 smoke test: prove the Python toolchain runs, and test real logic.

A test that only asserts `True` would prove pytest starts but nothing else. So
this exercises the one piece of Python the repository actually has — the
acceptance-coverage checker's parsers — against in-memory fixtures.

That is a genuine M0 concern: the checker guards the plan from round 6 onward,
and a checker whose parsing is wrong would fail loudly in CI for the wrong
reason. Testing it here means a parsing regression is caught by pytest rather
than by a confusing red build.

No PHREEQC, no third-party imports: M4 owns the oracle.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
CHECKER = REPO_ROOT / "tools" / "check_acceptance_coverage.py"


def load_checker():
    """Import tools/check_acceptance_coverage.py as a module.

    It is a script rather than a package member, so it needs loading by path.
    `main()` does not run on import (it is behind `if __name__`).
    """
    spec = importlib.util.spec_from_file_location("check_acceptance_coverage", CHECKER)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def checker():
    return load_checker()


class TestTheCheckerExists:
    def test_tool_is_present(self):
        assert CHECKER.is_file(), f"expected the coverage checker at {CHECKER}"

    def test_it_can_be_imported_without_running(self, checker):
        assert callable(checker.main)


class TestRangeExpansion:
    """`Addresses: AC-S1..AC-S16` must count all 16, not just the endpoints.

    Without expansion the checker reports the interior as unmapped, which is a
    false failure — and a check that cries wolf gets ignored, which is worse
    than no check.
    """

    def test_expands_an_inclusive_range(self, checker):
        got = checker.expand_ranges("Addresses: AC-S1..AC-S3 here")
        assert got == "Addresses: AC-S1 AC-S2 AC-S3 here"

    def test_expands_only_the_matching_letter(self, checker):
        got = checker.expand_ranges("AC-R1..AC-R2")
        assert got == "AC-R1 AC-R2"

    def test_absurd_range_is_left_alone(self, checker):
        """A typo like AC-S1..AC-S9000 must not hang the checker."""
        got = checker.expand_ranges("AC-S1..AC-S9000")
        assert got == "AC-S1..AC-S9000"


class TestDefinitionParsing:
    def test_finds_ids_only_in_table_rows(self, checker):
        text = "| AC-S1 | a criterion |\n\nprose about AC-S2\n\n| AC-R7 | another |"
        found = checker.defined_criteria(text)
        assert set(found) == {"AC-S1", "AC-R7"}, "prose mentions must not count"

    def test_reports_line_numbers(self, checker):
        found = checker.defined_criteria("\n\n| AC-S1 | x |")
        assert found["AC-S1"] == 3


class TestMilestoneSplitting:
    def test_separates_addresses_from_evidence(self, checker):
        plan = (
            "## M0 — first\n**Addresses:** ADR-0001; `SPEC` AC-P1\n\n"
            "### Tests and evidence\n| a test | AC-P5 |\n\n"
            "## M1 — second\n**Addresses:** `SPEC` AC-S1\n"
        )
        sections = checker.milestone_sections(plan)
        claimed_m0, evidenced_m0 = sections["M0"]
        assert claimed_m0 == {"AC-P1"}
        assert evidenced_m0 == {"AC-P5"}, "a test row counts as evidence, not as a claim"
        assert sections["M1"][0] == {"AC-S1"}


class TestTheRealRepositoryIsSelfConsistent:
    """The checker must pass on the repository as committed.

    This is the same assertion CI makes; having it here too means a contributor
    running only `uv run pytest` still learns about a broken SPEC/PLAN mapping.
    """

    def test_coverage_check_passes(self, checker):
        assert checker.main() == 0
