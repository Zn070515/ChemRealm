# PHREEQC M4 Oracle Toolchain

This directory contains test-time oracle metadata only. It is not imported by
`packages/sci`, `packages/world`, or the browser application.

The exact release and database are pinned in `manifest.json`. CI must verify
both SHA-256 values before running a case. Developer runs may set:

```text
PHREEQC_BIN=C:\path\to\phreeqc.exe
PHREEQC_DATABASE=C:\path\to\phreeqc.dat
```

The batch runner will fail, rather than skip, when CI requires PHREEQC and
either path is missing. Outputs are evidence only when the executable version,
database checksum, input basis, constants, and parser are all recorded.

On the pinned Linux CI path, install the exact source release with:

```text
bash tools/oracle/phreeqc/install_ci.sh
```

That script verifies the source archive, builds it with CMake, verifies the
extracted `phreeqc.dat`, stages both artifacts under the ignored `.cache/`, and
writes a local `toolchain.json` containing the executable checksum. Run a case
with:

```text
CHEMREALM_REQUIRE_PHREEQC=1 \
  uv run python tools/oracle/phreeqc/run_batch.py path/to/case.pqi
```

The runner invokes the CLI as `phreeqc input output database`, validates the
database checksum before execution, fails on a non-zero exit or empty output,
and does not treat a missing executable as a skipped oracle result.
