# M4 Native Contract Remediation Specification

**Status:** S1 specified; implementation in progress remains M4-B S2
**Authority:** subordinate to `SPEC-0001`; cross-cutting decisions recorded in
ADR-0001 and ADR-0014
**Scope:** native scientific bridge, scientific execution capability, explicit
solver selection, symbolic units, and stage-governance evidence

## Context

The candidate Rust/WASM scientific backend is implemented behind the
`@chemrealm/sci` facade, but the current bridge still has hand-maintained TypeScript
and Rust wire DTOs. The current adapter identity boundary also preserves only
`solve()`, so an expression-producing backend can lose its scientific artifacts
when registered. Finally, world creation can select the first compatible adapter,
which makes new-world identity depend on registry insertion order.

These are cross-system contract defects. They must be corrected before native
M4-B validation or native M5 composition. The accepted TypeScript M4 S3 baseline
and its historical evidence are not changed by this remediation.

## Goal

- Make the native JSON bridge a versioned schema-owned contract with an explicit
  execution context carrying an opaque replay-source identity.
- Keep bridge request identity separate from `sourceStateHash`; Rust must echo
  the caller's source identity into every produced expression.
- Preserve a formal expression-producing scientific execution capability through
  registry freezing and validate its result identity.
- Make every new world use an explicit exact solver selection policy; registry
  ordering must not select a different backend.
- Make Davies symbolic expressions use reduced, dimensionless ionic strength.
- Align ADR, README, PLAN, and evidence with the three-toolchain/native-candidate
  boundary without claiming native supersession or M5 completion.

## Non-goals

- No native backend default switch, M4-B S3 claim, M5 S3 claim, or M6
  authorization.
- No change to the synchronous World Runtime reducer or accepted TS 1.0.0
  replay semantics.
- No binary bridge, C/C++ implementation, GPU path, worker policy, or visual
  apparatus work.
- No fallback from native failure to another solver.

## Architecture and API

`@chemrealm/schema` owns the following cross-boundary shapes:

```text
NativeSolveEnvelope {
  bridgeSchemaVersion: 1,
  request: SolveRequestDto,
  context: { sourceStateHash: string }
}

NativeBackendPayload {
  bridgeSchemaVersion: 1,
  backend: { id, version },
  requestHash: string,
  sourceStateHash: string,
  result: SolveResultDto,
  expressions: ScientificExpression[]
}
```

`requestHash` is the SHA-256 identity of the exact canonical bridge envelope.
`sourceStateHash` is opaque caller-supplied replay-equivalence identity and is
never derived from or replaced by `requestHash`.

`@chemrealm/sci` owns the behavioural capability:

```text
ScientificExecutionAdapter
  solve(request)
  solveWithScientificArtifacts(request, { sourceStateHash })
```

The registry preserves and wraps that capability. A successful execution must
have schema-valid expressions whose model/version/source identity matches the
frozen adapter and requested context. Non-OK results must not carry expressions.

World creation requires an exact `{ id, version }` solver selection policy. An
unavailable or incompatible selected adapter is a hard genesis refusal; no
registry-order fallback is permitted. Persisted `WorldCreated.solverConfig`
continues to pin the selected model/config identity for old-world replay.

## Scientific design

The native and TypeScript expression producers must describe Davies using the
reduced ionic strength `Î`, a dimensionless quantity with unit `"1"`:

```text
log10(γ_i) = -A(√Î/(1+√Î) - bÎ)
```

Physical ionic strength in `mol/kg` remains available for the fixed-point and
state equations where that is the declared equation quantity. No molarity is
introduced into scientific internals.

## Evidence and acceptance

The remediation must add negative tests for:

- a Rust/native payload whose expressions echo `requestHash` instead of the
  supplied `sourceStateHash`;
- a registered expression-capable adapter whose capability disappears or loses
  identity through registry freezing;
- reversed registry registration order producing a different selected backend;
- a native bridge envelope/payload rejected when its independent bridge schema
  version or shape is wrong;
- Davies expressions using `Î` / unit `"1"`, in both TS and Rust output.

The generated native schemas are committed and consumed by the Python schema
contract tests. A native host smoke check must parse the actual Rust output with
the schema-owned TypeScript DTO schema; this proves the bridge is not merely
duplicated in comments.

## Governance and rollout

ADR-0014 is accepted as an architecture decision only; native supersession
remains candidate/S2. ADR-0001 is amended to describe the TS/pnpm,
Python/uv, and Rust/Cargo toolchains and their contract relationship.

M4-B remains S2 implementation in progress. M5 S3 requires native production
composition evidence, and M6 requires both M5 S3 and M4-B S3. This remediation
does not alter the accepted historical M4 S3 baseline.

## Stop/go

Stop if any public native wire shape remains hand-defined outside schema, if
source and request hashes are conflated, if registry capability or solver choice
depends on insertion order, or if any candidate native test silently falls back
to TypeScript. Go only after targeted tests, generated artifacts, full local
verification, and hosted CI pass with the stage statuses unchanged.
