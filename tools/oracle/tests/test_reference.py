"""Validate checked-in REF fixtures with the independent Decimal implementation."""

from __future__ import annotations

import importlib.util
import json
import sys
from decimal import Decimal
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
REFERENCE_DIR = REPO_ROOT / "packages" / "sci" / "test" / "reference"
DERIVATION_PATH = REPO_ROOT / "tools" / "oracle" / "reference" / "derive_acid_base.py"


def load_derivation() -> Any:
    spec = importlib.util.spec_from_file_location("chemrealm_reference_derivation", DERIVATION_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def load_fixture(name: str) -> dict[str, Any]:
    with (REFERENCE_DIR / name).open(encoding="utf-8") as handle:
        value = json.load(handle)
    assert isinstance(value, dict)
    return value


def close(actual: Decimal, expected: object, tolerance: str = "1e-10") -> None:
    difference = abs(actual - Decimal(str(expected)))
    assert difference <= Decimal(tolerance), f"difference {difference} > {tolerance}"


def test_reference_fixture_manifest_is_complete_and_independent() -> None:
    manifest = load_fixture("manifest.json")
    assert manifest["schemaVersion"] == 1
    assert manifest["derivation"]["notGeneratedBy"] == "packages/sci"
    assert manifest["derivation"]["basis"] == "molality"
    assert manifest["fixtures"] == [f"REF-{index}" for index in range(1, 11)]
    for fixture_id in manifest["fixtures"]:
        fixture = load_fixture(f"{fixture_id}.json")
        assert fixture["schemaVersion"] == 1
        assert fixture["id"] == fixture_id
        assert fixture["derivation"]
        assert fixture["tolerance"]["absolute"] > 0
        assert fixture["tolerance"]["chargeResidual"] == 1e-14


def test_decimal_derivation_reproduces_every_checked_in_expected_value() -> None:
    derivation = load_derivation()
    for index in range(1, 11):
        fixture = load_fixture(f"REF-{index}.json")
        result = derivation.solve_case(fixture)
        expected = fixture["expected"]
        close(result.model_ph, expected["modelPh"])
        close(result.ionic_strength, expected["ionicStrengthMolal"])
        for symbol, expected_value in expected["speciesMolality"].items():
            close(result.species[symbol], expected_value)
        close(result.projection["hydrogenIonMolarity"], expected["projection"]["hydrogenIonMolarity"])
        close(
            result.projection["taughtHydrogenIonExponent"],
            expected["projection"]["taughtHydrogenIonExponent"],
        )
        assert set(result.indicator_ratios) == set(expected["indicatorRatios"])
        for indicator_id, expected_value in expected["indicatorRatios"].items():
            close(result.indicator_ratios[indicator_id], expected_value)


def test_tampering_a_reference_expected_value_is_detected_by_independent_derivation() -> None:
    derivation = load_derivation()
    fixture = load_fixture("REF-1.json")
    result = derivation.solve_case(fixture)
    tampered = fixture["expected"]["modelPh"] + 0.1
    assert abs(result.model_ph - Decimal(str(tampered))) > Decimal("1e-10")
