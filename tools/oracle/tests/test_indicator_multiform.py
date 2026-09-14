"""Independent acceptance tests for the ordinary indicator form matrix."""

from __future__ import annotations

import importlib.util
import json
import sys
from decimal import Decimal
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
REFERENCE_DIR = REPO_ROOT / "packages" / "sci" / "test" / "reference" / "indicator-multiform"
DERIVATION_PATH = REPO_ROOT / "tools" / "oracle" / "reference" / "derive_indicator_multiform.py"
VERSION_MANIFEST_PATH = REPO_ROOT / "contracts" / "version-manifest.json"


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(value, dict)
    return value


def load_derivation() -> Any:
    spec = importlib.util.spec_from_file_location("indicator_multiform_reference", DERIVATION_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_matrix_is_complete_and_independent() -> None:
    manifest = load_json(REFERENCE_DIR / "manifest.json")
    versions = load_json(VERSION_MANIFEST_PATH)
    assert manifest["schemaVersion"] == versions["oracle"]["referenceManifest"]
    assert manifest["derivation"]["notGeneratedBy"] == "packages/sci"
    assert manifest["fixtures"] == [f"MF-{index}" for index in range(1, 11)]
    source = DERIVATION_PATH.read_text(encoding="utf-8")
    assert "packages.sci" not in source
    assert "from packages" not in source
    assert "from chemrealm" not in source
    for fixture_id in manifest["fixtures"]:
        fixture = load_json(REFERENCE_DIR / f"{fixture_id}.json")
        assert fixture["schemaVersion"] == versions["oracle"]["referenceFixture"]
        assert fixture["id"] == fixture_id
        assert fixture["description"]
    fixture_files = sorted(
        (path.stem for path in REFERENCE_DIR.glob("MF-*.json")),
        key=lambda value: int(value.split("-")[1]),
    )
    assert fixture_files == manifest["fixtures"]


def test_constants_are_derived_from_the_admitted_source_record() -> None:
    contract = load_json(REPO_ROOT / "contracts" / "scientific" / "indicator-multiform.json")
    source = load_json(REPO_ROOT / "contracts" / "version-manifest.json")
    assert contract["modelId"] == source["scientific"]["indicatorMultiform"]["id"]
    source_text = (REPO_ROOT / contract["source"]["record"]).read_text(encoding="utf-8")
    assert "pK₁ = 9.05" in source_text
    assert "pK₂ = 9.50" in source_text
    assert "strong-acid" in source_text
    assert "orange" in source_text
    assert "refusal-only" in source_text

    ln10 = Decimal(10).ln()
    expected_ka_1 = (-Decimal("9.05") * ln10).exp()
    expected_ka_2 = (-Decimal("9.50") * ln10).exp()
    assert abs(Decimal(str(contract["constants"]["Ka_In_1"])) - expected_ka_1) < Decimal("1e-20")
    assert abs(Decimal(str(contract["constants"]["Ka_In_2"])) - expected_ka_2) < Decimal("1e-21")
    assert contract["constants"]["neutralIndicatorActivityCoefficient"] == 1


def test_ordinary_cases_conserve_forms_and_indicator_mass() -> None:
    derivation = load_derivation()
    for fixture_id in ["MF-1", "MF-2", "MF-3", "MF-4", "MF-8", "MF-9", "MF-10"]:
        fixture = load_json(REFERENCE_DIR / f"{fixture_id}.json")
        points = fixture["points"] if "points" in fixture else [fixture["request"]]
        for request in points:
            result = derivation.ordinary_fractions(request)
            assert all(Decimal("0") <= value <= Decimal("1") for value in result.fractions)
            assert abs(result.fraction_sum_residual) <= Decimal("1e-70")
            assert abs(result.mass_balance_residual) <= Decimal("1e-70")


def test_transition_neighbourhoods_are_continuous_and_monotone() -> None:
    derivation = load_derivation()
    first = load_json(REFERENCE_DIR / "MF-2.json")["points"]
    first_results = [derivation.ordinary_fractions(request) for request in first]
    assert first_results[0].fractions[1] < first_results[1].fractions[1] < first_results[2].fractions[1]
    assert first_results[2].fractions[1] - first_results[0].fractions[1] < Decimal("0.5")

    second = load_json(REFERENCE_DIR / "MF-3.json")["points"]
    second_results = [derivation.ordinary_fractions(request) for request in second]
    assert second_results[0].fractions[2] < second_results[1].fractions[2] < second_results[2].fractions[2]


def test_refusals_never_emit_partial_forms_or_colour() -> None:
    derivation = load_derivation()
    invalid = derivation.classify_fixture(load_json(REFERENCE_DIR / "MF-5.json"))
    missing = derivation.classify_fixture(load_json(REFERENCE_DIR / "MF-6.json"))
    strong_acid = derivation.classify_fixture(load_json(REFERENCE_DIR / "MF-7.json"))
    assert invalid["status"] == "INVALID_INPUT"
    assert missing["status"] == "FORM_DATA_MISSING"
    assert strong_acid["status"] == "FORM_OUT_OF_DOMAIN"
    assert strong_acid["forms"] is None
    assert strong_acid["opticalColour"] is None


def test_replay_and_optical_boundary_are_explicitly_non_optical() -> None:
    replay = load_json(REFERENCE_DIR / "MF-9.json")
    assert replay["replay"]["mutableContentRemoved"] is True
    assert replay["replay"]["sourceReplayHashMustRemain"] == replay["request"]["sourceReplayHash"]
    world_evidence = replay["replay"]["worldRuntimeEvidence"]
    assert world_evidence["test"] == "apps/web/src/composition.test.ts"
    assert world_evidence["requestBuilder"] == "buildPhenolphthaleinMultiformRequestFromState"
    assert world_evidence["authoredScenarioRequiredForReplay"] is False
    optical = load_json(REFERENCE_DIR / "MF-10.json")["optical"]
    assert optical == {
        "profileStatus": "OPTICAL_MODEL_DATA_MISSING",
        "quantitativeProfileAdmitted": False,
        "rgbDecisionFromChemicalForms": False,
    }


def test_reference_does_not_contain_production_expected_outputs() -> None:
    for path in REFERENCE_DIR.glob("MF-*.json"):
        fixture = load_json(path)
        assert "expectedFractions" not in fixture
        assert "expectedOutput" not in fixture


def test_coupled_differential_request_is_fixture_owned() -> None:
    fixture = load_json(REFERENCE_DIR / "MF-8.json")
    request = fixture["coupledRequest"]
    assert request["regime"] == "ordinary-aqueous"
    assert request["sourceReplayHash"] == "sha256:mf-8-coupled-differential"
    assert request["strongBaseSodiumMolality"] == "0.1"
    assert request["indicatorTotalMolality"] == "0.05"
    assert "expectedFractions" not in request
    assert "expectedOutput" not in request
