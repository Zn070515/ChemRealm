# ChemRealm native Scientific Core

This crate is the candidate `acidbase-monoprotic-davies@2.0.0` backend. It is
not the legacy `@chemrealm/sci` TypeScript 1.0.0 adapter and must not be used to
silently re-solve an existing v1 world.

The host binary reads one canonical scientific request JSON object from stdin
and writes one backend payload JSON object to stdout:

```powershell
'{"schemaVersion":3,...}' | cargo run --manifest-path native/sci-core/Cargo.toml --bin sci-core-host
```

The same library also exposes a small raw WASM ABI:

- `chemrealm_alloc(length) -> pointer`
- `chemrealm_dealloc(pointer, length)`
- `chemrealm_solve_json(pointer, length) -> (length << 32) | pointer`

The TypeScript loader owns the pointer/length bridge and validates the returned
schema, backend identity, provenance, and Scientific Core expressions. There
is no TypeScript fallback when the WASM module is unavailable or malformed.

Build the browser artifact with:

```powershell
node tools/build_native_wasm.mjs
```

The release WASM file is emitted into the ignored `packages/sci/dist/wasm/`
directory and is therefore a build artifact, not a second source of truth.
