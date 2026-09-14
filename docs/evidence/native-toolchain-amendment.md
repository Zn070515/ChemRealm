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
| WASM artifact | `pnpm native:check-wasm`, `pnpm build`, release artifact hash in the native evidence packet |
| Schema/version relationship | `pnpm verify:versions`, `pnpm verify:native-schema` |
| Hosted clean-checkout integration | CI run `34761350435` and subsequent native CI attestations, each bound to its own commit |

This packet is a post-M0 amendment record. It must not be cited as evidence
that the original M0 two-toolchain baseline contained Rust or WASM.
