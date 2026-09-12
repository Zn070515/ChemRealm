"""The PHREEQC oracle must fail loudly when its pinned toolchain is absent."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import sys
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[3]
RUNNER_PATH = REPO_ROOT / "tools" / "oracle" / "phreeqc" / "run_batch.py"
INSTALLER_PATH = REPO_ROOT / "tools" / "oracle" / "phreeqc" / "install_ci.sh"
MANIFEST_PATH = REPO_ROOT / "tools" / "oracle" / "phreeqc" / "manifest.json"


def load_runner():
    spec = importlib.util.spec_from_file_location("chemrealm_phreeqc_runner", RUNNER_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_manifest_points_to_checked_in_runner_and_ci_installer() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    assert RUNNER_PATH.is_file()
    assert INSTALLER_PATH.is_file()
    assert manifest["executable"]["runner"] == "tools/oracle/phreeqc/run_batch.py"
    assert manifest["executable"]["ciInstallScript"] == "tools/oracle/phreeqc/install_ci.sh"
    assert "CHEMREALM_REQUIRE_PHREEQC" in RUNNER_PATH.read_text(encoding="utf-8")


def test_missing_required_toolchain_is_a_hard_failure(tmp_path, monkeypatch) -> None:
    runner = load_runner()
    monkeypatch.setenv("CHEMREALM_REQUIRE_PHREEQC", "1")
    monkeypatch.setenv("PHREEQC_BIN", str(tmp_path / "missing-phreeqc"))
    monkeypatch.setenv("PHREEQC_DATABASE", str(tmp_path / "missing.dat"))

    with pytest.raises(runner.PhreeqcToolchainError, match="executable"):
        runner.resolve_toolchain(REPO_ROOT)


def test_local_executable_override_cannot_claim_pinned_oracle_identity(
    tmp_path, monkeypatch
) -> None:
    runner = load_runner()
    executable = tmp_path / "phreeqc"
    database = tmp_path / "phreeqc.dat"
    executable.write_text("developer executable", encoding="utf-8")
    database.write_text("developer database", encoding="utf-8")
    monkeypatch.setenv("PHREEQC_BIN", str(executable))
    monkeypatch.setenv("PHREEQC_DATABASE", str(database))

    with pytest.raises(runner.PhreeqcToolchainError, match="unverified"):
        runner.resolve_toolchain(REPO_ROOT)


def test_allowed_local_override_is_explicitly_unverified(
    tmp_path, monkeypatch
) -> None:
    runner = load_runner()
    executable = tmp_path / "phreeqc"
    database = tmp_path / "phreeqc.dat"
    executable.write_text("developer executable", encoding="utf-8")
    database.write_text("developer database", encoding="utf-8")
    monkeypatch.setenv("PHREEQC_BIN", str(executable))
    monkeypatch.setenv("PHREEQC_DATABASE", str(database))
    monkeypatch.setenv("CHEMREALM_ALLOW_UNVERIFIED_PHREEQC", "1")
    monkeypatch.setattr(runner, "validate_database", lambda *_args: "database-sha")
    monkeypatch.setattr(runner, "sha256_file", lambda _path: "executable-sha")

    toolchain = runner.resolve_toolchain(REPO_ROOT)

    assert toolchain.version == "unverified-override"
    assert toolchain.identity_verified is False
    assert toolchain.identity_source == "PHREEQC_BIN override"


def test_required_pinned_oracle_rejects_local_override_even_when_allowed(
    tmp_path, monkeypatch
) -> None:
    runner = load_runner()
    executable = tmp_path / "phreeqc"
    database = tmp_path / "phreeqc.dat"
    executable.write_text("developer executable", encoding="utf-8")
    database.write_text("developer database", encoding="utf-8")
    monkeypatch.setenv("PHREEQC_BIN", str(executable))
    monkeypatch.setenv("PHREEQC_DATABASE", str(database))
    monkeypatch.setenv("CHEMREALM_ALLOW_UNVERIFIED_PHREEQC", "1")
    monkeypatch.setenv("CHEMREALM_REQUIRE_PHREEQC", "1")

    with pytest.raises(runner.PhreeqcToolchainError, match="pinned oracle"):
        runner.resolve_toolchain(REPO_ROOT)


def test_pinned_cache_requires_generated_toolchain_metadata(tmp_path, monkeypatch) -> None:
    runner = load_runner()
    executable_name = "phreeqc.exe" if os.name == "nt" else "phreeqc"
    executable = tmp_path / "bin" / executable_name
    executable.parent.mkdir()
    executable.write_text("pinned-looking executable", encoding="utf-8")
    monkeypatch.setattr(runner, "_default_cache", lambda *_args: tmp_path)
    monkeypatch.setattr(runner, "validate_database", lambda *_args: "database-sha")
    monkeypatch.setattr(runner, "sha256_file", lambda _path: "executable-sha")

    with pytest.raises(runner.PhreeqcToolchainError, match="toolchain metadata"):
        runner.resolve_toolchain(REPO_ROOT, environment={})


def test_ci_toolchain_metadata_binds_the_actual_executable_checksum(tmp_path) -> None:
    runner = load_runner()
    executable = tmp_path / "phreeqc"
    database = tmp_path / "phreeqc.dat"
    executable.write_text("pinned executable", encoding="utf-8")
    database.write_text("pinned database", encoding="utf-8")
    manifest = {
        "tool": "PHREEQC",
        "version": "3.8.6-17100",
        "sourceSha256": "source-sha",
    }
    metadata = {
        "tool": "PHREEQC",
        "version": "3.8.6-17100",
        "sourceSha256": "source-sha",
        "executable": str(executable),
        "executableSha256": "wrong-sha",
        "database": str(database),
        "databaseSha256": "database-sha",
    }

    with pytest.raises(runner.PhreeqcToolchainError, match="executable checksum"):
        runner.validate_ci_toolchain_metadata(
            metadata,
            metadata_path=tmp_path / "toolchain.json",
            executable=executable,
            database=database,
            executable_sha256="actual-sha",
            database_sha256="database-sha",
            manifest=manifest,
        )


def test_database_checksum_is_checked_before_execution(tmp_path) -> None:
    runner = load_runner()
    database = tmp_path / "phreeqc.dat"
    database.write_text("not the pinned database", encoding="utf-8")
    manifest = {
        "tool": "PHREEQC",
        "version": "test",
        "sourceSha256": "source",
        "database": {
            "name": "phreeqc.dat",
            "sha256": hashlib.sha256(b"the pinned database").hexdigest(),
        },
    }

    with pytest.raises(runner.PhreeqcToolchainError, match="checksum"):
        runner.validate_database(database, manifest)


def test_batch_command_is_explicit_and_uses_the_pinned_database(tmp_path) -> None:
    runner = load_runner()
    command = runner.build_command(
        executable=tmp_path / "phreeqc",
        input_path=tmp_path / "case.pqi",
        output_path=tmp_path / "case.pqo",
        database=tmp_path / "phreeqc.dat",
    )
    assert command == [
        str(tmp_path / "phreeqc"),
        str(tmp_path / "case.pqi"),
        str(tmp_path / "case.pqo"),
        str(tmp_path / "phreeqc.dat"),
    ]


def test_selected_output_parser_rejects_missing_marker() -> None:
    runner = load_runner()
    with pytest.raises(runner.PhreeqcOutputError, match="marker"):
        runner.parse_selected_output("PHREEQC completed without selected output")
