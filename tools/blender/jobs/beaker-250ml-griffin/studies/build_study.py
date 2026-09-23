"""Build isolated Blender candidate scenes for the M6 visual study."""

import argparse
import json
import sys
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[5]
SCRIPT_DIR = Path(__file__).resolve().parent


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--round", required=True, choices=["form", "glass", "lighting"])
    parser.add_argument("--base-form", default=None)
    parser.add_argument("--base-glass", default=None)
    return parser.parse_args(argv)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def repo_path(relative):
    return ROOT / relative


def mesh_scale_z(object_name, scale, center_z_mm=None):
    obj = bpy.data.objects.get(object_name)
    if obj is None or obj.type != "MESH":
        raise RuntimeError(f"missing mesh for study variant: {object_name}")
    vertices = obj.data.vertices
    center = center_z_mm / 1000.0 if center_z_mm is not None else sum(v.co.z for v in vertices) / len(vertices)
    for vertex in vertices:
        vertex.co.z = center + ((vertex.co.z - center) * scale)
    obj.data.update()


def apply_form(candidate_id, variants):
    variant = variants["form"][candidate_id]
    if "spoutZScale" in variant:
        mesh_scale_z("part__vessel.spout", variant["spoutZScale"], 91.5)
    if "rimZScale" in variant:
        mesh_scale_z("part__vessel.rim", variant["rimZScale"], 93.0)
    if "baseZScale" in variant:
        mesh_scale_z("part__vessel.base", variant["baseZScale"], 0.0)


def set_principled_color(material_name, color):
    material = bpy.data.materials.get(material_name)
    if material is None or not material.use_nodes:
        raise RuntimeError(f"missing study material: {material_name}")
    node = material.node_tree.nodes.get("Principled BSDF")
    if node is None:
        raise RuntimeError(f"missing Principled BSDF in {material_name}")
    node.inputs["Base Color"].default_value = (*color[:3], color[3] if len(color) > 3 else 1.0)


def set_mix_factor(material_name, value):
    material = bpy.data.materials.get(material_name)
    if material is None or not material.use_nodes:
        raise RuntimeError(f"missing study material: {material_name}")
    node = material.node_tree.nodes.get("Mix Shader")
    if node is None:
        raise RuntimeError(f"missing Mix Shader in {material_name}")
    node.inputs["Factor"].default_value = value


def apply_glass(candidate_id, variants):
    variant = variants["glass"][candidate_id]
    set_mix_factor("material__clear-borosilicate", variant["bodyMix"])
    set_mix_factor("material__glass-edge", variant["edgeMix"])
    set_principled_color("material__clear-borosilicate", variant["bodyColor"])
    set_principled_color("material__glass-edge", variant["edgeColor"])


def apply_lighting(candidate_id, variants):
    variant = variants["lighting"][candidate_id]
    values = {
        "light__key": (variant["keyEnergy"], variant["keyLocation"]),
        "light__fill": (variant["fillEnergy"], variant["fillLocation"]),
        "light__rim": (variant["rimEnergy"], variant["rimLocation"]),
    }
    for name, (energy, location) in values.items():
        light = bpy.data.objects.get(name)
        if light is None or light.type != "LIGHT":
            raise RuntimeError(f"missing study light: {name}")
        light.data.energy = energy
        light.location = tuple(location)


def set_clay_material():
    material = bpy.data.materials.get("material__study-clay") or bpy.data.materials.new("material__study-clay")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    principled = nodes.get("Principled BSDF")
    if principled is None:
        principled = nodes.new("ShaderNodeBsdfPrincipled")
    principled.inputs["Base Color"].default_value = (0.43, 0.45, 0.46, 1.0)
    principled.inputs["Roughness"].default_value = 0.58
    for obj in bpy.data.objects:
        if obj.type in {"MESH", "CURVE", "FONT"} and obj.name != "stage__background":
            obj.data.materials.clear()
            obj.data.materials.append(material)


def candidate_id_for(round_name, args):
    if round_name == "form":
        return None
    if round_name == "glass":
        return args.base_glass
    return args.base_glass


def build(manifest_path, round_name, args):
    manifest = read_json(manifest_path)
    variants = read_json(SCRIPT_DIR / "study_variants.json")
    source_blend = repo_path(manifest["sourceBlend"])
    if not source_blend.is_file():
        raise RuntimeError(f"missing source blend: {source_blend}")

    form_id = args.base_form if round_name != "form" else None
    if round_name != "form" and form_id not in variants["form"]:
        raise RuntimeError(f"{round_name} requires a valid --base-form")
    if round_name == "lighting" and args.base_glass not in variants["glass"]:
        raise RuntimeError("lighting requires a valid --base-glass")

    for candidate_id in manifest["rounds"][round_name]["candidateIds"]:
        bpy.ops.wm.open_mainfile(filepath=str(source_blend))
        if form_id:
            apply_form(form_id, variants)
        if round_name == "form":
            apply_form(candidate_id, variants)
            set_clay_material()
        elif round_name == "glass":
            apply_glass(candidate_id, variants)
        else:
            apply_glass(args.base_glass, variants)
            apply_lighting(candidate_id, variants)

        variant = variants[round_name][candidate_id]
        scene = bpy.context.scene
        scene["chemrealm_study_id"] = manifest["studyId"]
        scene["chemrealm_study_round"] = round_name
        scene["chemrealm_study_candidate_id"] = candidate_id
        scene["chemrealm_study_intentional_variable"] = variant["variable"]
        scene["chemrealm_study_status"] = "study-only"
        scene["chemrealm_study_base_form"] = form_id or candidate_id
        scene["chemrealm_study_base_glass"] = args.base_glass if round_name == "lighting" else (candidate_id if round_name == "glass" else "clay-neutral")
        scene["chemrealm_study_no_chemistry"] = True

        candidate_root = repo_path(manifest["outputRoot"]) / manifest["studyId"] / round_name / candidate_id
        candidate_root.mkdir(parents=True, exist_ok=True)
        output = candidate_root / "candidate.blend"
        bpy.ops.wm.save_as_mainfile(filepath=str(output))
        print(f"STUDY_BUILD_OK round={round_name} candidate={candidate_id} output={output}")


args = parse_args()
build(args.manifest.resolve(), args.round, args)
