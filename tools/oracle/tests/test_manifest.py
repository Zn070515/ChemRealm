"""M4 toolchain pins must be explicit before oracle evidence can count."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
MANIFEST_PATH = REPO_ROOT / "tools" / "oracle" / "phreeqc" / "manifest.json"
PROVENANCE_PATH = REPO_ROOT / "docs" / "research" / "constants-provenance.md"


def load_manifest() -> dict:
    assert MANIFEST_PATH.is_file(), f"missing PHREEQC manifest: {MANIFEST_PATH}"
    with MANIFEST_PATH.open(encoding="utf-8") as handle:
        value = json.load(handle)
    assert isinstance(value, dict)
    return value


def test_phreeqc_manifest_pins_executable_and_database() -> None:
    manifest = load_manifest()
    assert manifest["tool"] == "PHREEQC"
    assert manifest["version"] == "3.8.6-17100"
    assert manifest["sourceUrl"].startswith("https://")
    assert manifest["sourceSha256"]
    assert manifest["database"]["name"] == "phreeqc.dat"
    assert manifest["database"]["sourceUrl"].startswith("https://")
    assert manifest["database"]["sha256"]
    assert manifest["database"]["licenseSource"]


def test_constants_provenance_is_present_and_mentions_all_identity_inputs() -> None:
    assert PROVENANCE_PATH.is_file()
    text = PROVENANCE_PATH.read_text(encoding="utf-8")
    for token in (
        "Kw",
        "Ka_HOAc",
        "Davies A",
        "Davies b",
        "standard molality",
        "source precision",
        "indicator",
    ):
        assert token in text


@pytest.mark.parametrize("field", ["sourceSha256", "version"])
def test_manifest_required_fields_cannot_be_empty(field: str) -> None:
    manifest = load_manifest()
    assert isinstance(manifest[field], str)
    assert manifest[field].strip()
