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


def child_fixture(reference_case: dict[str, Any]) -> dict[str, Any]:
    return {"id": reference_case["caseId"], "request": reference_case["request"]}


def log10(value: Decimal) -> Decimal:
    return value.ln() / Decimal(10).ln()


def test_reference_fixture_manifest_is_complete_and_independent() -> None:
    manifest = load_fixture("manifest.json")
    assert manifest["schemaVersion"] == 2
    assert manifest["derivation"]["notGeneratedBy"] == "packages/sci"
    assert manifest["derivation"]["basis"] == "molality"
    assert manifest["fixtures"] == [f"REF-{index}" for index in range(1, 11)]
    assert manifest["oracleFixtures"] == [f"ORACLE-{index}" for index in range(1, 11)]
    assert "ADVERSARIAL-HOAC-DILUTE" in manifest["adversarialFixtures"]
    for fixture_id in manifest["fixtures"]:
        fixture = load_fixture(f"{fixture_id}.json")
        assert fixture["schemaVersion"] == 1
        assert fixture["id"] == fixture_id
        assert fixture["derivation"]
        assert fixture["kind"] in {
            "single",
            "analytic-acid-excess",
            "analytic-base-excess",
            "analytic-half-equivalence",
            "charge-conservation-sweep",
            "molality-molarity-bound",
        }
    assert all(
        load_fixture(f"{fixture_id}.json")["id"] == fixture_id
        for fixture_id in manifest["oracleFixtures"]
    )


def test_decimal_derivation_reproduces_every_checked_in_expected_value() -> None:
    derivation = load_derivation()
    for index in range(1, 11):
        fixture = load_fixture(f"REF-{index}.json")
        kind = fixture["kind"]
        if kind == "single":
            result = derivation.solve_case(fixture)
            expected = fixture["expected"]
            close(result.model_ph, expected["modelPh"])
            close(result.ionic_strength, expected["ionicStrengthMolal"])
            for symbol, expected_value in expected["speciesMolality"].items():
                close(result.species[symbol], expected_value)
            close(result.projection["hydrogenIonMolarity"], expected["projection"]["hydrogenIonMolarity"])
            close(result.projection["taughtHydrogenIonExponent"], expected["projection"]["taughtHydrogenIonExponent"])
            assert set(result.indicator_ratios) == set(expected["indicatorRatios"])
            for indicator_id, expected_value in expected["indicatorRatios"].items():
                close(result.indicator_ratios[indicator_id], expected_value)
            published = fixture.get("publishedAnchor", {})
            if "modelPh" in published:
                close(result.model_ph, published["modelPh"], str(published["tolerance"]))
            if "taughtHydrogenIonExponent" in published:
                close(result.projection["taughtHydrogenIonExponent"], published["taughtHydrogenIonExponent"], str(published["tolerance"]))
        elif kind in {"analytic-acid-excess", "analytic-base-excess", "analytic-half-equivalence"}:
            for reference_case in fixture["cases"]:
                result = derivation.solve_case(child_fixture(reference_case))
                if kind == "analytic-acid-excess":
                    expected_relation = -log10(Decimal(str(reference_case["excessMolality"]))) - log10(result.activity_coefficients["H+"])
                elif kind == "analytic-base-excess":
                    expected_relation = Decimal(14) + log10(Decimal(str(reference_case["excessMolality"]))) + log10(result.activity_coefficients["OH-"])
                else:
                    expected_relation = Decimal(str(reference_case["pKa"])) + log10(result.activity_coefficients["OAc-"])
                close(result.model_ph, expected_relation, str(fixture["tolerance"]["relation"]))
                close(result.charge_residual, 0, str(fixture["tolerance"]["chargeResidual"]))
        elif kind == "charge-conservation-sweep":
            results = [derivation.solve_case(child_fixture(reference_case)) for reference_case in fixture["cases"]]
            maximum = max((abs(result.charge_residual) for result in results), default=Decimal(0))
            close(maximum, 0, str(fixture["expectedMaxResidual"]))
        elif kind == "molality-molarity-bound":
            differences = []
            for reference_case in fixture["cases"]:
                true_result = derivation.solve_case({"id": reference_case["caseId"], "request": reference_case["trueRequest"]})
                wrong_result = derivation.solve_case({"id": reference_case["caseId"], "request": reference_case["molarityAsMolalityRequest"]})
                differences.append(abs(true_result.model_ph - wrong_result.model_ph))
            assert max(differences) <= Decimal(str(fixture["expectedMaxDifference"]))
        else:
            raise AssertionError(f"unsupported fixture kind: {kind}")


def test_tampering_a_reference_expected_value_is_detected_by_independent_derivation() -> None:
    derivation = load_derivation()
    fixture = load_fixture("REF-1.json")
    result = derivation.solve_case(fixture)
    tampered = fixture["expected"]["modelPh"] + 0.1
    assert abs(result.model_ph - Decimal(str(tampered))) > Decimal("1e-10")


def test_adversarial_dilute_weak_acid_fixture_is_independently_reproduced() -> None:
    derivation = load_derivation()
    fixture = load_fixture("ADVERSARIAL-HOAC-DILUTE.json")
    result = derivation.solve_case(fixture)
    expected = fixture["expected"]
    close(result.model_ph, expected["modelPh"])
    close(result.ionic_strength, expected["ionicStrengthMolal"])
    close(result.projection["taughtHydrogenIonExponent"], expected["projection"]["taughtHydrogenIonExponent"])
    assert fixture["comparison"]["pHDivergence"] > 0.6
