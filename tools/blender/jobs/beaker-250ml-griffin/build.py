import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[4]
MM = 0.001


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def repo_path(relative):
    return ROOT / relative


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--job", default=str(Path(__file__).with_name("job.json")))
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])


def mm(value):
    return float(value) * MM


def set_input(nodes, name, value):
    socket = nodes.get(name)
    if socket is not None:
        socket.default_value = value


def material(name, base_color, roughness=0.2, metallic=0.0, transmission=0.0, alpha=1.0):
    result = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    result.use_nodes = True
    nodes = result.node_tree.nodes.get("Principled BSDF")
    set_input(nodes.inputs, "Base Color", (*base_color, 1.0))
    set_input(nodes.inputs, "Roughness", roughness)
    set_input(nodes.inputs, "Metallic", metallic)
    set_input(nodes.inputs, "Transmission Weight", transmission)
    set_input(nodes.inputs, "IOR", 1.46)
    set_input(nodes.inputs, "Alpha", alpha)
    return result


def glass_material(name, base_color, mix_factor):
    result = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    result.use_nodes = True
    nodes = result.node_tree.nodes
    links = result.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    transparent = nodes.new("ShaderNodeBsdfTransparent")
    principled = nodes.new("ShaderNodeBsdfPrincipled")
    set_input(principled.inputs, "Base Color", (*base_color, 1.0))
    set_input(principled.inputs, "Roughness", 0.16)
    set_input(principled.inputs, "Transmission Weight", 0.18)
    set_input(principled.inputs, "IOR", 1.46)
    mix = nodes.new("ShaderNodeMixShader")
    mix.inputs[0].default_value = mix_factor
    links.new(transparent.outputs[0], mix.inputs[1])
    links.new(principled.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], output.inputs[0])
    return result


def tag(obj, asset_id, part_id, role):
    obj["chemrealm_asset_id"] = asset_id
    obj["chemrealm_part_id"] = part_id
    obj["chemrealm_role"] = role
    return obj


def mesh_object(name, vertices, faces, mat, asset_id, part_id, role, parent):
    mesh = bpy.data.meshes.new(name + "__mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.validate(verbose=False)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    tag(obj, asset_id, part_id, role)
    obj.parent = parent
    return obj


def add_bevel(obj, width_mm, segments=3):
    modifier = obj.modifiers.new("controlled-edge-rounding", "BEVEL")
    modifier.width = mm(width_mm)
    modifier.segments = segments
    modifier.limit_method = "ANGLE"


def shell(name, outer_radius_mm, wall_mm, bottom_mm, top_mm, segments, mat, asset_id, part_id, role, parent):
    outer = mm(outer_radius_mm)
    inner = mm(outer_radius_mm - wall_mm)
    bottom = mm(bottom_mm)
    top = mm(top_mm)
    vertices = []
    for z, radius in ((bottom, outer), (top, outer), (top, inner), (bottom, inner)):
        for index in range(segments):
            angle = math.tau * index / segments
            vertices.append((radius * math.cos(angle), radius * math.sin(angle), z))
    faces = []
    for index in range(segments):
        nxt = (index + 1) % segments
        faces.extend([
            (index, nxt, segments + nxt, segments + index),
            (2 * segments + index, 2 * segments + nxt, 3 * segments + nxt, 3 * segments + index),
            (index, 3 * segments + index, 3 * segments + nxt, nxt),
        ])
    obj = mesh_object(name, vertices, faces, mat, asset_id, part_id, role, parent)
    add_bevel(obj, 0.35, 2)
    return obj


def rounded_rim(name, major_radius_mm, tube_radius_mm, z_mm, segments, mat, asset_id, part_id, role, parent):
    major = mm(major_radius_mm)
    minor = mm(tube_radius_mm)
    z = mm(z_mm)
    vertices = []
    for major_index in range(segments):
        theta = math.tau * major_index / segments
        for minor_index in range(10):
            phi = math.tau * minor_index / 10
            radius = major + minor * math.cos(phi)
            vertices.append((radius * math.cos(theta), radius * math.sin(theta), z + minor * math.sin(phi)))
    faces = []
    for major_index in range(segments):
        next_major = (major_index + 1) % segments
        for minor_index in range(10):
            next_minor = (minor_index + 1) % 10
            a = major_index * 10 + minor_index
            b = next_major * 10 + minor_index
            c = next_major * 10 + next_minor
            d = major_index * 10 + next_minor
            faces.append((a, b, c, d))
    return mesh_object(name, vertices, faces, mat, asset_id, part_id, role, parent)


def prism_spout(name, body_radius_mm, projection_mm, z_mm, rise_mm, depth_mm, mat, asset_id, part_id, role, parent):
    x0 = mm(body_radius_mm - 7)
    x1 = mm(body_radius_mm + projection_mm)
    z0 = mm(z_mm - 5)
    z1 = mm(z_mm + rise_mm)
    y = mm(depth_mm / 2)
    profile = [(x0, z0), (mm(body_radius_mm + 2), z0 + mm(2)), (x1, z1), (x1 - mm(3), z1 - mm(3)), (mm(body_radius_mm - 2), z0 + mm(1))]
    vertices = [(x, -y, z) for x, z in profile] + [(x, y, z) for x, z in profile]
    count = len(profile)
    faces = [tuple(range(count)), tuple(range(count, count * 2))[::-1]]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    obj = mesh_object(name, vertices, faces, mat, asset_id, part_id, role, parent)
    add_bevel(obj, 0.6, 3)
    return obj


def curve_object(name, points, bevel_mm, mat, asset_id, part_id, role, parent):
    curve = bpy.data.curves.new(name + "__curve", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = mm(bevel_mm)
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coordinate in zip(spline.points, points):
        point.co = (*coordinate, 1.0)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    curve.materials.append(mat)
    tag(obj, asset_id, part_id, role)
    obj.parent = parent
    return obj


def text_object(name, body, location, size_mm, mat, asset_id, part_id, parent):
    curve = bpy.data.curves.new(name + "__text", "FONT")
    curve.body = body
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = mm(size_mm)
    curve.extrude = mm(0.03)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler[0] = math.radians(90)
    curve.materials.append(mat)
    tag(obj, asset_id, part_id, "marking-label")
    obj.parent = parent
    return obj


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def make_camera(name, location, target, ortho_scale, parent=None):
    data = bpy.data.cameras.new(name + "__data")
    data.type = "ORTHO"
    data.ortho_scale = mm(ortho_scale)
    camera = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(camera)
    camera.location = tuple(mm(value) for value in location)
    look_at(camera, tuple(mm(value) for value in target))
    camera["chemrealm_camera_mode"] = "experiment-world" if name.endswith("world") else "measurement"
    if parent is not None:
        camera.parent = parent
    return camera


def make_light(name, location, energy, size_mm, color, parent):
    data = bpy.data.lights.new(name + "__data", "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = mm(size_mm)
    data.color = color
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = tuple(mm(value) for value in location)
    look_at(light, (0, 0, mm(42)))
    light.parent = parent
    return light


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)


def configure_scene(toolchain):
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = MM
    scene.unit_settings.length_unit = "MILLIMETERS"
    scene.render.engine = toolchain["render"]["engine"]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = toolchain["render"]["outputFormat"]
    scene.render.image_settings.color_mode = toolchain["render"]["outputColor"]
    scene.render.film_transparent = False
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = toolchain["render"]["colorManagement"]["viewTransform"]
    scene.view_settings.look = toolchain["render"]["colorManagement"]["look"]
    scene.view_settings.exposure = toolchain["render"]["colorManagement"]["exposure"]
    scene.view_settings.gamma = toolchain["render"]["colorManagement"]["gamma"]
    if scene.render.engine == "CYCLES":
        scene.cycles.samples = toolchain["render"]["cycles"]["samples"]
        scene.cycles.use_denoising = toolchain["render"]["cycles"]["useDenoise"]
        scene.cycles.max_bounces = 6
    world = bpy.data.worlds.new("world__beaker-review") if bpy.data.worlds.get("world__beaker-review") is None else bpy.data.worlds["world__beaker-review"]
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.03
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.08, 0.09, 0.1, 1)
    scene.world = world


def build(job_path):
    job = read_json(job_path)
    toolchain = read_json(ROOT / "tools/blender/toolchain.json")
    source = read_json(repo_path(job["constructionSource"]))
    measurement = read_json(repo_path(job["measurementSheet"]))
    record = next(item for item in source["specifications"] if item["specificationId"] == job["assetId"])
    if measurement["assetId"] != job["assetId"]:
        raise RuntimeError("measurement identity does not match job asset")

    clear_scene()
    configure_scene(toolchain)
    asset_id = job["assetId"]
    root = bpy.data.objects.new("asset__beaker-250ml", None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = mm(10)
    tag(root, asset_id, asset_id, "asset-root")
    bpy.context.collection.objects.link(root)

    glass = glass_material("material__clear-borosilicate", (0.06, 0.24, 0.32), 0.52)
    glass_edge = glass_material("material__glass-edge", (0.03, 0.14, 0.20), 0.72)
    marking = material("material__marking", (0.08, 0.11, 0.12), roughness=0.35)
    highlight = material("material__narrow-highlight", (0.92, 0.98, 1.0), roughness=0.08, transmission=0.15, alpha=0.84)
    backdrop = material("material__backdrop", (0.88, 0.89, 0.88), roughness=0.75)

    width_mm, total_height_mm, depth_mm = record["physicalEnvelopeMm"]
    body_diameter_mm = record["bodyEnvelopeMm"][0]
    landmarks = record["landmarksMm"]
    base_height = job["visualAssumptions"]["baseHeightMm"]
    wall_top = total_height_mm - 2
    shell("part__vessel.body", body_diameter_mm / 2, landmarks["wallThickness"], job["visualAssumptions"]["bottomThicknessMm"], wall_top, 96, glass, asset_id, "vessel.body", "vessel", root)
    rounded_rim("part__vessel.rim", body_diameter_mm / 2 - landmarks["wallThickness"] / 2, landmarks["rimThickness"] / 2, wall_top, 96, glass_edge, asset_id, "vessel.rim", "rim", root)
    prism_spout("part__vessel.spout", body_diameter_mm / 2, landmarks["spoutMaxProjection"], wall_top, job["visualAssumptions"]["spoutRiseMm"], job["visualAssumptions"]["spoutDepthMm"], glass, asset_id, "vessel.spout", "spout", root)

    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=mm(landmarks["flatBaseWidth"] / 2), depth=mm(base_height), location=(0, 0, mm(base_height / 2)))
    base = bpy.context.object
    base.name = "part__vessel.base"
    base.data.materials.append(glass_edge)
    tag(base, asset_id, "vessel.base", "base")
    base.parent = root
    add_bevel(base, 0.6, 3)

    scale_y = -mm(body_diameter_mm / 2 + 0.55)
    scale_start = landmarks["markingStartHeight"]
    scale_end = job["visualAssumptions"]["markingTopMm"]
    scale_obj = bpy.data.objects.new("layer__scale", None)
    bpy.context.collection.objects.link(scale_obj)
    tag(scale_obj, asset_id, "vessel.scale", "scale")
    scale_obj.parent = root
    for value in range(int(record["marking"]["displayRangeMl"]["minimum"]), int(record["marking"]["displayRangeMl"]["maximum"]) + 1, int(record["marking"]["majorIntervalMl"])):
        fraction = (value - record["marking"]["displayRangeMl"]["minimum"]) / (record["marking"]["displayRangeMl"]["maximum"] - record["marking"]["displayRangeMl"]["minimum"])
        z = mm(scale_start + fraction * (scale_end - scale_start))
        tick_length = 7 if value % 50 == 0 else 5
        curve_object(f"mark__{value:03d}ml", [(mm(23), scale_y, z), (mm(23 + tick_length), scale_y, z)], 0.18, marking, asset_id, f"vessel.scale.{value}ml", "marking", scale_obj)
        text_object(f"label__{value:03d}ml", str(value), (mm(18), scale_y - mm(0.25), z), 2.8, marking, asset_id, f"vessel.label.{value}ml", scale_obj)

    highlight_obj = bpy.data.objects.new("layer__glass-highlight", None)
    bpy.context.collection.objects.link(highlight_obj)
    tag(highlight_obj, asset_id, "vessel.glass-highlight", "highlight")
    highlight_obj.parent = root
    curve_object("highlight__narrow", [(mm(-24), mm(-35.7), mm(10)), (mm(-24), mm(-35.7), mm(76))], 0.55, highlight, asset_id, "vessel.glass-highlight.narrow", "highlight", highlight_obj)
    curve_object("highlight__soft", [(mm(-19), mm(-35.3), mm(16)), (mm(-19), mm(-35.3), mm(72))], 1.2, highlight, asset_id, "vessel.glass-highlight.soft", "highlight", highlight_obj)
    edge = glass_edge
    curve_object("edge__front-left", [(mm(-34.5), mm(-36.0), mm(5)), (mm(-34.5), mm(-36.0), mm(wall_top - 1))], 0.45, edge, asset_id, "vessel.glass-edge.front-left", "edge", highlight_obj)
    curve_object("edge__front-right", [(mm(34.5), mm(-36.0), mm(5)), (mm(34.5), mm(-36.0), mm(wall_top - 1))], 0.45, edge, asset_id, "vessel.glass-edge.front-right", "edge", highlight_obj)
    curve_object("edge__front-rim", [(mm(-34.5), mm(-36.0), mm(wall_top)), (0, mm(-36.0), mm(wall_top + 0.5)), (mm(34.5), mm(-36.0), mm(wall_top))], 0.5, edge, asset_id, "vessel.glass-edge.front-rim", "edge", highlight_obj)
    curve_object("edge__front-base", [(mm(-30), mm(-36.0), mm(4)), (0, mm(-36.0), mm(3.5)), (mm(30), mm(-36.0), mm(4))], 0.5, edge, asset_id, "vessel.glass-edge.front-base", "edge", highlight_obj)
    curve_object("edge__spout-top", [(mm(28), mm(-36.0), mm(wall_top - 2)), (mm(45), mm(-36.0), mm(wall_top + 1)), (mm(49), mm(-36.0), mm(wall_top + 2))], 0.42, edge, asset_id, "vessel.glass-edge.spout-top", "edge", highlight_obj)

    label_obj = bpy.data.objects.new("layer__labels", None)
    bpy.context.collection.objects.link(label_obj)
    tag(label_obj, asset_id, "vessel.labels", "labels")
    label_obj.parent = root
    text_object("label__capacity", "250 mL", (mm(0), mm(-36.0), mm(7)), 3.1, marking, asset_id, "vessel.label.capacity", label_obj)

    bpy.ops.mesh.primitive_plane_add(size=2, location=(0, mm(55), mm(45)), rotation=(math.radians(90), 0, 0))
    stage = bpy.context.object
    stage.name = "stage__background"
    stage.scale = (0.18, 0.12, 0.18)
    stage.data.materials.append(backdrop)
    tag(stage, asset_id, "stage.background", "review-stage")

    camera = make_camera("camera__experiment-world", (0, -310, 47.5), (0, 0, 47.5), 125, root)
    measurement_camera = make_camera("camera__measurement", (0, -310, 47.5), (0, 0, 47.5), 112, root)
    scene = bpy.context.scene
    scene.camera = camera
    make_light("light__key", (-100, -150, 170), 1.5, 110, (1.0, 0.96, 0.9), root)
    make_light("light__fill", (130, -100, 90), 0.6, 130, (0.78, 0.88, 1.0), root)
    make_light("light__rim", (60, 80, 150), 2.0, 90, (0.72, 0.86, 1.0), root)

    scene["chemrealm_asset_id"] = asset_id
    scene["chemrealm_source_manifest"] = job["constructionSource"]
    scene["chemrealm_profile_owner"] = "ChemRealm frozen profile snapshot; not Blender"
    scene["chemrealm_profile_reference"] = job["profileSnapshot"] or "none-present-for-current-beaker-record"
    scene["chemrealm_visual_candidate"] = True
    scene.render.filepath = str(repo_path(job["renderRoot"]) / "placeholder.png")
    output = repo_path(job["blendOutput"])
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output))
    print(f"BUILD_OK asset={asset_id} blend={output}")


args = parse_args()
build(Path(args.job).resolve())
