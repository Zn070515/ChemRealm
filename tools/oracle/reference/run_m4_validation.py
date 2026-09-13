"""Run the pinned PHREEQC oracle sweep and report its disagreement explicitly."""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
REFERENCE_DIR = REPO_ROOT / "packages" / "sci" / "test" / "reference"
TS_RUNNER = REPO_ROOT / "tools" / "oracle" / "reference" / "run_ts_cases.mjs"
PHREEQC_RUNNER = REPO_ROOT / "tools" / "oracle" / "phreeqc" / "run_batch.py"
MANIFEST_PATH = REFERENCE_DIR / "manifest.json"


def load_module(path: Path, name: str) -> Any:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load module: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


runner = load_module(PHREEQC_RUNNER, "chemrealm_phreeqc_runner")


def load_fixture(name: str) -> dict[str, Any]:
    with (REFERENCE_DIR / name).open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"fixture is not an object: {name}")
    return value


def fixture_ids(field: str) -> list[str]:
    with MANIFEST_PATH.open(encoding="utf-8") as handle:
        manifest = json.load(handle)
    values = manifest.get(field)
    if not isinstance(values, list) or not all(isinstance(value, str) for value in values):
        raise RuntimeError(f"reference manifest field {field!r} must be a string list")
    return values


def totals(fixture: dict[str, Any]) -> dict[str, float]:
    result = {"acid": 0.0, "sodium": 0.0, "chloride": 0.0}
    for solute in fixture["request"]["solutes"]:
        amount = float(solute["amountMol"])
        if solute["soluteId"] == "HCl":
            result["chloride"] += amount
        elif solute["soluteId"] == "NaOH":
            result["sodium"] += amount
        elif solute["soluteId"] == "HOAc":
            result["acid"] += amount
        elif solute["soluteId"] == "NaOAc":
            result["acid"] += amount
            result["sodium"] += amount
        else:
            raise ValueError(f"unsupported reference component: {solute['soluteId']}")
    water_mass = float(fixture["request"]["waterMassKg"])
    return {key: value / water_mass for key, value in result.items()}


def phreeqc_input(fixture: dict[str, Any], selected_output_name: str) -> str:
    amounts = totals(fixture)
    has_acid = amounts["acid"] > 0
    lines = [f"TITLE ChemRealm {fixture['id']} pinned oracle case"]
    if has_acid:
        lines.extend(
            [
                "",
                "SOLUTION_MASTER_SPECIES",
                "    Acetate    HAcetate    0.0    Acetate    59.044",
                "",
                "SOLUTION_SPECIES",
                "    HAcetate = HAcetate",
                "        log_k 0.0",
                "    HAcetate = Acetate- + H+",
                "        log_k -4.7560",
            ]
        )
    lines.extend(
        [
            "",
            "SOLUTION 1",
            "    temp 25",
            "    units mol/kgw",
            "    pH 7 charge",
            "    water 1",
            f"    Na {amounts['sodium']:.17g}",
            f"    Cl {amounts['chloride']:.17g}",
        ]
    )
    if has_acid:
        lines.append(f"    Acetate {amounts['acid']:.17g}")
    lines.extend(
        [
            "",
            "SELECTED_OUTPUT",
            f"    -file {selected_output_name}",
            "    -reset false",
            "    -high_precision true",
            "    -pH true",
            "    -ionic_strength true",
            "    -molalities H+ OH- Na+ Cl-" + (" Acetate- HAcetate" if has_acid else ""),
            "",
            "USER_PUNCH",
            "    -headings CHEMREALM_SELECTED_OUTPUT",
            "    10 PUNCH 1",
            "",
            "END",
            "",
        ]
    )
    return "\n".join(lines)


def run_ts() -> list[dict[str, Any]]:
    completed = subprocess.run(
        ["node", str(TS_RUNNER), str(REFERENCE_DIR), "ORACLE"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(f"TypeScript reference runner failed:\n{completed.stderr}")
    try:
        value = json.loads(completed.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"TypeScript reference runner returned invalid JSON: {completed.stdout}") from error
    if not isinstance(value, list):
        raise RuntimeError("TypeScript reference runner did not return a list")
    return value


def required_float(row: dict[str, str], *names: str) -> float:
    for name in names:
        if name in row:
            return float(row[name])
    raise RuntimeError(f"selected output is missing one of {names}: {row}")


def run_phreeqc() -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    results: dict[str, dict[str, Any]] = {}
    with tempfile.TemporaryDirectory(prefix="chemrealm-m4-phreeqc-") as directory:
        root = Path(directory)
        for fixture_id in fixture_ids("oracleFixtures"):
            fixture = load_fixture(f"{fixture_id}.json")
            input_path = root / f"{fixture['id']}.pqi"
            output_path = root / f"{fixture['id']}.pqo"
            selected_path = root / f"{fixture['id']}.sel"
            selected_name = f"{fixture['id']}.sel"
            input_path.write_text(phreeqc_input(fixture, selected_name), encoding="utf-8")
            batch = runner.run_batch(
                input_path,
                repo_root=REPO_ROOT,
                output_path=output_path,
                selected_output_path=selected_path,
            )
            rows = runner.parse_selected_output(selected_path.read_text(encoding="utf-8", errors="replace"))
            if len(rows) != 1:
                raise RuntimeError(f"{fixture['id']} produced {len(rows)} selected-output rows")
            row = rows[0]
            if float(row.get("CHEMREALM_SELECTED_OUTPUT", "nan")) != 1:
                raise RuntimeError(f"{fixture['id']} selected-output marker was not 1: {row}")
            results[fixture["id"]] = {
                "status": "OK",
                "modelPh": required_float(row, "pH"),
                "ionicStrengthMolal": required_float(row, "mu", "ionic_strength"),
                "tool": {
                    "version": batch.toolchain.version,
                    "executableSha256": batch.toolchain.executable_sha256,
                    "databaseSha256": batch.toolchain.database_sha256,
                    "identityVerified": batch.toolchain.identity_verified,
                    "identitySource": batch.toolchain.identity_source,
                },
            }
    first = next(iter(results.values()))
    return results, first["tool"]


def compare(ts_rows: list[dict[str, Any]], phreeqc_rows: dict[str, dict[str, Any]]) -> dict[str, Any]:
    oracle_ids = fixture_ids("oracleFixtures")
    if [row.get("id") for row in ts_rows] != oracle_ids:
        raise RuntimeError("TypeScript runner did not return every oracle fixture in order")
    points: list[dict[str, Any]] = []
    for ts in ts_rows:
        case_id = ts["id"]
        oracle = phreeqc_rows.get(case_id)
        if oracle is None:
            raise RuntimeError(f"PHREEQC result is missing {case_id}")
        if ts.get("status") != "OK" or oracle.get("status") != "OK":
            points.append({"id": case_id, "status": "FAIL", "reason": "engine did not return OK"})
            continue
        try:
            ts_model_ph = float(ts["modelPh"])
            oracle_model_ph = float(oracle["modelPh"])
            ts_ionic_strength = float(ts["ionicStrengthMolal"])
            oracle_ionic_strength = float(oracle["ionicStrengthMolal"])
        except (KeyError, TypeError, ValueError):
            points.append({
                "id": case_id,
                "status": "FAIL",
                "reason": "engine returned OK without the required numeric fields",
            })
            continue
        if not all(math.isfinite(value) for value in (
            ts_model_ph,
            oracle_model_ph,
            ts_ionic_strength,
            oracle_ionic_strength,
        )):
            points.append({
                "id": case_id,
                "status": "FAIL",
                "reason": "engine returned a non-finite numeric field",
            })
            continue
        difference = abs(ts_model_ph - oracle_model_ph)
        points.append(
            {
                "id": case_id,
                "status": "PASS" if difference <= 0.02 else "FAIL",
                "tsModelPh": ts_model_ph,
                "phreeqcModelPh": oracle_model_ph,
                "absolutePhDifference": difference,
                "tsIonicStrengthMolal": ts_ionic_strength,
                "phreeqcIonicStrengthMolal": oracle_ionic_strength,
                "region": {
                    "ORACLE-7": "pre-equivalence",
                    "ORACLE-8": "equivalence",
                    "ORACLE-9": "post-equivalence",
                }.get(case_id, "control"),
            }
        )
        points[-1]["signedPhDifference"] = ts_model_ph - oracle_model_ph
    differences = [point["signedPhDifference"] for point in points if "signedPhDifference" in point]
    max_difference = max((abs(value) for value in differences), default=0.0)
    signed_summary = {
        "minimum": min(differences, default=0.0),
        "maximum": max(differences, default=0.0),
        "mean": sum(differences) / len(differences) if differences else 0.0,
        "allSameSign": bool(differences) and all(value > 0 for value in differences),
    }
    disagreement_analysis = {
        "classification": "systematic-positive-offset-candidate"
        if signed_summary["allSameSign"]
        else "mixed-sign-or-insufficient-sample",
        "observed": "TS model pH minus PHREEQC model pH is positive at every compared point"
        if signed_summary["allSameSign"]
        else "signed differences do not have one strict sign at every compared point",
        "interpretation": "This is an observed cross-engine offset, not proof of a single cause; activity convention, database species representation, constants, and water conventions require separate investigation.",
        "notProven": "Tolerance pass does not establish model equivalence or explain the offset.",
    }
    return {
        "schemaVersion": 1,
        "model": {"id": "acidbase-monoprotic-davies", "version": "1.0.0"},
        "basis": "molality",
        "constants": "docs/research/constants-provenance.json",
        "oracleFixtures": oracle_ids,
        "equivalenceSweep": {
            "pre": "ORACLE-7",
            "equivalence": "ORACLE-8",
            "post": "ORACLE-9",
            "postNaOHMolPerKg": 0.14,
            "note": "ORACLE-9 is a representative post-equivalence point within the declared pH comparison envelope; canonical REF-9 remains the charge-conservation acceptance fixture.",
        },
        "points": points,
        "pointCount": len(points),
        "allPointsCompared": len(points) == len(oracle_ids),
        "maxAbsolutePhDifference": max_difference,
        "signedPhDifferenceSummary": signed_summary,
        "disagreementAnalysis": disagreement_analysis,
        "tolerancePh": 0.02,
        "pass": len(points) == len(oracle_ids) and all(point["status"] == "PASS" for point in points),
        "validation": {
            "sourceCommit": os.environ.get("CHEMREALM_VALIDATION_COMMIT", "uncommitted-working-tree"),
            "ciRun": os.environ.get("CHEMREALM_VALIDATION_CI", "not-recorded"),
            "ciHardGate": os.environ.get("CHEMREALM_VALIDATION_CI_HARD_GATE") == "1",
            "executionEnvironment": "local oracle run; CI repeats the pinned installation and sweep",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    oracle_ids = fixture_ids("oracleFixtures")
    ts_rows = run_ts()
    phreeqc_rows, toolchain = run_phreeqc()
    report = compare(ts_rows, phreeqc_rows)
    report["phreeqc"] = toolchain
    if args.output:
        output = args.output if args.output.is_absolute() else REPO_ROOT / args.output
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    if not report["pass"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
