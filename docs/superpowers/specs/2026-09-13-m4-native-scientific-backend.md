# M4 Native Scientific Backend Supersession Specification

**Status:** S1 specified; owner-approved design direction, 2026-09-13  
**Authority:** `SPEC-0001` revision 26 Candidate and ADR-0014  
**Scope:** Scientific Reality Core, `@chemrealm/sci`, browser WASM bridge, M4 evidence

## Context

M4 S3 verified the TypeScript implementation of the v0 acid-base model. M5
composition now consumes a bound frame, but the scientific producer is still
TypeScript and the Scientific Core expression producer does not yet list every
equation used by the self-consistent activity solve. A native backend is
acceptable only if it preserves the same Scientific Reality and gives the
browser a shared implementation.

## Goal

Produce a Rust implementation of the existing v0 model, compile it for a host
validation artifact and WebAssembly, expose it through the existing async
`SolverAdapter`, and prove contract-level equivalence before making it the
default for new worlds.

The target path is:

```text
canonical request
  → schema-validated @chemrealm/sci facade
  → explicit Rust/WASM backend
  → schema-validated ScientificState + complete ScientificExpression records
  → ScientificFrame / M5 Observable composition
```

## Non-goals

- no new chemistry model, species, constant, or domain expansion;
- no mutation of World Runtime or async solver calls inside the reducer;
- no silent fallback from WASM/native to TypeScript;
- no immediate C++ or GPU implementation;
- no replacement of PHREEQC as an independent oracle;
- no removal of the TypeScript 1.0.0 backend needed for exact legacy replay;
- no M5 visual polish or M6 asset work.

## User experience

There is no new user-facing feature in the backend migration itself. Existing
M5 outputs and qualifications must remain available. Backend initialization
failure is an explicit unavailable/error state, never a silently substituted
scientific number.

## Architecture

```text
WorldState
    ↓ plain canonical data
@chemrealm/sci facade / registry
    ↓ explicit async adapter
Rust scientific core
    ├─ native host artifact for CI/differential tests
    └─ WASM artifact for browser production
    ↓ strict versioned wire result
ScientificState + ScientificExpressions
    ↓
ScientificFrame → ObservableModel → RenderState / DOM
```

Rust owns model arithmetic and scientific expression production. TypeScript
owns schema bridges, adapter identity, loading, projection, and composition.
World, render, and ACE do not import the Rust crate directly.

## Scientific design

The native core reproduces the accepted v0 model:

- reduced molality and reduced ionic-strength variables;
- self-consistent Davies activity inside equilibrium equations;
- `Kw = a(H+) · a(OH-)` with the pinned unit-water convention;
- common acetate-family analytical balance for HOAc and NaOAc;
- declared total-solute and ionic-strength domain;
- explicit `MODEL_OUT_OF_DOMAIN`, `INVALID_INPUT`, and `NOT_CONVERGED`;
- deterministic math with no implementation-dependent native logarithm or
  exponential in replay-relevant paths.

The Scientific Core expression output includes, when applicable:

1. charge balance;
2. water autoprotolysis;
3. acid-family equilibrium;
4. acid-family component balance;
5. ionic-strength fixed point `I(species) - I = 0`;
6. Davies activity coefficient relation;
7. activity definition `a_i = γ_i · m̂_i`.

Each expression carries current substitutions, model/config identity, source
replay identity, producer identity, and explicit omitted terms. Render only
re-presents these records.

## World/event design

No new world event is introduced. Existing worlds retain
`acidbase-monoprotic-davies@1.0.0` and use the exact legacy adapter for replay.
New native worlds use an explicitly versioned identity only after the backend
gate. A backend change is not hidden inside the existing solver version.

## Representation design

The WASM adapter supplies the same `ScientificState` and expression records as
the facade. `ScientificFrame` and Observable remain the single downstream path.
Browser code does not inspect WASM internals or create scientific fallback
values.

## Learning design

No ACE change. Backend selection, numerical failure, and domain qualification
are scientific facts available to later layers; neither layer may alter them.

## Privacy/compliance

WASM is bundled and self-hosted. No solver request, world state, learner state,
or PHREEQC data is sent to a server. The native host artifact is CI/developer
tooling only and is not a runtime service. Build checks must preserve the
existing no-external-origin and no-telemetry guarantees.

## API/schema changes

The public facade remains asynchronous. The proposed first bridge is:

```text
solveCanonicalJson(requestJson: UTF-8) -> backendPayloadJson: UTF-8
```

The payload contains the result envelope, `ScientificState`, and the complete
Scientific Core-produced expression records for the solved frame. Both sides
validate the current scientific wire schema. New worlds bind the native backend
version; legacy worlds bind the existing TypeScript version. Any expression
equation-id expansion receives a candidate wire/producer revision and
regenerated schema artifacts; it is not an undocumented in-place change.

## Failure modes

| Failure | Required result |
|---|---|
| WASM unavailable or cannot initialize | explicit backend unavailable error |
| malformed/wrong-version bridge output | adapter contract error; no state |
| input outside model domain | `MODEL_OUT_OF_DOMAIN` |
| valid input cannot be solved | `NOT_CONVERGED` with diagnostic code/reason |
| native provenance differs from model/config | adapter contract error |
| differential disagreement beyond tolerance | validation finding; no averaging or silent selection |
| backend unavailable for legacy world | exact lookup/unavailable workflow; no silent re-solve |

## Test plan

Tests are written RED before each production behavior:

- symbolic tests first require the fixed-point, Davies, and activity equations;
- Cargo tests cover deterministic vectors, balances, domains, diagnostics, and
  expression production;
- host JSON bridge tests cover malformed input/output and schema versions;
- WASM smoke tests run in Node and the browser;
- differential fixtures compare TS 1.0.0, Rust host, Rust WASM, and PHREEQC
  where meaningful;
- identity tests prove versions are not interchangeable and fallback is absent;
- M5 tests prove World → native adapter → frame → Observable → DOM;
- replay tests prove old worlds use TS identity and new worlds persist native
  identity;
- CI includes Cargo format/check/test, WASM build, and the existing TS/Python,
  PHREEQC, browser, and acceptance gates.

## Acceptance criteria

The backend supersession gate is binary:

1. Native equations, domain, diagnostics, provenance, and deterministic policy
   match accepted M4 semantics.
2. Native host and WASM paths return schema-valid state and expression payloads
   for canonical requests.
3. The complete symbolic equation set is produced by the native Scientific Core,
   not authored by the facade or render package.
4. REF-1…REF-10, adversarial cases, and ORACLE sweep are rerun with declared
   tolerances and explicit disagreement disposition.
5. No disagreement is averaged, hidden, or converted into domain refusal.
6. Existing v1 worlds replay through v1; new worlds bind v2 only after explicit
   registration and validation.
7. WASM/backend failures and scientific failures remain distinct, with no
   silent TS fallback.
8. M5 production composition/browser evidence consumes native through
   `@chemrealm/sci` without direct cross-core coupling.
9. Rust/WASM artifacts are reproducible and attested in hosted CI.

## Rollout/migration

This is a backend identity migration, not an in-place rewrite of old worlds.
The TypeScript adapter remains a legacy/replay and differential implementation.
The native version becomes default only after the supersession evidence is
complete. Any persisted schema change receives its own version and migration;
backend replacement must not rewrite genesis content hashes.

## Open questions

- Main-thread versus worker WASM loading remains benchmark-driven.
- Binary bridge and C/C++ compatibility remain deferred.
