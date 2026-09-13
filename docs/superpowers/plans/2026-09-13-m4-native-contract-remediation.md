# M4 Native Contract Remediation Plan

> **Status:** S1 plan; implementation in progress remains M4-B S2. M4 S3 is
> historical TypeScript evidence. M5 remains S2 and M6 is not authorized.

**Spec:** `docs/superpowers/specs/2026-09-13-m4-native-contract-remediation.md`
**ADRs:** ADR-0001, ADR-0014
**Baseline:** native candidate `7093b7b`; this plan must not promote it.

## Ordered steps

### 1. Canonicalize the native bridge contract

- **Objective:** Make schema the only public TS/Rust bridge contract.
- **Files:** `packages/schema/src/scientific.ts`, `json-schema.ts`, schema
  tests/artifacts, `packages/sci/src/native-backend.ts`, Rust bridge DTOs.
- **Detail:** Add independent `bridgeSchemaVersion`, strict envelope/context and
  payload schemas, shared request serialization, and generated native schema
  artifacts. Rust consumes the same field names and CI parses real output with
  the artifacts.
- **Tests/evidence:** RED malformed/version/unknown-field tests; actual host
  smoke output parsed through schema; Python artifact consumption.
- **Stop/go:** Stop on any duplicated public wire definition or schema drift.

### 2. Separate request identity from source identity

- **Objective:** Preserve replay-source identity through native expressions.
- **Files:** TS facade/tests, Rust bridge/tests, ADR/spec/evidence.
- **Detail:** Hash the exact envelope as `requestHash`; pass an opaque
  `sourceStateHash` in context and require payload/expressions to echo it.
- **Tests/evidence:** Same request with two source hashes has the same request
  shape but distinct source identity; wrong echo is rejected.
- **Stop/go:** Stop on any path using request hash as source hash.

### 3. Preserve scientific execution capability through registry

- **Objective:** Prevent registered adapters from losing expression production.
- **Files:** `packages/sci/src/adapter.ts`, `identity.ts`, `registry.ts`, legacy
  expressions/adapter tests, native adapter tests.
- **Detail:** Add a formal capability and registry wrapper that validates
  result/model/config/source identity without casts or fallback.
- **Tests/evidence:** Capability survives registration; malformed/mismatched
  artifacts reject; legacy TS and native paths each own their producer.
- **Stop/go:** Stop if `freezeSolverAdapter()` drops a declared capability.

### 4. Make solver selection explicit for genesis

- **Objective:** Remove insertion-order backend choice for new worlds.
- **Files:** registry, world creation, production composition, tests/docs.
- **Detail:** Require exact `{id, version}` selection on world creation; no
  fallback. Existing worlds continue exact persisted identity lookup.
- **Tests/evidence:** Reverse registration order yields identical selected
  identity; unavailable/incompatible selection refuses genesis.
- **Stop/go:** Stop if a new `WorldCreated` can be emitted without a policy.

### 5. Align symbolic units and deterministic memory handling

- **Objective:** Keep Davies symbolic math dimensionally honest and ensure WASM
  buffers are released on decode failure.
- **Files:** TS/Rust expression producers, tests, WASM executor tests.
- **Detail:** Use reduced ionic strength/`Î` with unit `"1"`; wrap output decode
  and deallocation in `try/finally`.
- **Tests/evidence:** TS/native expression assertions and deallocation-on-error
  fixture.
- **Stop/go:** Stop on any Davies formula showing physical `mol/kg` as `I`.

### 6. Align governance and gates

- **Objective:** Ensure docs describe the actual three-toolchain candidate
  boundary and dependency DAG.
- **Files:** ADR-0001, ADR-0014, ADR index, README, CLAUDE, PLAN, M5 refs,
  evidence/guards.
- **Detail:** Accept ADR-0014 architecture only; amend ADR-0001; M6 depends on
  M5 S3 + M4-B S3; remove stale M5 revision references; keep M4 historical S3,
  M4-B/M5 S2 and M6 unauthorized.
- **Tests/evidence:** doc consistency/contract checks and diff inspection.
- **Stop/go:** Stop on any new S3 claim without owner/hosted evidence.

### 7. Final verification and handoff

- **Commands:** native fmt/test/clippy/WASM check; pnpm typecheck/test/build,
  schema/architecture guards, browser, lint; Python pytest and PHREEQC
  validation through `HTTP_PROXY/HTTPS_PROXY/ALL_PROXY=http://127.0.0.1:12334`.
- **Evidence:** exact implementation commit and hosted CI attestation only after
  the run completes; native supersession/ref/oracle/browser production evidence
  remains open.
- **Stop/go:** No completion claim with a failed check, unresolved P0/P1, or
  changed stage status.
