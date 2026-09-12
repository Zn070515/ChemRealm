# PHREEQC M4 Oracle Toolchain

This directory contains test-time oracle metadata only. It is not imported by
`packages/sci`, `packages/world`, or the browser application.

The exact release and database are pinned in `manifest.json`. CI must verify
both SHA-256 values before running a case. Developer runs may set an explicitly
unverified local override:

```text
PHREEQC_BIN=C:\path\to\phreeqc.exe
PHREEQC_DATABASE=C:\path\to\phreeqc.dat
CHEMREALM_ALLOW_UNVERIFIED_PHREEQC=1
```

The override is for local debugging only. The runner labels it
`unverified-override`, and it cannot satisfy `CHEMREALM_REQUIRE_PHREEQC=1` or
count as AC-S6 evidence. A pinned oracle run must use the binary staged by
`install_ci.sh` together with its generated `toolchain.json`; the runner
checks the pinned source version, executable path/checksum, and database
path/checksum before execution. It fails, rather than silently accepting an
unidentified binary.

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
toolchain metadata and database checksum before execution, fails on a non-zero
exit or empty output, and does not treat a missing executable as a skipped
oracle result.
