import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[4]


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--job", default=str(Path(__file__).with_name("job.json")))
    parser.add_argument("--device", default=os.environ.get("CHEMREALM_BLENDER_DEVICE"))
    parser.add_argument("--output-subdir", default="renders")
    parser.add_argument("--metadata-name", default="render-metadata.json")
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


def configure_device(device):
    requested = device.upper()
    scene = bpy.context.scene
    if scene.render.engine != "CYCLES":
        return {"requested": requested, "effective": "CPU", "devices": []}
    preferences = bpy.context.preferences.addons["cycles"].preferences
    preferences.get_devices()
    devices = list(preferences.devices)
    available = [{"name": item.name, "type": item.type} for item in devices]
    if requested == "CPU":
        scene.cycles.device = "CPU"
        for item in devices:
            item.use = item.type == "CPU"
        return {"requested": requested, "effective": "CPU", "devices": available}
    candidates = [item for item in devices if item.type == requested]
    if not candidates:
        raise RuntimeError(f"requested Cycles device {requested} is unavailable: {available}")
    scene.cycles.device = "GPU"
    for item in devices:
        item.use = item.type == requested
    return {"requested": requested, "effective": requested, "devices": available}


def set_material_color(material, color):
    if material is None or not material.use_nodes:
        return
    node = material.node_tree.nodes.get("Principled BSDF")
    if node is None:
        return
    socket = node.inputs.get("Base Color")
    if socket is not None:
        socket.default_value = (*color, 1.0)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def configure_camera(camera, target, ortho_scale):
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = ortho_scale / 1000.0
    look_at(camera, Vector(target) / 1000.0)


def render_one(scene, camera, output, resolution, background, transparent, target, ortho_scale):
    configure_camera(camera, target, ortho_scale)
    scene.camera = camera
    scene.render.resolution_x, scene.render.resolution_y = resolution
    scene.render.film_transparent = transparent
    scene.render.filepath = str(output)
    stage = bpy.data.objects.get("stage__background")
    if stage is not None:
        stage.hide_render = transparent
    backdrop = bpy.data.materials.get("material__backdrop")
    if background == "light-neutral":
        set_material_color(backdrop, (0.72, 0.74, 0.75))
        scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.45, 0.47, 0.50, 1)
    else:
        set_material_color(backdrop, (0.035, 0.045, 0.055))
        scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.012, 0.016, 0.022, 1)
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.render.render(write_still=True)
    if not output.exists():
        raise RuntimeError(f"Blender did not produce {output}")
    return {
        "path": str(output.relative_to(ROOT)).replace("\\", "/"),
        "sha256": hash_file(output),
        "resolution": list(resolution),
        "background": background,
        "transparent": transparent,
        "targetMm": list(target),
        "orthoScaleMm": ortho_scale,
    }


def main(job_path, device):
    job = read_json(job_path)
    toolchain = read_json(ROOT / "tools/blender/toolchain.json")
    device = device or toolchain["render"]["preferredDevice"]
    scene = bpy.context.scene
    scene.render.engine = toolchain["render"]["engine"]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = toolchain["render"]["outputFormat"]
    scene.render.image_settings.color_mode = toolchain["render"]["outputColor"]
    scene.view_settings.view_transform = toolchain["render"]["colorManagement"]["viewTransform"]
    scene.view_settings.look = toolchain["render"]["colorManagement"]["look"]
    scene.view_settings.exposure = toolchain["render"]["colorManagement"]["exposure"]
    scene.view_settings.gamma = toolchain["render"]["colorManagement"]["gamma"]
    if scene.render.engine == "CYCLES":
        scene.cycles.samples = toolchain["render"]["cycles"]["samples"]
        scene.cycles.use_denoising = toolchain["render"]["cycles"]["useDenoise"]
    device_record = configure_device(device)
    camera = bpy.data.objects.get("camera__experiment-world")
    if camera is None:
        raise RuntimeError("missing camera__experiment-world")
    render_root = repo_path(job["qaRoot"]) / args.output_subdir
    resolution = toolchain["render"]["resolution"]
    outputs = []
    outputs.append(render_one(scene, camera, render_root / "front-light.png", resolution["front"], "light-neutral", False, (0, 0, 47.5), 165))
    outputs.append(render_one(scene, camera, render_root / "front-dark.png", resolution["front"], "dark-neutral", False, (0, 0, 47.5), 165))
    outputs.append(render_one(scene, camera, render_root / "thumbnail-light.png", resolution["thumbnail"], "light-neutral", False, (0, 0, 47.5), 125))
    outputs.append(render_one(scene, camera, render_root / "thumbnail-dark.png", resolution["thumbnail"], "dark-neutral", False, (0, 0, 47.5), 125))
    outputs.append(render_one(scene, camera, render_root / "closeup-rim.png", resolution["closeup"], "light-neutral", False, (0, 0, 87), 46))
    outputs.append(render_one(scene, camera, render_root / "closeup-spout.png", resolution["closeup"], "dark-neutral", False, (40, 0, 86), 52))
    outputs.append(render_one(scene, camera, render_root / "alpha-check.png", resolution["alpha"], "light-neutral", True, (0, 0, 47.5), 165))
    metadata = {
        "schemaVersion": job["schemaVersion"],
        "assetId": job["assetId"],
        "jobId": job["jobId"],
        "blender": {
            "version": ".".join(str(item) for item in bpy.app.version),
            "buildHash": blender_text(bpy.app.build_hash),
            "branch": blender_text(bpy.app.build_branch),
        },
        "device": device_record,
        "render": toolchain["render"],
        "outputs": outputs,
    }
    metadata_path = repo_path(job["qaRoot"]) / args.metadata_name
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"RENDER_OK device={device_record['effective']} outputs={len(outputs)} metadata={metadata_path}")


args = parse_args()
main(Path(args.job).resolve(), args.device)
