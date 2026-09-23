import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[4]


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--job", default=str(Path(__file__).with_name("job.json")))
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def repo_path(relative):
    return ROOT / relative


def hash_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return f"sha256:{digest.hexdigest()}"


def blender_text(value):
    return value.decode("utf-8", errors="replace") if isinstance(value, bytes) else str(value)


class Report:
    def __init__(self):
        self.checks = []

    def add(self, check_id, status, message, severity="P2", evidence=None):
        self.checks.append({
            "id": check_id,
            "status": status,
            "severity": severity,
            "message": message,
            "evidence": evidence or {},
        })

    @property
    def blocking(self):
        return [item for item in self.checks if item["status"] == "FAIL" and item["severity"] in {"P0", "P1"}]


def world_bounds_mm():
    points = []
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or obj.name == "stage__background":
            continue
        for corner in obj.bound_box:
            points.append(obj.matrix_world @ Vector(corner))
    if not points:
        return None
    return {
        "min": [min(item[index] for item in points) * 1000 for index in range(3)],
        "max": [max(item[index] for item in points) * 1000 for index in range(3)],
        "size": [(max(item[index] for item in points) - min(item[index] for item in points)) * 1000 for index in range(3)],
    }


def main(job_path):
    job = read_json(job_path)
    toolchain = read_json(ROOT / "tools/blender/toolchain.json")
    source = read_json(repo_path(job["constructionSource"]))
    measurement = read_json(repo_path(job["measurementSheet"]))
    record = next(item for item in source["specifications"] if item["specificationId"] == job["assetId"])
    report = Report()
    actual_blender = ".".join(str(item) for item in bpy.app.version)
    actual_build_hash = blender_text(bpy.app.build_hash)
    report.add("M6-BLENDER-TOOLCHAIN", "PASS" if actual_blender == toolchain["blender"]["version"] and actual_build_hash == toolchain["blender"]["buildHash"] else "FAIL", "Blender build matches central toolchain identity", "P1", {"expected": toolchain["blender"], "actual": {"version": actual_blender, "buildHash": actual_build_hash}})
    report.add("M6-ASSET-ID", "PASS" if bpy.context.scene.get("chemrealm_asset_id") == job["assetId"] else "FAIL", "scene asset identity matches the job", "P1")
    units = bpy.context.scene.unit_settings
    unit_ok = units.system == "METRIC" and units.length_unit == "MILLIMETERS" and abs(units.scale_length - 0.001) < 1e-9
    report.add("M6-UNIT-SCALE", "PASS" if unit_ok else "FAIL", "scene uses metric millimetre display scale", "P1", {"system": units.system, "lengthUnit": units.length_unit, "scaleLength": units.scale_length})

    objects = {item.name: item for item in bpy.context.scene.objects}
    missing = [name for name in job["requiredObjectNames"] if name not in objects]
    report.add("M6-OBJECTS", "PASS" if not missing else "FAIL", "required named objects exist", "P1", {"missing": missing})
    part_ids = [item.get("chemrealm_part_id") for item in bpy.context.scene.objects if item.get("chemrealm_asset_id") == job["assetId"]]
    duplicate_ids = sorted({item for item in part_ids if item is not None and part_ids.count(item) > 1})
    missing_ids = [item for item in job["requiredPartIds"] if item not in part_ids]
    report.add("M6-SEMANTIC-IDS", "PASS" if not duplicate_ids and not missing_ids else "FAIL", "semantic part IDs are unique and complete", "P1", {"duplicates": duplicate_ids, "missing": missing_ids})

    bounds = world_bounds_mm()
    expected = record["physicalEnvelopeMm"]
    actual_envelope = None if bounds is None else [bounds["size"][0], bounds["size"][2], bounds["size"][1]]
    size_ok = actual_envelope is not None and all(abs(actual_envelope[index] - expected[index]) <= 1.5 for index in range(3))
    report.add("M6-PHYSICAL-ENVELOPE", "PASS" if size_ok else "FAIL", "mesh envelope stays within source-backed physical dimensions", "P1", {"expectedMm": expected, "actualMm": actual_envelope, "axisAlignedBoundsMm": bounds})
    report.add("M6-CAPACITY-IDENTITY", "PASS" if record["capacityMl"] == 250 and measurement["assetId"] == job["assetId"] else "FAIL", "nominal capacity is read from existing ChemRealm source records", "P1", {"capacityMl": record["capacityMl"], "measurementAssetId": measurement["assetId"]})

    materials_missing = [item.name for item in bpy.context.scene.objects if item.type == "MESH" and item.name != "stage__background" and len(item.data.materials) == 0]
    report.add("M6-MATERIALS", "PASS" if not materials_missing else "FAIL", "renderable apparatus meshes have explicit materials", "P1", {"missing": materials_missing})
    unresolved = [image.filepath for image in bpy.data.images if image.filepath and not Path(bpy.path.abspath(image.filepath)).exists()]
    report.add("M6-EXTERNAL-DEPENDENCIES", "PASS" if not unresolved else "FAIL", "no unresolved external image dependencies", "P1", {"unresolved": unresolved})
    embedded_text = [item.name for item in bpy.data.texts]
    drivers = [item.name for item in bpy.context.scene.objects if item.animation_data and item.animation_data.drivers]
    report.add("M6-SCRIPT-DRIVER-REVIEW", "PASS" if not embedded_text and not drivers else "FAIL", "source contains no embedded text scripts or drivers", "P1", {"embeddedTexts": embedded_text, "drivers": drivers})
    modifiers = {obj.name: [modifier.type for modifier in obj.modifiers] for obj in bpy.context.scene.objects if obj.modifiers}
    forbidden_modifiers = {name: values for name, values in modifiers.items() if any(value not in {"BEVEL"} for value in values)}
    report.add("M6-MODIFIERS", "PASS" if not forbidden_modifiers else "FAIL", "only declared controlled bevel modifiers remain unapplied", "P2", {"modifiers": modifiers, "forbidden": forbidden_modifiers})
    camera = objects.get("camera__experiment-world")
    report.add("M6-ORTHOGRAPHIC-CAMERA", "PASS" if camera is not None and camera.data.type == "ORTHO" else "FAIL", "experiment camera is orthographic", "P1")

    if job.get("profileSnapshot") is None:
        report.add("M6-PROFILE-BOUNDARY", "DEFERRED", "current beaker source has no frozen VolumeProfileSnapshot; Blender does not generate one", "P2", {"owner": "ChemRealm World/Representation boundary"})
    else:
        report.add("M6-PROFILE-BOUNDARY", "DEFERRED", "profile validation is delegated to the supplied frozen snapshot", "P2", {"profile": job["profileSnapshot"]})
    report.add("M6-MARKING-BOUNDARY", "PASS" if job["visualAssumptions"]["markingIsApproximate"] else "FAIL", "beaker graduations remain explicitly approximate-contained visual marks", "P1")

    metadata_path = repo_path(job["qaRoot"]) / "render-metadata.json"
    outputs = {}
    missing_outputs = []
    metadata = None
    if metadata_path.exists():
        metadata = read_json(metadata_path)
        for item in metadata.get("outputs", []):
            output = ROOT / item["path"]
            if output.exists():
                outputs[item["path"]] = {"sha256": hash_file(output), "bytes": output.stat().st_size}
            else:
                missing_outputs.append(item["path"])
    else:
        missing_outputs = list(job["renderOutputs"])
    report.add("M6-RENDER-MATRIX", "PASS" if not missing_outputs else "DEFERRED", "required render outputs are present when render job has run", "P2", {"missing": missing_outputs, "outputs": outputs})
    if metadata is None:
        report.add("M6-RENDER-BACKEND", "DEFERRED", "render backend is recorded after the render job runs", "P2")
    else:
        device = metadata.get("device", {})
        accepted_devices = {toolchain["render"]["preferredDevice"], toolchain["render"]["fallbackDevice"]}
        effective = device.get("effective")
        report.add("M6-RENDER-BACKEND", "PASS" if effective in accepted_devices else "FAIL", "render backend is explicit and recorded", "P1", {"requested": device.get("requested"), "effective": effective, "accepted": sorted(accepted_devices)})

    blend_path = repo_path(job["blendOutput"])
    inputs = {
        "job": {"path": str(job_path.relative_to(ROOT)).replace("\\", "/"), "sha256": hash_file(job_path)},
        "constructionSource": {"path": job["constructionSource"], "sha256": hash_file(repo_path(job["constructionSource"]))},
        "measurementSheet": {"path": job["measurementSheet"], "sha256": hash_file(repo_path(job["measurementSheet"]))},
        "blend": {"path": job["blendOutput"], "sha256": hash_file(blend_path)} if blend_path.exists() else None,
    }
    blocking = report.blocking
    status = "FAIL" if blocking else ("PASS_WITH_DEFERRED" if any(item["status"] == "DEFERRED" for item in report.checks) else "PASS")
    payload = {
        "schemaVersion": job["schemaVersion"],
        "assetId": job["assetId"],
        "jobId": job["jobId"],
        "status": status,
        "candidateOnly": True,
        "inputs": inputs,
        "outputs": outputs,
        "toolchain": toolchain,
        "checks": report.checks,
    }
    report_path = repo_path(job["qaRoot"]) / "validation.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    for item in report.checks:
        print(f"{item['status']:<16} {item['id']}: {item['message']}")
    print(f"QA_REPORT {report_path}")
    if blocking:
        raise SystemExit(1)


args = parse_args()
main(Path(args.job).resolve())
