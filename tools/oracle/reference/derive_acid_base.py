"""Independent Decimal reference calculation for the M4 v0 acid-base model.

This module intentionally does not import the TypeScript solver.  It mirrors the
accepted equations with Python's high-precision Decimal arithmetic so checked-in
REF fixtures can be reviewed against a second implementation.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from decimal import Decimal, getcontext
from pathlib import Path
from typing import Any, Iterable


getcontext().prec = 80

ZERO = Decimal("0")
ONE = Decimal("1")
KW = Decimal("1.0e-14")
KA_HOAC = Decimal("1.7539e-5")
DAVIES_A = Decimal("0.509")
DAVIES_B = Decimal("0.3")
LN10 = Decimal(10).ln()


@dataclass(frozen=True)
class ReferenceResult:
    model_ph: Decimal
    ionic_strength: Decimal
    species: dict[str, Decimal]
    activities: dict[str, Decimal]
    activity_coefficients: dict[str, Decimal]
    charge_residual: Decimal
    projection: dict[str, Decimal]
    indicator_ratios: dict[str, Decimal]


def decimal(value: Any) -> Decimal:
    return Decimal(str(value))


def exp10(value: Decimal) -> Decimal:
    return (value * LN10).exp()


def gamma(ionic_strength: Decimal) -> Decimal:
    root = ionic_strength.sqrt()
    term = root / (ONE + root) - DAVIES_B * ionic_strength
    return exp10(-DAVIES_A * term)


def totals_for_case(case: dict[str, Any]) -> tuple[Decimal, Decimal, Decimal]:
    water_mass = decimal(case["request"]["waterMassKg"])
    acid = ZERO
    sodium = ZERO
    chloride = ZERO
    for solute in case["request"]["solutes"]:
        amount = decimal(solute["amountMol"]) / water_mass
        if solute["soluteId"] == "HCl":
            chloride += amount
        elif solute["soluteId"] == "NaOH":
            sodium += amount
        elif solute["soluteId"] == "HOAc":
            acid += amount
        elif solute["soluteId"] == "NaOAc":
            sodium += amount
            acid += amount
        else:
            raise ValueError(f"unsupported reference component: {solute['soluteId']}")
    return acid, sodium, chloride


def species_at(
    hydrogen: Decimal,
    ionic_strength: Decimal,
    acid: Decimal,
    sodium: Decimal,
    chloride: Decimal,
) -> tuple[dict[str, Decimal], Decimal]:
    charged_gamma = gamma(ionic_strength)
    hydroxide = KW / (charged_gamma * charged_gamma * hydrogen)
    conditional_ka = KA_HOAC / (charged_gamma * charged_gamma)
    conjugate_base = acid * conditional_ka / (conditional_ka + hydrogen)
    neutral_acid = acid - conjugate_base
    species = {
        "H+": hydrogen,
        "OH-": hydroxide,
        "HOAc": neutral_acid,
        "OAc-": conjugate_base,
        "Na+": sodium,
        "Cl-": chloride,
    }
    ionic = (hydrogen + hydroxide + conjugate_base + sodium + chloride) / Decimal(2)
    return species, ionic


def solve_inner(
    hydrogen: Decimal,
    acid: Decimal,
    sodium: Decimal,
    chloride: Decimal,
) -> tuple[dict[str, Decimal], Decimal]:
    lower = ZERO
    upper = Decimal("0.5")
    _, lower_ionic = species_at(hydrogen, lower, acid, sodium, chloride)
    _, upper_ionic = species_at(hydrogen, upper, acid, sodium, chloride)
    lower_residual = lower_ionic - lower
    upper_residual = upper_ionic - upper
    if lower_residual < ZERO or upper_residual > ZERO:
        raise ValueError("reference inner ionic-strength root is outside [0, 0.5]")
    for _ in range(300):
        midpoint = (lower + upper) / Decimal(2)
        species, calculated = species_at(
            hydrogen, midpoint, acid, sodium, chloride
        )
        residual = calculated - midpoint
        if abs(residual) < Decimal("1e-60"):
            return species, calculated
        if residual > ZERO:
            lower = midpoint
        else:
            upper = midpoint
    midpoint = (lower + upper) / Decimal(2)
    species, calculated = species_at(hydrogen, midpoint, acid, sodium, chloride)
    return species, calculated


def charge_residual(
    hydrogen: Decimal,
    acid: Decimal,
    sodium: Decimal,
    chloride: Decimal,
) -> tuple[Decimal, dict[str, Decimal], Decimal]:
    species, ionic = solve_inner(hydrogen, acid, sodium, chloride)
    residual = hydrogen + sodium - species["OH-"] - species["OAc-"] - chloride
    return residual, species, ionic


def solve_case(case: dict[str, Any]) -> ReferenceResult:
    acid, sodium, chloride = totals_for_case(case)
    # The outer bracket must itself stay inside the Davies fixed-point domain.
    # 1e-13 is low enough to bracket the v0 base cases while avoiding the
    # hydroxide-dominated, out-of-domain trial at arbitrarily tiny hydrogen.
    lower = Decimal("1e-13")
    upper = Decimal("0.5")
    lower_residual, _, _ = charge_residual(lower, acid, sodium, chloride)
    upper_residual, _, _ = charge_residual(upper, acid, sodium, chloride)
    if lower_residual >= ZERO or upper_residual <= ZERO:
        raise ValueError(f"reference outer bracket is missing for {case['id']}")
    for _ in range(300):
        midpoint = (lower + upper) / Decimal(2)
        residual, _, _ = charge_residual(midpoint, acid, sodium, chloride)
        if abs(residual) < Decimal("1e-60"):
            lower = midpoint
            upper = midpoint
            break
        if residual < ZERO:
            lower = midpoint
        else:
            upper = midpoint
    hydrogen = (lower + upper) / Decimal(2)
    residual, species, ionic = charge_residual(hydrogen, acid, sodium, chloride)
    charged_gamma = gamma(ionic)
    activities = {
        "H+": charged_gamma * species["H+"],
        "OH-": charged_gamma * species["OH-"],
        "HOAc": species["HOAc"],
        "OAc-": charged_gamma * species["OAc-"],
        "Na+": charged_gamma * species["Na+"],
        "Cl-": charged_gamma * species["Cl-"],
    }
    water_mass = decimal(case["request"]["waterMassKg"])
    volume = decimal(case["request"]["liquidVolumeL"])
    hydrogen_molarity = species["H+"] * water_mass / volume
    indicators = {
        indicator["indicatorId"]: decimal(indicator["kaIn"])
        / (activities["H+"] * charged_gamma)
        for indicator in case["request"].get("indicators", [])
    }
    return ReferenceResult(
        model_ph=-(activities["H+"].ln() / LN10),
        ionic_strength=ionic,
        species=species,
        activities=activities,
        activity_coefficients={
            "H+": charged_gamma,
            "OH-": charged_gamma,
            "HOAc": ONE,
            "OAc-": charged_gamma,
            "Na+": charged_gamma,
            "Cl-": charged_gamma,
        },
        charge_residual=residual,
        projection={
            "hydrogenIonMolarity": hydrogen_molarity,
            "taughtHydrogenIonExponent": -(hydrogen_molarity.ln() / LN10),
        },
        indicator_ratios=indicators,
    )


def as_json(result: ReferenceResult) -> dict[str, Any]:
    def values(source: dict[str, Decimal]) -> dict[str, float]:
        return {key: float(value) for key, value in source.items()}

    return {
        "modelPh": float(result.model_ph),
        "ionicStrengthMolal": float(result.ionic_strength),
        "speciesMolality": values(result.species),
        "speciesActivity": values(result.activities),
        "speciesActivityCoefficient": values(result.activity_coefficients),
        "chargeResidual": float(result.charge_residual),
        "projection": values(result.projection),
        "indicatorRatios": values(result.indicator_ratios),
    }


def built_in_cases() -> Iterable[dict[str, Any]]:
    def case(case_id: str, description: str, solutes: list[dict[str, Any]], *, volume: float = 1.0, indicators: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        return {
            "id": case_id,
            "description": description,
            "request": {
                "waterMassKg": 1.0,
                "liquidVolumeL": volume,
                "temperatureK": 298.15,
                "solutes": solutes,
                "indicators": indicators or [],
            },
        }

    yield case("REF-1", "0.1 mol/kg strong acid", [{"soluteId": "HCl", "amountMol": 0.1, "mode": "fully-dissociated"}])
    yield case("REF-2", "0.1 mol/kg strong base", [{"soluteId": "NaOH", "amountMol": 0.1, "mode": "fully-dissociated"}])
    yield case("REF-3", "0.1 mol/kg weak acid", [{"soluteId": "HOAc", "amountMol": 0.1, "mode": "monoprotic-equilibrium", "ka": KA_HOAC}])
    yield case("REF-4", "0.1 mol/kg sodium acetate", [{"soluteId": "NaOAc", "amountMol": 0.1, "mode": "fully-dissociated"}])
    yield case("REF-5", "dilute weak acid", [{"soluteId": "HOAc", "amountMol": 1e-6, "mode": "monoprotic-equilibrium", "ka": KA_HOAC}])
    yield case("REF-6", "weak-acid buffer before equivalence", [{"soluteId": "HOAc", "amountMol": 0.1, "mode": "monoprotic-equilibrium", "ka": KA_HOAC}, {"soluteId": "NaOH", "amountMol": 0.05, "mode": "fully-dissociated"}])
    yield case("REF-7", "pre-equivalence titration point", [{"soluteId": "HOAc", "amountMol": 0.1, "mode": "monoprotic-equilibrium", "ka": KA_HOAC}, {"soluteId": "NaOH", "amountMol": 0.025, "mode": "fully-dissociated"}])
    yield case("REF-8", "equivalence titration point", [{"soluteId": "HOAc", "amountMol": 0.1, "mode": "monoprotic-equilibrium", "ka": KA_HOAC}, {"soluteId": "NaOH", "amountMol": 0.1, "mode": "fully-dissociated"}])
    yield case("REF-9", "post-equivalence titration point", [{"soluteId": "HOAc", "amountMol": 0.1, "mode": "monoprotic-equilibrium", "ka": KA_HOAC}, {"soluteId": "NaOH", "amountMol": 0.15, "mode": "fully-dissociated"}])
    yield case("REF-10", "volume-dependent projection and indicator", [{"soluteId": "HCl", "amountMol": 0.05, "mode": "fully-dissociated"}, {"soluteId": "NaOH", "amountMol": 0.04, "mode": "fully-dissociated"}], volume=0.25, indicators=[{"indicatorId": "phenolphthalein", "kaIn": 1e-9}])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", choices=[case["id"] for case in built_in_cases()])
    args = parser.parse_args()
    cases = list(built_in_cases())
    if args.case:
        cases = [case for case in cases if case["id"] == args.case]
    print(json.dumps({case["id"]: as_json(solve_case(case)) for case in cases}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
