"""Host-side validation for the additive M6 visual-study manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[5]
EXPECTED_ROUNDS = {
    "form": {"F01", "F02", "F03", "F04"},
    "glass": {"G01", "G02", "G03", "G04"},
    "lighting": {"L01", "L02", "L03"},
}
EXPECTED_VARIABLES = {
    "form": {"rim-profile", "spout-transition", "base-mass", "body-taper"},
    "glass": {"glass-treatment"},
    "lighting": {"lighting-rig"},
}
EXPECTED_OUTPUT_ROOT = Path("assets/apparatus/masters/beaker-250ml/qa/blender-studies")
RENDER_FILES = [
    "front-light.png",
    "front-dark.png",
    "thumbnail-light.png",
    "thumbnail-dark.png",
    "closeup-rim.png",
    "closeup-spout.png",
    "alpha-check.png",
]


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def repo_path(relative: str) -> Path:
    candidate = (ROOT / relative).resolve()
    if not candidate.is_relative_to(ROOT):
        raise ValueError(f"path escapes repository: {relative}")
    return candidate


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_manifest(manifest_path: Path) -> dict[str, Any]:
    manifest = read_json(manifest_path)
    failures: list[str] = []
    checks: list[dict[str, Any]] = []

    def check(check_id: str, ok: bool, message: str, details: Any = None) -> None:
        checks.append({"id": check_id, "status": "PASS" if ok else "FAIL", "message": message, "details": details})
        if not ok:
            failures.append(f"{check_id}: {message}")

    check("M6-STUDY-SCHEMA", manifest.get("schemaVersion") == 1, "study schema version is 1")
    check("M6-STUDY-STATUS", manifest.get("status") == "study-only", "manifest is explicitly study-only")
    check("M6-STUDY-ASSET", manifest.get("assetId") == "beaker-250ml", "study targets the 250 mL beaker")

    output_root = Path(manifest.get("outputRoot", ""))
    check("M6-STUDY-OUTPUT-ROOT", output_root == EXPECTED_OUTPUT_ROOT, "outputs remain in the beaker study QA root", str(output_root))

    source_hashes: dict[str, str] = {}
    source_inputs = manifest.get("sourceInputs", [])
    source_ok = isinstance(source_inputs, list) and bool(source_inputs)
    if source_ok:
        for item in source_inputs:
            if not isinstance(item, str):
                source_ok = False
                failures.append("M6-STUDY-SOURCES: source input is not a repository-relative string")
                continue
            try:
                path = repo_path(item)
            except ValueError as error:
                source_ok = False
                failures.append(f"M6-STUDY-SOURCES: {error}")
                continue
            if not path.is_file():
                source_ok = False
                failures.append(f"M6-STUDY-SOURCES: missing {item}")
            else:
                source_hashes[item] = sha256(path)
    check("M6-STUDY-SOURCES", source_ok, "all source inputs exist and are hashable", source_hashes)

    rounds = manifest.get("rounds")
    rounds_ok = isinstance(rounds, dict) and set(rounds) == set(EXPECTED_ROUNDS)
    check("M6-STUDY-ROUNDS", rounds_ok, "form, glass, and lighting are the only rounds", sorted(rounds or {}))
    all_ids: list[str] = []
    if rounds_ok:
        for round_name, expected_ids in EXPECTED_ROUNDS.items():
            definition = rounds.get(round_name, {})
            candidate_ids = set(definition.get("candidateIds", []))
            allowed = set(definition.get("allowedVariables", []))
            ids_ok = candidate_ids == expected_ids
            variables_ok = allowed == EXPECTED_VARIABLES[round_name]
            check(f"M6-STUDY-{round_name.upper()}-IDS", ids_ok, f"{round_name} candidate IDs are exact", sorted(candidate_ids))
            check(f"M6-STUDY-{round_name.upper()}-VARIABLES", variables_ok, f"{round_name} allowed variables are exact", sorted(allowed))
            all_ids.extend(sorted(candidate_ids))

    check("M6-STUDY-UNIQUE-IDS", len(all_ids) == len(set(all_ids)), "candidate IDs are globally unique", all_ids)

    report = {
        "status": "PASS" if not failures else "FAIL",
        "manifest": str(manifest_path.resolve().relative_to(ROOT)).replace("\\", "/"),
        "studyId": manifest.get("studyId"),
        "checks": checks,
        "sourceHashes": source_hashes,
        "failures": failures,
    }
    return report


def validate_outputs(manifest_path: Path) -> dict[str, Any]:
    manifest = read_json(manifest_path)
    failures: list[str] = []
    checks: list[dict[str, Any]] = []

    def check(check_id: str, ok: bool, message: str, details: Any = None) -> None:
        checks.append({"id": check_id, "status": "PASS" if ok else "FAIL", "message": message, "details": details})
        if not ok:
            failures.append(f"{check_id}: {message}")

    output_root = repo_path(manifest["outputRoot"]) / manifest["studyId"]
    source_blend = repo_path(manifest["sourceBlend"])
    expected_source_hash = sha256(source_blend)
    candidate_count = 0
    metadata_count = 0
    all_candidate_ids: list[str] = []
    for round_name, definition in manifest["rounds"].items():
        for candidate_id in definition["candidateIds"]:
            candidate_count += 1
            all_candidate_ids.append(candidate_id)
            candidate_root = output_root / round_name / candidate_id
            blend = candidate_root / "candidate.blend"
            metadata_path = candidate_root / "render-metadata.json"
            check(f"M6-STUDY-{round_name.upper()}-{candidate_id}-BLEND", blend.is_file(), "candidate blend exists", str(blend))
            metadata_ok = metadata_path.is_file()
            check(f"M6-STUDY-{round_name.upper()}-{candidate_id}-METADATA", metadata_ok, "candidate render metadata exists", str(metadata_path))
            if not metadata_ok:
                continue
            metadata_count += 1
            metadata = read_json(metadata_path)
            check(f"M6-STUDY-{candidate_id}-STATUS", metadata.get("status") == "study-only", "candidate metadata remains study-only")
            check(f"M6-STUDY-{candidate_id}-IDENTITY", metadata.get("candidateId") == candidate_id and metadata.get("round") == round_name, "candidate metadata identity matches manifest")
            check(f"M6-STUDY-{candidate_id}-VARIABLE", metadata.get("intentionalVariable") in definition["allowedVariables"], "candidate variable is declared for its round", metadata.get("intentionalVariable"))
            check(f"M6-STUDY-{candidate_id}-CHEMISTRY", metadata.get("noChemistry") is True, "candidate metadata records no chemistry state")
            check(f"M6-STUDY-{candidate_id}-SOURCE-HASH", metadata.get("baseSourceBlend", {}).get("sha256") == expected_source_hash, "candidate records the current base source hash")
            missing = [name for name in RENDER_FILES if not (candidate_root / "renders" / name).is_file()]
            check(f"M6-STUDY-{candidate_id}-RENDER-MATRIX", not missing, "all required candidate renders exist", {"missing": missing})
            effective = metadata.get("backend", {}).get("effective")
            check(f"M6-STUDY-{candidate_id}-BACKEND", effective in {"OPTIX", "CPU"}, "candidate backend is recorded as preferred or fallback", effective)

    check("M6-STUDY-CANDIDATE-COUNT", candidate_count == 11, "all 11 candidates are enumerated", candidate_count)
    check("M6-STUDY-METADATA-COUNT", metadata_count == 11, "all 11 candidates have metadata", metadata_count)
    for round_name in manifest["rounds"]:
        contact = output_root / round_name / "contact-sheet.json"
        check(f"M6-STUDY-{round_name.upper()}-CONTACT-SHEET", contact.is_file(), "round contact sheet metadata exists", str(contact))
    ab_report = output_root / "ab" / "ab-report.json"
    check("M6-STUDY-AB-COMPARISON", ab_report.is_file(), "matched rejected-SVG A/B report exists", str(ab_report))
    backend_report = output_root / "backend-comparison" / "F03-optix-vs-cpu.json"
    backend_ok = False
    backend_details: Any = str(backend_report)
    if backend_report.is_file():
        comparison = read_json(backend_report)
        image_names = set(comparison.get("images", {}).keys())
        backend_ok = image_names == set(RENDER_FILES)
        backend_details = {"path": str(backend_report), "images": sorted(image_names)}
    check("M6-STUDY-BACKEND-COMPARISON", backend_ok, "OptiX/CPU comparison covers the required render matrix", backend_details)
    check("M6-STUDY-UNIQUE-OUTPUT-IDS", len(all_candidate_ids) == len(set(all_candidate_ids)), "candidate output IDs are unique")
    return {"status": "PASS" if not failures else "FAIL", "checks": checks, "failures": failures}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--require-outputs", action="store_true")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    try:
        report = validate_manifest(args.manifest.resolve())
        if args.require_outputs and report["status"] == "PASS":
            outputs = validate_outputs(args.manifest.resolve())
            report["outputChecks"] = outputs["checks"]
            report["failures"].extend(outputs["failures"])
            report["status"] = "PASS" if not report["failures"] else "FAIL"
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(json.dumps({"status": "FAIL", "failures": [str(error)]}, indent=2))
        return 1
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
