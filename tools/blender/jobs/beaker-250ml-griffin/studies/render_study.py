"""Render isolated M6 visual-study candidates using the central toolchain."""

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[5]


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--round", required=True, choices=["form", "glass", "lighting"])
    parser.add_argument("--candidate", default=None)
    parser.add_argument("--device", default=os.environ.get("CHEMREALM_BLENDER_DEVICE"))
    parser.add_argument("--output-suffix", default="")
    return parser.parse_args(argv)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def hash_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def repo_path(relative):
    return ROOT / relative


def blender_text(value):
    return value.decode("utf-8", errors="replace") if isinstance(value, bytes) else str(value)


def configure_device(device):
    preferences = bpy.context.preferences.addons["cycles"].preferences
    scene = bpy.context.scene
    scene.cycles.device = "GPU" if device != "CPU" else "CPU"
    if device == "CPU":
        return {"requested": "CPU", "effective": "CPU"}
    preferences.compute_device_type = device
    preferences.get_devices()
    for item in preferences.devices:
        item.use = item.type == device
    if not any(item.use and item.type == device for item in preferences.devices):
        scene.cycles.device = "CPU"
        return {"requested": device, "effective": "CPU", "fallback": True}
    return {"requested": device, "effective": device, "fallback": False}


def set_material_color(material, color):
    if material is None or not material.use_nodes:
        return
    node = material.node_tree.nodes.get("Principled BSDF")
    if node is not None:
        node.inputs["Base Color"].default_value = (*color, 1.0)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def configure_camera(camera, target, scale):
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = scale / 1000.0
    look_at(camera, Vector(target) / 1000.0)


def render_one(scene, camera, output, resolution, background, transparent, target, scale):
    configure_camera(camera, target, scale)
    scene.camera = camera
    scene.render.resolution_x, scene.render.resolution_y = resolution
    scene.render.film_transparent = transparent
    stage = bpy.data.objects.get("stage__background")
    if stage is not None:
        stage.hide_render = transparent
    backdrop = bpy.data.materials.get("material__backdrop")
    if background == "light-neutral":
        set_material_color(backdrop, (0.72, 0.74, 0.75))
    else:
        set_material_color(backdrop, (0.035, 0.045, 0.055))
    output.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)
    if not output.exists():
        raise RuntimeError(f"Blender did not produce {output}")
    return {"path": str(output.relative_to(ROOT)).replace("\\", "/"), "sha256": hash_file(output), "bytes": output.stat().st_size}


def render_candidate(manifest, round_name, candidate_id, device, output_suffix=""):
    toolchain = read_json(ROOT / "tools/blender/toolchain.json")
    candidate_root = repo_path(manifest["outputRoot"]) / manifest["studyId"] / round_name / candidate_id
    base = candidate_root.parent / f"{candidate_id}{output_suffix}"
    blend = candidate_root / "candidate.blend"
    if not blend.exists():
        raise RuntimeError(f"missing candidate blend: {blend}")
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    scene = bpy.context.scene
    effective_device = configure_device(device or toolchain["render"]["preferredDevice"])
    scene.render.engine = toolchain["render"]["engine"]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = toolchain["render"]["outputFormat"]
    scene.render.image_settings.color_mode = toolchain["render"]["outputColor"]
    scene.view_settings.view_transform = toolchain["render"]["colorManagement"]["viewTransform"]
    scene.view_settings.look = toolchain["render"]["colorManagement"]["look"]
    scene.view_settings.exposure = toolchain["render"]["colorManagement"]["exposure"]
    scene.view_settings.gamma = toolchain["render"]["colorManagement"]["gamma"]
    scene.cycles.samples = toolchain["render"]["cycles"]["samples"]
    scene.cycles.use_denoising = toolchain["render"]["cycles"]["useDenoise"]
    camera = bpy.data.objects.get("camera__experiment-world")
    if camera is None:
        raise RuntimeError("missing camera__experiment-world")
    resolution = toolchain["render"]["resolution"]
    outputs = []
    outputs.append(render_one(scene, camera, base / "renders/front-light.png", resolution["front"], "light-neutral", False, (0, 0, 47.5), 165))
    outputs.append(render_one(scene, camera, base / "renders/front-dark.png", resolution["front"], "dark-neutral", False, (0, 0, 47.5), 165))
    outputs.append(render_one(scene, camera, base / "renders/thumbnail-light.png", resolution["thumbnail"], "light-neutral", False, (0, 0, 47.5), 125))
    outputs.append(render_one(scene, camera, base / "renders/thumbnail-dark.png", resolution["thumbnail"], "dark-neutral", False, (0, 0, 47.5), 125))
    outputs.append(render_one(scene, camera, base / "renders/closeup-rim.png", resolution["closeup"], "light-neutral", False, (0, 0, 87), 46))
    outputs.append(render_one(scene, camera, base / "renders/closeup-spout.png", resolution["closeup"], "dark-neutral", False, (40, 0, 86), 52))
    outputs.append(render_one(scene, camera, base / "renders/alpha-check.png", resolution["alpha"], "light-neutral", True, (0, 0, 47.5), 165))
    metadata = {
        "schemaVersion": 1,
        "studyId": scene.get("chemrealm_study_id"),
        "round": scene.get("chemrealm_study_round"),
        "candidateId": scene.get("chemrealm_study_candidate_id"),
        "status": scene.get("chemrealm_study_status"),
        "intentionalVariable": scene.get("chemrealm_study_intentional_variable"),
        "noChemistry": scene.get("chemrealm_study_no_chemistry") is True,
        "backend": effective_device,
        "blender": {"version": blender_text(bpy.app.version_string), "buildHash": blender_text(bpy.app.build_hash)},
        "render": toolchain["render"],
        "baseSourceBlend": {"path": manifest["sourceBlend"], "sha256": hash_file(repo_path(manifest["sourceBlend"]))},
        "sourceBlend": {"path": str(blend.relative_to(ROOT)).replace("\\", "/"), "sha256": hash_file(blend)},
        "outputs": outputs,
    }
    metadata_path = base / "render-metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"STUDY_RENDER_OK round={round_name} candidate={candidate_id} device={effective_device['effective']} outputs={len(outputs)}")


args = parse_args()
manifest = read_json(args.manifest.resolve())
candidate_ids = [args.candidate] if args.candidate else manifest["rounds"][args.round]["candidateIds"]
toolchain = read_json(ROOT / "tools/blender/toolchain.json")
for candidate_id in candidate_ids:
    render_candidate(manifest, args.round, candidate_id, args.device or toolchain["render"]["preferredDevice"], args.output_suffix)
