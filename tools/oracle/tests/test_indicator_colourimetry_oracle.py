"""The optical oracle must compare its production method with common-k CIE."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
BUILDER_PATH = REPO_ROOT / "tools" / "research" / "build_indicator_colourimetry_oracle.py"


def load_builder() -> Any:
    spec = importlib.util.spec_from_file_location("chemrealm_colourimetry_oracle", BUILDER_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_oracle_records_a_common_k_method_cross_check() -> None:
    oracle = load_builder().build_oracle()

    cross_check = oracle["method"]["commonKCrossCheck"]
    assert cross_check["normalization"] == "single common k = Yn / blank Y integral"
    assert cross_check["status"] == "bounded-method-difference-recorded"
    assert cross_check["maxAbsoluteDeltaSrgb"] >= 0
    assert cross_check["maxAbsoluteDeltaXyz"] == 0.0001049657309100116
    assert cross_check["maxAbsoluteDeltaChromaticity"] == 1.7477921710418176e-05
    assert cross_check["maxAbsoluteDeltaSrgb"] == 5.637158019111688e-05

    for vector in oracle["vectors"]:
        common_k = vector["commonK"]
        assert len(common_k["xyz"]) == 3
        assert len(common_k["sRgb"]) == 3
        assert len(common_k["deltaXyz"]) == 3
        assert len(common_k["deltaSrgb"]) == 3
        assert set(common_k["chromaticity"]) == {"production", "commonK", "delta"}
        assert len(common_k["chromaticity"]["production"]) == 2
        assert len(common_k["chromaticity"]["commonK"]) == 2
        assert len(common_k["chromaticity"]["delta"]) == 2


def test_common_k_uses_one_y_derived_normalization_constant() -> None:
    transparent = next(
        vector
        for vector in load_builder().build_oracle()["vectors"]
        if vector["id"] == "transparent-white"
    )

    assert transparent["commonK"]["xyz"] == [
        0.9504135247229524,
        1.0,
        1.08872503426909,
    ]
