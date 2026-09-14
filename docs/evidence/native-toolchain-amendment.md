# Post-M0 Native Toolchain Amendment Evidence

**Status:** Amendment evidence only; it does not revise or retroactively
reopen M0 S3.

M0's historical acceptance was the two-toolchain baseline recorded in
[`M0.md`](M0.md): TypeScript/pnpm and Python/uv. Rust/Cargo and the bundled
WASM artifact were introduced after M0 under ADR-0014 and the native M4-B
candidate work.

## Later amendment

The third toolchain is now separately governed and checked:

| Boundary | Evidence |
|---|---|
| Rust/Cargo source and lockfile | `native/sci-core/Cargo.toml`, `Cargo.lock`, `pnpm native:fmt`, `pnpm native:test`, `pnpm native:clippy` |
| WASM artifact | Local `pnpm native:check-wasm` + `pnpm build`; release artifact SHA-256 is recorded below as a local build observation |
| Schema/version relationship | `pnpm verify:versions`, `pnpm verify:native-schema` |
| Hosted clean-checkout integration | Implementation commit and hosted CI attestation recorded below; the native supersession packet still requires a final hosted artifact identity |

**Implementation commit:** `afe0f97ac889757e00300452a4bfa72bd971f5a2`<br>
**Hosted CI:** #117 / run `34815999663` for that commit<br>
**Local release artifact:** `packages/sci/dist/wasm/chemrealm_sci_core.wasm`<br>
**Local release artifact SHA-256:** `sha256:01d7d87a2579cfa92ce85b1a90692d12cbcee3919415e9b6da64f0d7e92c9eb2`<br>
**Final native artifact identity:** pending the native supersession S3 packet; this local hash is not a hosted attestation.

This packet is a post-M0 amendment record. It must not be cited as evidence
that the original M0 two-toolchain baseline contained Rust or WASM.
