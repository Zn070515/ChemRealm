#!/usr/bin/env python3
"""Build the independent colourimetry reference vectors.

This module intentionally uses only Python's standard library and checked-in
JSON inputs.  It does not import the TypeScript Representation Engine.  The
result is a frozen numerical oracle: the TypeScript tests compare their
production output against this artifact, while ``--check`` detects stale
inputs or hand-edited expected values.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
CIE_PATH = ROOT / "packages/render/src/observable/colourimetry-cie-d65-1931-2deg-5nm.json"
PROFILE_PATH = ROOT / "packages/render/src/observable/phenolphthalein-ordinary-aqueous.profile.json"
OUTPUT_PATH = ROOT / "docs/research/indicator-optics/colourimetry-independent-oracle.json"
WHITE_POINT = (0.95047, 1.0, 1.08883)


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def trapz(values: list[float], component: list[float], illuminant: list[float], wavelengths: list[int]) -> float:
    total = 0.0
    for index in range(len(values) - 1):
        first = values[index] * illuminant[index] * component[index]
        second = values[index + 1] * illuminant[index + 1] * component[index + 1]
        total += ((first + second) / 2.0) * (wavelengths[index + 1] - wavelengths[index])
    return total


def xyz_from_transmittance(
    transmittance: list[float],
    cie: dict[str, Any],
) -> list[float]:
    wavelengths = cie["wavelengthNanometres"]
    illuminant = cie["d65RelativePower"]
    blank = [1.0] * len(wavelengths)
    blank_x = trapz(blank, cie["cie1931XBar"], illuminant, wavelengths)
    blank_y = trapz(blank, cie["cie1931YBar"], illuminant, wavelengths)
    blank_z = trapz(blank, cie["cie1931ZBar"], illuminant, wavelengths)
    return [
        trapz(transmittance, cie["cie1931XBar"], illuminant, wavelengths) / blank_x * WHITE_POINT[0],
        trapz(transmittance, cie["cie1931YBar"], illuminant, wavelengths) / blank_y * WHITE_POINT[1],
        trapz(transmittance, cie["cie1931ZBar"], illuminant, wavelengths) / blank_z * WHITE_POINT[2],
    ]


def xyz_from_transmittance_common_k(
    transmittance: list[float],
    cie: dict[str, Any],
) -> list[float]:
    """Calculate transmitting-object XYZ with one CIE normalization constant.

    The common-k form uses the same illuminant/observer integrals as the
    production method, but derives one k from the blank Y integral.  It does
    not apply an independent correction to X and Z.  This is intentionally a
    method-level cross-check, not a replacement chosen without measuring the
    difference on the admitted grid.
    """
    wavelengths = cie["wavelengthNanometres"]
    illuminant = cie["d65RelativePower"]
    blank_y = trapz(
        [1.0] * len(wavelengths),
        cie["cie1931YBar"],
        illuminant,
        wavelengths,
    )
    common_k = WHITE_POINT[1] / blank_y
    return [
        common_k * trapz(transmittance, cie["cie1931XBar"], illuminant, wavelengths),
        common_k * trapz(transmittance, cie["cie1931YBar"], illuminant, wavelengths),
        common_k * trapz(transmittance, cie["cie1931ZBar"], illuminant, wavelengths),
    ]


def srgb_channel(value: float) -> float:
    bounded = min(1.0, max(0.0, value))
    if bounded <= 0.0031308:
        return 12.92 * bounded
    return 1.055 * (bounded ** (1.0 / 2.4)) - 0.055


def srgb_from_xyz(xyz: list[float]) -> list[float]:
    x, y, z = xyz
    return [
        min(1.0, max(0.0, srgb_channel(3.2406 * x - 1.5372 * y - 0.4986 * z))),
        min(1.0, max(0.0, srgb_channel(-0.9689 * x + 1.8758 * y + 0.0415 * z))),
        min(1.0, max(0.0, srgb_channel(0.0557 * x - 0.2040 * y + 1.0570 * z))),
    ]


def chromaticity_from_xyz(xyz: list[float]) -> list[float]:
    total = sum(xyz)
    if not math.isfinite(total) or total <= 0:
        raise ValueError("chromaticity requires a positive finite XYZ sum")
    return [xyz[0] / total, xyz[1] / total]


def make_vector(
    vector_id: str,
    transmittance: list[float],
    cie: dict[str, Any],
    input_record: dict[str, Any],
) -> dict[str, Any]:
    xyz = xyz_from_transmittance(transmittance, cie)
    production_srgb = srgb_from_xyz(xyz)
    common_k_xyz = xyz_from_transmittance_common_k(transmittance, cie)
    common_k_srgb = srgb_from_xyz(common_k_xyz)
    production_chromaticity = chromaticity_from_xyz(xyz)
    common_k_chromaticity = chromaticity_from_xyz(common_k_xyz)
    return {
        "id": vector_id,
        "input": input_record,
        "transmittance": transmittance,
        "xyz": xyz,
        "sRgb": production_srgb,
        "commonK": {
            "xyz": common_k_xyz,
            "sRgb": common_k_srgb,
            "deltaXyz": [common - production for common, production in zip(common_k_xyz, xyz)],
            "deltaSrgb": [common - production for common, production in zip(common_k_srgb, production_srgb)],
            "chromaticity": {
                "production": production_chromaticity,
                "commonK": common_k_chromaticity,
                "delta": [common - production for common, production in zip(common_k_chromaticity, production_chromaticity)],
            },
        },
    }


def build_oracle() -> dict[str, Any]:
    cie = load_json(CIE_PATH)
    profile = load_json(PROFILE_PATH)
    wavelengths = cie["wavelengthNanometres"]
    quinoid = next(form for form in profile["formSpectra"] if form["formId"] == "quinoid-base")
    phenolphthalein_transmittance = [
        math.exp(-sample["epsilon"] * 5e-5 * 1.0)
        for sample in quinoid["samples"]
    ]
    narrow_transmittance = [
        10.0 ** (-0.1) if wavelength == 550 else 1.0
        for wavelength in wavelengths
    ]

    vectors = [
        make_vector(
            "transparent-white",
            [1.0] * len(wavelengths),
            cie,
            {"kind": "constant-transmittance", "value": 1.0},
        ),
        make_vector(
            "neutral-grey-half-transmission",
            [0.5] * len(wavelengths),
            cie,
            {"kind": "constant-transmittance", "value": 0.5},
        ),
        make_vector(
            "synthetic-narrow-550nm-absorber",
            narrow_transmittance,
            cie,
            {
                "kind": "decadic-single-form",
                "absorbingWavelengthNanometres": 550,
                "absorbanceAtPeak": 0.1,
            },
        ),
        make_vector(
            "phenolphthalein-quinoid-profile",
            phenolphthalein_transmittance,
            cie,
            {
                "kind": "profile-single-form",
                "profileId": profile["profileId"],
                "profileHash": profile["profileHash"],
                "formId": "quinoid-base",
                "concentrationMolPerLitre": 5e-5,
                "pathLengthCentimetres": 1.0,
            },
        ),
    ]
    deltas_xyz = [
        component
        for vector in vectors
        for component in vector["commonK"]["deltaXyz"]
    ]
    deltas_chromaticity = [
        component
        for vector in vectors
        for component in vector["commonK"]["chromaticity"]["delta"]
    ]
    deltas_srgb = [
        component
        for vector in vectors
        for component in vector["commonK"]["deltaSrgb"]
    ]

    return {
        "oracleId": "chemrealm-indicator-colourimetry-independent-v1",
        "method": {
            "implementation": "Python 3 standard library; no TypeScript or ChemRealm runtime imports",
            "integration": "trapezoidal quadrature on the checked-in 380–780 nm / 5 nm grid",
            "normalization": "production method: each transmitted XYZ component divided by its blank integral and scaled to IEC D65 white",
            "commonKCrossCheck": {
                "normalization": "single common k = Yn / blank Y integral",
                "referenceWhitePoint": list(WHITE_POINT),
                "deltaDefinition": "commonK minus production per-channel blank-normalized value",
                "status": "bounded-method-difference-recorded",
                "maxAbsoluteDeltaXyz": max(abs(delta) for delta in deltas_xyz),
                "maxAbsoluteDeltaChromaticity": max(abs(delta) for delta in deltas_chromaticity),
                "maxAbsoluteDeltaSrgb": max(abs(delta) for delta in deltas_srgb),
            },
            "encoding": "IEC 61966-2-1 sRGB D65 matrix and transfer function",
            "beerLambert": "Napierian exp(-epsilon_N * concentration * pathLengthCm) for the phenolphthalein vector",
            "independenceBoundary": "expected vectors are frozen outputs; production tests do not call this implementation",
        },
        "inputArtifacts": [
            {"path": "packages/render/src/observable/colourimetry-cie-d65-1931-2deg-5nm.json", "sha256": sha256_file(CIE_PATH)},
            {"path": "packages/render/src/observable/phenolphthalein-ordinary-aqueous.profile.json", "sha256": sha256_file(PROFILE_PATH)},
        ],
        "vectors": vectors,
    }


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def main() -> int:
    generated = build_oracle()
    if "--check" in sys.argv:
        current = load_json(OUTPUT_PATH)
        if canonical_json(current) != canonical_json(generated):
            raise SystemExit("indicator colourimetry oracle is stale or has been edited")
        print("indicator colourimetry oracle: PASS")
        return 0
    with OUTPUT_PATH.open("w", encoding="utf-8", newline="\n") as output:
        output.write(json.dumps(generated, ensure_ascii=False, indent=2) + "\n")
    print(f"indicator colourimetry oracle rebuilt: {OUTPUT_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
