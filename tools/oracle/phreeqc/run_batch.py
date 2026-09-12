"""Run a pinned PHREEQC CLI case as a hard-failing test-time oracle."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Sequence


class PhreeqcToolchainError(RuntimeError):
    """The pinned executable or database cannot be trusted or used."""


class PhreeqcExecutionError(RuntimeError):
    """PHREEQC ran but returned a failure."""


class PhreeqcOutputError(RuntimeError):
    """PHREEQC output is not in the selected-output format we require."""


@dataclass(frozen=True)
class PhreeqcToolchain:
    executable: Path
    database: Path
    version: str
    manifest: dict
    executable_sha256: str
    database_sha256: str
    identity_verified: bool
    identity_source: str


@dataclass(frozen=True)
class PhreeqcBatchResult:
    command: tuple[str, ...]
    output_path: Path
    stdout: str
    stderr: str
    toolchain: PhreeqcToolchain


def _manifest_path(repo_root: Path) -> Path:
    return repo_root / "tools" / "oracle" / "phreeqc" / "manifest.json"


def load_manifest(repo_root: Path) -> dict:
    path = _manifest_path(repo_root)
    if not path.is_file():
        raise PhreeqcToolchainError(f"missing PHREEQC manifest: {path}")
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise PhreeqcToolchainError(f"PHREEQC manifest is not an object: {path}")
    return value


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    try:
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
    except OSError as error:
        raise PhreeqcToolchainError(f"cannot read PHREEQC artifact {path}: {error}") from error
    return digest.hexdigest()


def validate_database(database: Path, manifest: dict) -> str:
    if not database.is_file():
        raise PhreeqcToolchainError(f"PHREEQC database is missing: {database}")
    expected = manifest.get("database", {}).get("sha256")
    if not isinstance(expected, str) or not expected.strip():
        raise PhreeqcToolchainError("PHREEQC manifest has no database checksum")
    actual = sha256_file(database)
    if actual.lower() != expected.lower():
        raise PhreeqcToolchainError(
            f"PHREEQC database checksum mismatch for {database}: "
            f"expected {expected}, got {actual}"
        )
    return actual


def load_toolchain_metadata(path: Path) -> dict:
    if not path.is_file():
        raise PhreeqcToolchainError(
            f"missing pinned PHREEQC toolchain metadata: {path}; "
            "run install_ci.py before using the oracle"
        )
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise PhreeqcToolchainError(
            f"invalid pinned PHREEQC toolchain metadata: {path}: {error}"
        ) from error
    if not isinstance(value, dict):
        raise PhreeqcToolchainError(
            f"pinned PHREEQC toolchain metadata is not an object: {path}"
        )
    return value


def validate_ci_toolchain_metadata(
    metadata: Mapping[str, object],
    *,
    metadata_path: Path,
    executable: Path,
    database: Path,
    executable_sha256: str,
    database_sha256: str,
    manifest: Mapping[str, object],
) -> None:
    def metadata_string(key: str) -> str:
        value = metadata.get(key)
        if not isinstance(value, str) or not value.strip():
            raise PhreeqcToolchainError(
                f"pinned PHREEQC toolchain metadata field {key!r} is missing or invalid: "
                f"{metadata_path}"
            )
        return value

    expected_tool = manifest.get("tool")
    expected_version = manifest.get("version")
    expected_source_sha256 = manifest.get("sourceSha256")
    tool = metadata_string("tool")
    version = metadata_string("version")
    source_sha256 = metadata_string("sourceSha256")
    executable_path = metadata_string("executable")
    metadata_executable_sha256 = metadata_string("executableSha256")
    database_path = metadata_string("database")
    metadata_database_sha256 = metadata_string("databaseSha256")
    if tool != expected_tool:
        raise PhreeqcToolchainError(
            f"pinned PHREEQC toolchain metadata has the wrong tool: {metadata_path}"
        )
    if version != expected_version:
        raise PhreeqcToolchainError(
            f"pinned PHREEQC toolchain version mismatch in {metadata_path}: "
            f"expected {expected_version}, got {version}"
        )
    if source_sha256 != expected_source_sha256:
        raise PhreeqcToolchainError(
            f"pinned PHREEQC source checksum mismatch in {metadata_path}"
        )
    if Path(executable_path).resolve() != executable.resolve():
        raise PhreeqcToolchainError(
            f"pinned PHREEQC executable path mismatch in {metadata_path}"
        )
    if metadata_executable_sha256.lower() != executable_sha256.lower():
        raise PhreeqcToolchainError(
            f"pinned PHREEQC executable checksum mismatch in {metadata_path}"
        )
    if Path(database_path).resolve() != database.resolve():
        raise PhreeqcToolchainError(
            f"pinned PHREEQC database path mismatch in {metadata_path}"
        )
    if metadata_database_sha256.lower() != database_sha256.lower():
        raise PhreeqcToolchainError(
            f"pinned PHREEQC database checksum mismatch in {metadata_path}"
        )


def _default_cache(repo_root: Path, version: str) -> Path:
    configured = os.environ.get("CHEMREALM_PHREEQC_CACHE")
    return Path(configured) if configured else repo_root / "tools" / "oracle" / "phreeqc" / ".cache" / version


def resolve_toolchain(
    repo_root: Path,
    environment: Mapping[str, str] | None = None,
) -> PhreeqcToolchain:
    env = os.environ if environment is None else environment
    manifest = load_manifest(repo_root)
    version = manifest.get("version")
    if not isinstance(version, str) or not version.strip():
        raise PhreeqcToolchainError("PHREEQC manifest has no version")

    cache = _default_cache(repo_root, version)
    executable_name = manifest.get("executable", {}).get("binaryName", "phreeqc")
    if os.name == "nt" and executable_name == "phreeqc":
        executable_name = "phreeqc.exe"
    has_override = bool(env.get("PHREEQC_BIN"))
    executable = Path(env["PHREEQC_BIN"]) if has_override else cache / "bin" / executable_name
    database = Path(env["PHREEQC_DATABASE"]) if env.get("PHREEQC_DATABASE") else cache / "database" / manifest["database"]["name"]

    if not executable.is_file():
        required = env.get("CHEMREALM_REQUIRE_PHREEQC") == "1"
        suffix = " (CHEMREALM_REQUIRE_PHREEQC=1)" if required else ""
        raise PhreeqcToolchainError(f"PHREEQC executable is missing: {executable}{suffix}")

    if has_override:
        if env.get("CHEMREALM_ALLOW_UNVERIFIED_PHREEQC") != "1":
            raise PhreeqcToolchainError(
                "PHREEQC_BIN is an unverified developer override; set "
                "CHEMREALM_ALLOW_UNVERIFIED_PHREEQC=1 for a local run, "
                "but it cannot count as the pinned oracle"
            )
        if env.get("CHEMREALM_REQUIRE_PHREEQC") == "1":
            raise PhreeqcToolchainError(
                "a PHREEQC_BIN override cannot satisfy the pinned oracle "
                "when CHEMREALM_REQUIRE_PHREEQC=1"
            )
        database_sha256 = validate_database(database, manifest)
        return PhreeqcToolchain(
            executable=executable,
            database=database,
            version="unverified-override",
            manifest=manifest,
            executable_sha256=sha256_file(executable),
            database_sha256=database_sha256,
            identity_verified=False,
            identity_source="PHREEQC_BIN override",
        )

    database_sha256 = validate_database(database, manifest)
    executable_sha256 = sha256_file(executable)
    metadata_path = cache / "toolchain.json"
    metadata = load_toolchain_metadata(metadata_path)
    validate_ci_toolchain_metadata(
        metadata,
        metadata_path=metadata_path,
        executable=executable,
        database=database,
        executable_sha256=executable_sha256,
        database_sha256=database_sha256,
        manifest=manifest,
    )
    return PhreeqcToolchain(
        executable=executable,
        database=database,
        version=version,
        manifest=manifest,
        executable_sha256=executable_sha256,
        database_sha256=database_sha256,
        identity_verified=True,
        identity_source="CI toolchain metadata",
    )


def build_command(
    *,
    executable: Path,
    input_path: Path,
    output_path: Path,
    database: Path,
) -> list[str]:
    return [str(executable), str(input_path), str(output_path), str(database)]


def run_batch(
    input_path: Path,
    *,
    repo_root: Path,
    output_path: Path | None = None,
    timeout_seconds: float = 120.0,
) -> PhreeqcBatchResult:
    toolchain = resolve_toolchain(repo_root)
    input_path = input_path.resolve()
    if not input_path.is_file():
        raise PhreeqcToolchainError(f"PHREEQC input case is missing: {input_path}")
    output = (output_path or input_path.with_suffix(".pqo")).resolve()
    command = build_command(
        executable=toolchain.executable,
        input_path=input_path,
        output_path=output,
        database=toolchain.database,
    )
    try:
        completed = subprocess.run(
            command,
            cwd=input_path.parent,
            capture_output=True,
            text=True,
            check=False,
            timeout=timeout_seconds,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise PhreeqcExecutionError(
            f"PHREEQC command failed to start or timed out: {' '.join(command)}; {error}"
        ) from error
    if completed.returncode != 0:
        raise PhreeqcExecutionError(
            f"PHREEQC exited {completed.returncode}: {' '.join(command)}\n"
            f"stderr:\n{completed.stderr}"
        )
    if not output.is_file() or not output.read_text(encoding="utf-8", errors="replace").strip():
        raise PhreeqcOutputError(
            f"PHREEQC produced no output: {' '.join(command)}; stderr:\n{completed.stderr}"
        )
    return PhreeqcBatchResult(
        command=tuple(command),
        output_path=output,
        stdout=completed.stdout,
        stderr=completed.stderr,
        toolchain=toolchain,
    )


def parse_selected_output(text: str, marker: str = "CHEMREALM_SELECTED_OUTPUT") -> list[dict[str, str]]:
    lines = text.splitlines()
    try:
        marker_index = next(index for index, line in enumerate(lines) if line.strip() == marker)
    except StopIteration as error:
        raise PhreeqcOutputError(f"selected-output marker {marker!r} is missing") from error

    rows = [line for line in lines[marker_index + 1 :] if line.strip()]
    if len(rows) < 2:
        raise PhreeqcOutputError("selected-output marker has no header and data rows")
    delimiter = "\t" if "\t" in rows[0] else ","
    parsed = list(csv.reader(rows, delimiter=delimiter))
    headers = [header.strip() for header in parsed[0]]
    if not headers or any(not header for header in headers):
        raise PhreeqcOutputError("selected-output header contains an empty field")
    records: list[dict[str, str]] = []
    for row in parsed[1:]:
        if len(row) != len(headers):
            raise PhreeqcOutputError("selected-output row width does not match its header")
        records.append({header: value.strip() for header, value in zip(headers, row)})
    return records


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="PHREEQC .pqi input case")
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[3])
    parser.add_argument("--output", type=Path)
    args = parser.parse_args(argv)
    result = run_batch(args.input, repo_root=args.repo_root, output_path=args.output)
    print(json.dumps({
        "version": result.toolchain.version,
        "command": list(result.command),
        "output": str(result.output_path),
        "executableSha256": result.toolchain.executable_sha256,
        "databaseSha256": result.toolchain.database_sha256,
        "identityVerified": result.toolchain.identity_verified,
        "identitySource": result.toolchain.identity_source,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
