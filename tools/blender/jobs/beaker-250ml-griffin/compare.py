import argparse
import json
import sys
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[4]


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--left", required=True)
    parser.add_argument("--right", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])


def compare_images(left_path, right_path):
    left = bpy.data.images.load(str(left_path), check_existing=False)
    right = bpy.data.images.load(str(right_path), check_existing=False)
    if left.size[:] != right.size[:]:
        raise RuntimeError(f"image size mismatch: {left.size[:]} vs {right.size[:]}")
    left_pixels = list(left.pixels[:])
    right_pixels = list(right.pixels[:])
    differences = [abs(a - b) for a, b in zip(left_pixels, right_pixels)]
    changed = sum(1 for value in differences if value > 1e-7)
    return {
        "resolution": list(left.size[:]),
        "pixelChannels": len(left_pixels),
        "changedChannels": changed,
        "changedChannelRatio": changed / len(differences) if differences else 0,
        "maxAbsoluteChannelDifference": max(differences, default=0),
        "meanAbsoluteChannelDifference": sum(differences) / len(differences) if differences else 0,
        "bitIdentical": changed == 0,
    }


def main():
    args = parse_args()
    left_root = ROOT / args.left
    right_root = ROOT / args.right
    results = {}
    for left_path in sorted(left_root.glob("*.png")):
        right_path = right_root / left_path.name
        if not right_path.exists():
            results[left_path.name] = {"status": "MISSING_RIGHT"}
            continue
        results[left_path.name] = compare_images(left_path, right_path)
    payload = {"left": args.left, "right": args.right, "images": results}
    output = ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


main()
