"""Machine-check the precision metadata for M4 solver identity constants."""

from __future__ import annotations

import json
import math
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
PROVENANCE_PATH = REPO_ROOT / "docs" / "research" / "constants-provenance.json"


def load_provenance() -> dict:
    assert PROVENANCE_PATH.is_file(), f"missing constants provenance: {PROVENANCE_PATH}"
    with PROVENANCE_PATH.open(encoding="utf-8") as handle:
        value = json.load(handle)
    assert isinstance(value, dict)
    return value


def test_every_solver_identity_numeric_has_machine_readable_provenance() -> None:
    document = load_provenance()
    assert document["schemaVersion"] == 1
    assert document["model"] == {
        "id": "acidbase-monoprotic-davies",
        "version": "1.0.0",
    }

    records = document["records"]
    assert isinstance(records, list)
    by_key = {record["key"]: record for record in records}
    assert set(by_key) == {
        "Kw",
        "Ka_HOAc",
        "Davies_A",
        "Davies_b",
        "standardMolality",
        "neutralAcidActivityCoefficient",
        "waterActivity",
        "numericPrecisionSignificantDigits",
        "numericPolicyVersion",
    }

    for record in records:
        assert record["sourceLiteral"].strip()
        assert record["derivation"].strip()
        assert record["citation"].strip()
        assert record["condition"].strip()
        assert math.isfinite(record["canonicalValue"])
        assert isinstance(record["sourceSignificantDigits"], int)
        assert record["sourceSignificantDigits"] > 0
        assert isinstance(record["canonicalSignificantDigits"], int)
        assert record["canonicalSignificantDigits"] > 0
        assert (
            record["canonicalSignificantDigits"]
            <= record["sourceSignificantDigits"]
        )


def test_source_precision_is_explicit_for_the_pinned_water_constant() -> None:
    record = next(
        item for item in load_provenance()["records"] if item["key"] == "Kw"
    )
    assert record["sourceLiteral"] == "1.0e-14"
    assert record["sourceSignificantDigits"] == 2
    assert record["canonicalValue"] == 1e-14
    assert record["canonicalSignificantDigits"] == 2
