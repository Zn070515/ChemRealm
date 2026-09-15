# ADR-0014 — Native Scientific Core and WebAssembly deployment

**Status:** **Accepted — architecture decision only; native supersession/default rollout remains unapproved**, 2026-09-15
**Date:** 2026-09-13  
**Deciders:** Project owner  
**Related:** `GOAL.md` §5.1, §5.2, §6.1, §20; ADR-0003, ADR-0007, ADR-0012  
**Blocks:** native supersession/default-backend rollout decision; it does not
block the separately accepted M5 contract or authorized M6 entry.

## Context

M4 S3 accepted `acidbase-monoprotic-davies@1.0.0`, whose production
implementation is TypeScript. That implementation remains a valid historical
backend and is covered by the accepted M4 evidence. M5 now has a real
World → Scientific Core → ScientificFrame → Observable composition path, so the
next backend choice affects browser execution and the identity of new worlds.

`GOAL.md` §20 permits Rust or C/C++ for profiled scientific kernels, native
adapters, and WebAssembly boundaries, while requiring measurement and explicit
validation. The current workspace has Rust/Cargo, Clang, CMake, and Ninja, but
has no native scientific crate. The existing async `SolverAdapter` is already
compatible with a worker, WASM, or out-of-process implementation.

The project must not create two independent scientific truths. A native port is
acceptable only if it implements the same declared model, deterministic numeric
policy, domain/refusal semantics, provenance, and symbolic inspection contract.
PHREEQC remains an independent oracle and is not replaced by the native code.

## Decision

### Production implementation

The next production implementation of the v0 acid-base model will be a Rust
scientific core compiled to WebAssembly for the browser and to a native host
artifact for CI and non-browser validation. Rust owns model arithmetic,
deterministic math, scientific state construction, and complete model
expressions. It does not own World Runtime, renderer, or ACE policy.

`@chemrealm/sci` remains the public facade and composition boundary. It owns
schema validation, adapter identity, registry/resolution, backend loading,
projection/frame composition, and conversion between the stable wire contract
and TypeScript domain objects. `@chemrealm/world` never imports the native
implementation directly.

The first native bridge uses a strict, versioned UTF-8 JSON wire boundary. The
TypeScript facade validates canonical request data before sending it; the Rust
boundary validates it again; its backend payload contains both the
`ScientificState` and the Scientific Core's `ScientificExpression` records;
both are parsed through the scientific schema before they can reach a frame or
renderer. The bridge carries no function references or mutable object aliases.
A binary wire format is deferred until profiling demonstrates that JSON
transfer is material.

### Determinism and scientific semantics

Replay-relevant transcendental operations in the Rust core use explicitly
specified deterministic implementations. Rust standard-library transcendental
functions are not an accepted substitute for the existing deterministic math
contract. The implementation preserves reduced molality, the Davies domain,
total-solute limits, numerical failure codes, exact model/config provenance,
and `withinProposedAccuracyEnvelope` semantics.

The native producer emits the complete equation set needed to explain the
implemented model, including charge balance, water autoprotolysis, acid-family
equilibrium and balance, the ionic-strength fixed point
`I(species) - I = 0`, the Davies activity-coefficient equation, and
`activity = gamma · reduced molality`, with current substitutions and explicit
omitted-term metadata. A generic statement that a solve occurred is not enough.

### Backend identity and legacy replay

The existing TypeScript adapter remains an exact legacy backend:

```text
acidbase-monoprotic-davies@1.0.0  — TypeScript legacy replay/reference
acidbase-monoprotic-davies@2.0.0  — Rust/WASM native production candidate
```

The registry never silently substitutes one version for another. Existing
worlds retain their persisted solver identity and use the exact legacy backend
when available. New worlds use the native backend only after the supersession
gate passes. If the native backend is unavailable, the caller receives an
explicit unavailable result; it does not silently fall back to TypeScript.

The accepted M4 S3 evidence remains historical evidence for version 1.0.0. A
native backend does not rewrite that evidence or mutate old genesis records.
It receives a new committed baseline and must rerun relevant M4 references,
domain/failure tests, deterministic math checks, provenance checks, and the
PHREEQC comparison before becoming the default.

### C/C++ and GPU boundary

Rust is the first native implementation. C and C++ are not introduced merely
for speed. A future C/C++ compatibility island may implement the same stable
wire contract or an explicitly versioned C ABI when a measured workload or a
validated external library justifies it. GPU work remains deferred until
profiling identifies a suitable parallel workload and independent numerical
validation is available.

### Fallback and failure policy

Backend selection is explicit and recorded in adapter/model/config identity.
WASM initialization failure, malformed bridge output, schema mismatch, native
error, domain refusal, and non-convergence are distinct failures. No fallback
may convert a backend failure into a result produced by another model or
version without an explicit caller-selected re-solve workflow.

## Consequences

- Browser chemistry can use one shared scientific implementation.
- Native and WASM executions can be compared with the TS legacy backend and
  PHREEQC.
- Existing worlds remain replayable without treating a backend swap as a no-op.
- Cargo/WASM artifacts increase build and CI complexity.
- Compilation and convergence alone cannot accept the native backend; identity,
  symbolic, domain, oracle, browser, and replay evidence are required.

## Reversibility

Moderate to hard. The facade and exact versioned registry preserve rollback, and
the TypeScript 1.0.0 backend remains available for legacy worlds. Once new
worlds persist the native identity, removing it becomes a solver-availability
or migration decision governed by ADR-0008, not an ordinary refactor.

## Evidence required

- Rust unit/property tests for deterministic math, balances, domains, and
  failure codes;
- native host and WASM bridge round-trip tests through the scientific schema;
- TS ↔ Rust differential results over REF-1…REF-10, adversarial cases, and
  the ORACLE sweep;
- identity-verified PHREEQC comparison;
- complete symbolic equation-set and producer/provenance tests;
- exact identity and explicit no-fallback tests;
- legacy replay and native-genesis tests;
- browser composition evidence using the selected WASM backend;
- reproducible Cargo/WASM build metadata and hosted CI attestation.

## Rollout / migration

1. Record the candidate contract in `SPEC-0001` revision 26 and add the M4
   backend-supersession plan.
2. Complete the symbolic contract before using it as native evidence.
3. Build/test the Rust host core and WASM bridge without changing accepted M4.
4. Run differential/oracle validation and record a native candidate baseline.
5. Register the native version and make it default only after the gate passes.
6. Re-run M5 composition/browser evidence against native. M6 remains blocked
   until that evidence is complete.

## Open questions

- Main-thread versus worker WASM loading is a benchmark-driven choice; the
  adapter remains async either way.
- A binary bridge and future C/C++ compatibility layer remain deferred.
