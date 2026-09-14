"""Independent Decimal reference for the ordinary phenolphthalein forms.

This module deliberately implements only the accepted fraction equations. It
does not import the TypeScript solver, call a production adapter, choose RGB,
or treat the strong-acid cation as an ordinary form.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from decimal import Decimal, getcontext
from pathlib import Path
from typing import Any


getcontext().prec = 80

ZERO = Decimal("0")
ONE = Decimal("1")
REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
CONTRACT_PATH = REPOSITORY_ROOT / "contracts" / "scientific" / "indicator-multiform.json"
REFERENCE_DIR = REPOSITORY_ROOT / "packages" / "sci" / "test" / "reference" / "indicator-multiform"


@dataclass(frozen=True)
class FractionResult:
    fractions: tuple[Decimal, Decimal, Decimal]
    amounts: tuple[Decimal, Decimal, Decimal]
    fraction_sum_residual: Decimal
    mass_balance_residual: Decimal
    charged_indicator_molality: Decimal


def decimal(value: Any) -> Decimal:
    return Decimal(str(value))


def load_contract() -> dict[str, Any]:
    with CONTRACT_PATH.open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError("indicator multiform contract must be an object")
    return value


def constants() -> tuple[Decimal, Decimal, Decimal]:
    contract = load_contract()
    values = contract["constants"]
    return (
        decimal(values["Ka_In_1"]),
        decimal(values["Ka_In_2"]),
        decimal(values["neutralIndicatorActivityCoefficient"]),
    )


def ordinary_fractions(request: dict[str, Any]) -> FractionResult:
    ka_1, ka_2, neutral_gamma = constants()
    total = decimal(request["totalMolality"])
    hydrogen = decimal(request["hydrogenActivity"])
    mono_gamma = decimal(request["monovalentAnionActivityCoefficient"])
    di_gamma = decimal(request["divalentAnionActivityCoefficient"])
    if total <= ZERO:
        raise ValueError("invalid indicator dose")
    if min(hydrogen, mono_gamma, di_gamma, ka_1, ka_2, neutral_gamma) <= ZERO:
        raise ValueError("ordinary constants and activities must be positive")

    mono_to_neutral = ka_1 * neutral_gamma / (hydrogen * mono_gamma)
    di_to_mono = ka_2 * mono_gamma / (hydrogen * di_gamma)
    di_to_neutral = mono_to_neutral * di_to_mono
    denominator = ONE + mono_to_neutral + di_to_neutral
    fractions = (
        ONE / denominator,
        mono_to_neutral / denominator,
        di_to_neutral / denominator,
    )
    amounts = tuple(total * fraction for fraction in fractions)
    fraction_sum_residual = sum(fractions, ZERO) - ONE
    mass_balance_residual = sum(amounts, ZERO) - total
    charged_indicator_molality = amounts[1] + Decimal(2) * amounts[2]
    return FractionResult(
        fractions=fractions,
        amounts=amounts,
        fraction_sum_residual=fraction_sum_residual,
        mass_balance_residual=mass_balance_residual,
        charged_indicator_molality=charged_indicator_molality,
    )


def classify_fixture(fixture: dict[str, Any]) -> dict[str, Any]:
    kind = fixture["kind"]
    request = fixture.get("request")
    if kind == "strong-acid-refusal":
        if request is None or request.get("regime") != "strong-acid-cation":
            raise ValueError("strong-acid refusal fixture must request the cation regime")
        if "strong-acid-cation" not in fixture.get("forbiddenOutputs", []):
            raise ValueError("strong-acid refusal fixture must forbid the cation output")
        if "orange" not in fixture.get("forbiddenOutputs", []):
            raise ValueError("strong-acid refusal fixture must forbid an orange output")
        return {
            "status": "FORM_OUT_OF_DOMAIN",
            "forms": None,
            "opticalColour": None,
        }
    if kind == "invalid-dose":
        if request is None:
            raise ValueError("invalid-dose fixture has no request")
        try:
            ordinary_fractions(request)
        except ValueError:
            pass
        else:
            raise ValueError("invalid-dose fixture unexpectedly admits an ordinary result")
        return {"status": "INVALID_INPUT", "forms": None}
    if kind == "missing-constants":
        missing = set(fixture.get("missingConstants", []))
        if missing != {"Ka_In_1", "Ka_In_2"}:
            raise ValueError("missing-constants fixture must name both form constants")
        contract = load_contract()
        if any(name not in contract["constants"] for name in missing):
            raise ValueError("missing-constants fixture names an unknown contract constant")
        return {"status": "FORM_DATA_MISSING", "forms": None}
    if request is None:
        raise ValueError(f"fixture {fixture['id']} has no request")
    result = ordinary_fractions(request)
    if kind == "optical-boundary":
        optical = fixture.get("optical", {})
        if optical.get("profileStatus") != "OPTICAL_MODEL_DATA_MISSING":
            raise ValueError("ordinary optical-boundary fixture must remain data-missing")
        if optical.get("quantitativeProfileAdmitted") is not False:
            raise ValueError("ordinary optical-boundary fixture cannot admit a quantitative profile")
        if optical.get("rgbDecisionFromChemicalForms") is not False:
            raise ValueError("chemical forms cannot directly choose RGB")
    return {
        "status": "CHEMICAL_FORMS_OK",
        "fractions": result.fractions,
        "amounts": result.amounts,
        "fractionSumResidual": result.fraction_sum_residual,
        "massBalanceResidual": result.mass_balance_residual,
        "chargedIndicatorMolality": result.charged_indicator_molality,
    }


def load_manifest() -> dict[str, Any]:
    with (REFERENCE_DIR / "manifest.json").open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError("indicator multiform reference manifest must be an object")
    return value


def load_fixture(fixture_id: str) -> dict[str, Any]:
    with (REFERENCE_DIR / f"{fixture_id}.json").open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"indicator multiform fixture must be an object: {fixture_id}")
    return value


def serialise(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, tuple):
        return [serialise(item) for item in value]
    if isinstance(value, dict):
        return {key: serialise(item) for key, item in value.items()}
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", choices=load_manifest()["fixtures"])
    args = parser.parse_args()
    fixture_ids = [args.case] if args.case else load_manifest()["fixtures"]
    print(json.dumps(
        {fixture_id: serialise(classify_fixture(load_fixture(fixture_id)))
         for fixture_id in fixture_ids},
        indent=2,
        sort_keys=True,
    ))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
