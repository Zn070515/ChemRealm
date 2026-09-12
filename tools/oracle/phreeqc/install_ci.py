"""Download, checksum, build, and stage the pinned PHREEQC source for CI."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import tarfile
import urllib.request
from pathlib import Path
from typing import Sequence


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_manifest(repo_root: Path) -> dict:
    path = repo_root / "tools" / "oracle" / "phreeqc" / "manifest.json"
    return json.loads(path.read_text(encoding="utf-8"))


def verify_archive(path: Path, expected: str) -> None:
    actual = sha256_file(path)
    if actual.lower() != expected.lower():
        raise RuntimeError(f"PHREEQC source checksum mismatch: expected {expected}, got {actual}")


def safe_extract(archive: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    root = destination.resolve()
    with tarfile.open(archive, "r:gz") as handle:
        for member in handle.getmembers():
            target = (destination / member.name).resolve()
            if root not in target.parents and target != root:
                raise RuntimeError(f"refusing archive path outside extraction root: {member.name}")
        handle.extractall(destination)


def run(command: list[str], *, cwd: Path | None = None) -> None:
    print("+", " ".join(command))
    subprocess.run(command, cwd=cwd, check=True)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[3])
    args = parser.parse_args(argv)
    repo_root = args.repo_root.resolve()
    manifest = load_manifest(repo_root)
    version = manifest["version"]
    cache = Path(os.environ.get("CHEMREALM_PHREEQC_CACHE", repo_root / "tools" / "oracle" / "phreeqc" / ".cache" / version))
    cache.mkdir(parents=True, exist_ok=True)

    archive_url = manifest["sourceUrl"]
    archive = cache / Path(archive_url).name
    if not archive.is_file():
        print(f"Downloading pinned PHREEQC source: {archive_url}")
        with urllib.request.urlopen(archive_url, timeout=120) as response, archive.open("wb") as output:
            shutil.copyfileobj(response, output)
    verify_archive(archive, manifest["sourceSha256"])

    source = cache / "source"
    source_root = source / Path(manifest["database"]["archivePath"]).parts[0]
    if not source_root.is_dir():
        safe_extract(archive, source)
    if not source_root.is_dir():
        raise RuntimeError(f"extracted PHREEQC source directory is missing: {source_root}")

    build = cache / "build"
    run(["cmake", "-S", str(source_root), "-B", str(build), "-DCMAKE_BUILD_TYPE=Release"])
    run(["cmake", "--build", str(build), "--config", "Release", "--parallel"])

    binary_name = manifest.get("executable", {}).get("binaryName", "phreeqc")
    candidates = [path for path in build.rglob(binary_name) if path.is_file()]
    candidates.extend(path for path in build.rglob(f"{binary_name}.exe") if path.is_file())
    if not candidates:
        raise RuntimeError(f"built PHREEQC executable was not found below {build}")
    executable = candidates[0]

    database = source / Path(manifest["database"]["archivePath"])
    if not database.is_file():
        raise RuntimeError(f"pinned PHREEQC database was not found: {database}")
    database_sha256 = sha256_file(database)
    expected_database_sha256 = manifest["database"]["sha256"]
    if database_sha256.lower() != expected_database_sha256.lower():
        raise RuntimeError(
            f"PHREEQC database checksum mismatch: expected {expected_database_sha256}, got {database_sha256}"
        )

    staged_binary = cache / "bin" / executable.name
    staged_database = cache / "database" / manifest["database"]["name"]
    staged_binary.parent.mkdir(parents=True, exist_ok=True)
    staged_database.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(executable, staged_binary)
    shutil.copy2(database, staged_database)
    metadata = {
        "tool": "PHREEQC",
        "version": version,
        "sourceSha256": manifest["sourceSha256"],
        "executable": str(staged_binary),
        "executableSha256": sha256_file(staged_binary),
        "database": str(staged_database),
        "databaseSha256": database_sha256,
    }
    (cache / "toolchain.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
