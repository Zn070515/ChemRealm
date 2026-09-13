# ChemRealm native Scientific Core

This crate is the candidate native backend for the acid-base model. Its model,
bridge, and package versions are generated from
`contracts/version-manifest.json`. It is not the legacy `@chemrealm/sci`
adapter and must not be used to silently re-solve an existing legacy world.

The host binary reads one canonical scientific request JSON object from stdin
and writes one backend payload JSON object to stdout:

```powershell
# The scientific schema version is read from contracts/version-manifest.json.
'{"schemaVersion":<current-scientific-schema>,...}' | cargo run --manifest-path native/sci-core/Cargo.toml --bin sci-core-host
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
