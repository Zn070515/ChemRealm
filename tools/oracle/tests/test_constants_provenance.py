"""Machine-check the precision metadata for M4 solver identity constants."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
PROVENANCE_PATH = REPO_ROOT / "docs" / "research" / "constants-provenance.json"
V0_INPUTS_PATH = REPO_ROOT / "docs" / "research" / "v0-scientific-inputs.json"
V0_ENVELOPE_REFERENCE_PATH = REPO_ROOT / "docs" / "research" / "v0-envelope-reference.json"
M4_ACCEPTANCE_TEST_PATH = REPO_ROOT / "apps" / "web" / "src" / "m4-acceptance.test.ts"


def load_provenance() -> dict:
    assert PROVENANCE_PATH.is_file(), f"missing constants provenance: {PROVENANCE_PATH}"
    with PROVENANCE_PATH.open(encoding="utf-8") as handle:
        value = json.load(handle)
    assert isinstance(value, dict)
    return value


def load_v0_inputs() -> dict:
    assert V0_INPUTS_PATH.is_file(), f"missing v0 scientific-input manifest: {V0_INPUTS_PATH}"
    with V0_INPUTS_PATH.open(encoding="utf-8") as handle:
        value = json.load(handle)
    assert isinstance(value, dict)
    return value


def load_v0_envelope_reference() -> dict:
    assert V0_ENVELOPE_REFERENCE_PATH.is_file(), (
        f"missing independent v0 envelope reference: {V0_ENVELOPE_REFERENCE_PATH}"
    )
    with V0_ENVELOPE_REFERENCE_PATH.open(encoding="utf-8") as handle:
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
        if record["kind"] == "derived":
            assert record["claimedSignificantDigits"] <= record["canonicalSignificantDigits"]
            assert record["propagatedPrecision"]["effectiveSignificantDigits"] == record[
                "claimedSignificantDigits"
            ]
        else:
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


def test_logarithmic_derivation_propagates_source_precision() -> None:
    record = next(
        item for item in load_provenance()["records"] if item["key"] == "Ka_HOAc"
    )
    assert record["sourceDecimalPlaces"] == 4
    assert record["sourceUncertainty"] == {
        "absolute": 0.00005,
        "unit": "pKa",
        "basis": "half the last reported decimal place",
    }
    assert record["transform"] == "Ka = 10^(-pKa)"
    assert record["propagatedPrecision"]["effectiveSignificantDigits"] == 3
    assert record["propagatedPrecision"]["relativeUncertaintyUpperBound"] == 0.000116
    assert record["claimedSignificantDigits"] == 3
    assert record["canonicalSignificantDigits"] == 5


def test_indicator_records_are_citable_and_preserve_logarithmic_precision() -> None:
    records = load_provenance()["indicatorRecords"]
    assert {record["indicatorId"] for record in records} == {
        "phenolphthalein",
        "methyl-orange",
    }
    for record in records:
        assert record["key"].startswith("indicator.")
        assert record["sourceLiteral"].strip()
        assert record["citation"].startswith(("https://", "http://"))
        assert record["sourceDecimalPlaces"] == 2
        assert record["transform"] == "Ka_in = 10^(-pKa_in)"
        assert record["sourceUncertainty"]["unit"] == "pKa"
        assert record["propagatedPrecision"]["effectiveSignificantDigits"] == 2
        assert record["claimedSignificantDigits"] == 2
        assert record["claimedSignificantDigits"] <= record["canonicalSignificantDigits"]
        assert "approximation" in record

    phenolphthalein = next(
        record for record in records if record["indicatorId"] == "phenolphthalein"
    )
    assert "academic.oup.com" in phenolphthalein["citation"]
    assert phenolphthalein["sourceLiteral"] == "pKa_in=9.40"

    methyl_orange = next(
        record for record in records if record["indicatorId"] == "methyl-orange"
    )
    assert "10.1016/0143-7208(91)85014-Y" in methyl_orange["citation"]
    assert "± 0.01" in methyl_orange["sourceLiteral"]


def test_v0_material_inputs_have_datum_level_sources_and_are_complete() -> None:
    document = load_v0_inputs()
    assert document["schemaVersion"] == 2
    assert document["id"] == "v0-acid-base-titration-inputs"
    assert document["temperatureK"] == 298.15
    assert document["equivalentFactors"] == [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
    assert document["proposedEnvelopeIonicStrengthMolal"] == 0.12
    assert not any(key.startswith("expectedMaximum") for key in document)
    assert {family["familyId"] for family in document["families"]} == {
        "strong-acid-strong-base",
        "weak-acid-strong-base",
    }
    assert len(document["families"]) == 2
    for family in document["families"]:
        assert family["acidStockId"] in {"hcl-stock", "hoac-stock"}
        assert family["baseStockId"] == "naoh-stock"
        assert family["acidMode"] in {"fully-dissociated", "monoprotic-equilibrium"}
        assert family["baseMode"] == "fully-dissociated"

    stocks = document["stocks"]
    assert {stock["soluteId"] for stock in stocks} == {"HCl", "NaOH", "HOAc", "NaOAc"}
    assert len(stocks) == 4
    for stock in stocks:
        for value_key in ("concentrationMolPerL", "densityKgPerL", "molarMassKgPerMol"):
            assert math.isfinite(stock[value_key]) and stock[value_key] > 0
        for datum_key in ("concentration", "density", "molarMass"):
            record = stock[f"{datum_key}Provenance"]
            assert record["source"].strip()
            assert record["reference"].strip()
            assert record["category"] in {
                "measured",
                "evaluated",
                "calculated",
                "empirical",
                "pedagogicalApproximation",
            }
            if datum_key == "density":
                assert record["temperature"] == {"value": 298.15, "unit": "K"}
                # Product/table sources may report temperature without a numeric
                # pressure. Absence is faithful; a standard-atmosphere value must
                # never be fabricated as a source observation.
                assert "pressure" not in record
            else:
                assert "temperature" not in record
                assert "pressure" not in record
            assert record["lastVerified"] == "2026-09-13"
        expected_units = {
            "concentrationSourceRecord": "mol/L",
            "densitySourceRecord": "kg/L",
            "molarMassSourceRecord": "kg/mol",
        }
        for source_record_key, expected_unit in expected_units.items():
            source_record = stock[source_record_key]
            assert source_record["sourceLiteral"].strip()
            assert source_record["citation"].startswith(("https://", "http://", "docs/"))
            assert source_record["unit"] == expected_unit
            precision = source_record["reportedPrecision"]
            assert precision["kind"] in {
                "decimal-places",
                "not-stated",
                "derived",
                "model-approximation",
            }
            if precision["kind"] == "decimal-places":
                assert isinstance(precision["decimalPlaces"], int)
                assert precision["decimalPlaces"] >= 0
            else:
                assert "decimalPlaces" not in precision

            # Conditions and precision must be observations, not made-up defaults.
            if source_record_key == "densitySourceRecord":
                assert source_record["sourceConditions"] == {
                    "temperature": {"value": 298.15, "unit": "K"}
                }
            else:
                assert "sourceConditions" not in source_record

    naoh = next(stock for stock in stocks if stock["stockId"] == "naoh-stock")
    assert naoh["densitySourceRecord"]["sourceLiteral"] == "1 g/cm³ (25 °C)"
    assert naoh["densitySourceRecord"]["reportedPrecision"] == {
        "kind": "not-stated"
    }

    hoac = next(stock for stock in stocks if stock["stockId"] == "hoac-stock")
    assert hoac["densityProvenance"]["edition"] == "8th"
    assert "Table 2-109" in hoac["densityProvenance"]["reference"]
    assert "0 mass%" in hoac["densitySourceRecord"]["sourceLiteral"]
    assert "1 mass%" in hoac["densitySourceRecord"]["sourceLiteral"]
    assert "interpol" in hoac["densitySourceRecord"]["method"].lower()


def test_v0_envelope_reference_is_separate_from_inputs_and_pins_current_result() -> None:
    inputs = load_v0_inputs()
    reference = load_v0_envelope_reference()
    assert reference["schemaVersion"] == 1
    assert reference["id"] == "v0-acid-base-titration-envelope-reference"
    assert reference["inputManifestSha256"] == hashlib.sha256(
        V0_INPUTS_PATH.read_bytes()
    ).hexdigest()
    assert reference["expectedMaximum"] == {
        "ionicStrengthMolal": 0.09996461252716539,
        "familyId": "strong-acid-strong-base",
        "equivalentFactor": 0,
        "absoluteTolerance": 5e-10,
    }
    assert reference["derivation"]["kind"] == "independent-analytic-boundary"
    assert "0.1002" not in json.dumps(reference)
    assert "expectedMaximum" not in inputs

    hcl = next(stock for stock in inputs["stocks"] if stock["stockId"] == "hcl-stock")
    independently_derived_limit = hcl["concentrationMolPerL"] / (
        hcl["densityKgPerL"]
        - hcl["concentrationMolPerL"] * hcl["molarMassKgPerMol"]
    )
    assert math.isclose(
        independently_derived_limit,
        reference["expectedMaximum"]["ionicStrengthMolal"],
        abs_tol=1e-14,
    )


def test_m4_acceptance_uses_the_canonical_manifest_not_duplicate_scientific_inputs() -> None:
    source = M4_ACCEPTANCE_TEST_PATH.read_text(encoding="utf-8")
    assert "v0-scientific-inputs.json" in source
    assert "v0-envelope-reference.json" in source
    assert "createWorldFromScenario" in source
    assert "requestFromEnvelopeWorld" in source
    assert "densityKgPerL -" not in source
    for literal in ("1.002", "1.004", "1.001", "1.02", "0.0364609", "0.0399971"):
        assert literal not in source
