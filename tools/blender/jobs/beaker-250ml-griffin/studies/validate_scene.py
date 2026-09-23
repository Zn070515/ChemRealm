"""Blender-side structural QA for one controlled-study candidate scene."""

import argparse
import json
import sys
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[5]


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--round", required=True, choices=["form", "glass", "lighting"])
    parser.add_argument("--candidate", required=True)
    parser.add_argument("--report", type=Path)
    return parser.parse_args(argv)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def repo_path(relative):
    return ROOT / relative


def candidate_path(manifest, round_name, candidate_id):
    return repo_path(manifest["outputRoot"]) / manifest["studyId"] / round_name / candidate_id / "candidate.blend"


def main():
    args = parse_args()
    manifest = read_json(args.manifest.resolve())
    job = read_json(repo_path(manifest["baseJob"]))
    measurement = read_json(repo_path(job["measurementSheet"]))
    construction = read_json(repo_path(job["constructionSource"]))
    record = next(item for item in construction["specifications"] if item["specificationId"] == manifest["assetId"])
    path = candidate_path(manifest, args.round, args.candidate)
    bpy.ops.wm.open_mainfile(filepath=str(path))
    failures = []
    checks = []

    def check(check_id, ok, message, details=None):
        checks.append({"id": check_id, "status": "PASS" if ok else "FAIL", "message": message, "details": details})
        if not ok:
            failures.append(f"{check_id}: {message}")

    scene = bpy.context.scene
    check("M6-STUDY-SCENE-STATUS", scene.get("chemrealm_study_status") == "study-only", "scene is study-only")
    check("M6-STUDY-SCENE-ASSET", scene.get("chemrealm_asset_id") == manifest["assetId"], "scene asset identity matches manifest")
    check("M6-STUDY-SCENE-ROUND", scene.get("chemrealm_study_round") == args.round, "scene round matches requested round")
    check("M6-STUDY-SCENE-CANDIDATE", scene.get("chemrealm_study_candidate_id") == args.candidate, "scene candidate matches requested candidate")
    check("M6-STUDY-NO-CHEMISTRY", scene.get("chemrealm_study_no_chemistry") is True, "scene explicitly contains no chemistry state")

    required = set(job["requiredObjectNames"])
    missing = sorted(name for name in required if bpy.data.objects.get(name) is None)
    check("M6-STUDY-SEMANTIC-IDS", not missing, "required semantic objects remain present", {"missing": missing})
    forbidden = sorted(
        obj.name for obj in bpy.data.objects
        if any(token in obj.name.lower() for token in ("liquid", "indicator", "species", "reaction", "solute"))
    )
    check("M6-STUDY-NO-CHEMISTRY-OBJECTS", not forbidden, "candidate has no chemistry-named object", {"forbidden": forbidden})

    mesh_objects = [obj for obj in bpy.data.objects if obj.type == "MESH" and obj.name != "stage__background"]
    if mesh_objects:
        world_vertices = [obj.matrix_world @ vertex.co for obj in mesh_objects for vertex in obj.data.vertices]
        mins = [min(value[axis] for value in world_vertices) for axis in range(3)]
        maxs = [max(value[axis] for value in world_vertices) for axis in range(3)]
        axis_sizes = [(maxs[index] - mins[index]) * 1000.0 for index in range(3)]
        actual = [axis_sizes[0], axis_sizes[2], axis_sizes[1]]
        expected = record["physicalEnvelopeMm"]
        envelope_ok = all(abs(actual[index] - float(expected[index])) <= 1.5 for index in range(3))
        check("M6-STUDY-PHYSICAL-ENVELOPE", envelope_ok, "candidate mesh remains within the established source-envelope tolerance", {"actualMm": actual, "expectedMm": expected, "toleranceMm": 1.5})
    else:
        check("M6-STUDY-PHYSICAL-ENVELOPE", False, "candidate has no mesh objects")

    report = {
        "status": "PASS" if not failures else "FAIL",
        "studyId": manifest["studyId"],
        "round": args.round,
        "candidateId": args.candidate,
        "checks": checks,
        "failures": failures,
    }
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if not failures else 1


sys.exit(main())
