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
