# Native Semantic Closure Plan

## Context

The native WASM backend now has a working host/WASM differential path, but the
current review identifies four evidence-boundary risks: the native bridge may
accept authoring-unit requests that Rust cannot consume, native scientific
expressions are not checked for exact producer/applicability identity, and
historical M0/M5 evidence can be confused with later native work. The native
supersession gate also needs to be an explicit prerequisite set rather than a
circular statement about becoming the default backend.

## Goal

1. Make the TypeScript schema, generated JSON Schema, and Rust bridge agree on
   the canonical native request wire contract.
2. Make native scientific-expression validation exact for producer version,
   equation applicability, uniqueness, and completeness.
3. Preserve historical milestone evidence while recording later native work as
   separately attributable amendments and make the M4-B gate non-circular.
4. Add focused negative tests and mechanical checks so these contracts cannot
   silently regress.

## Non-goals

- Do not make the native backend the default production backend in this round.
- Do not claim M4-B, M5, or M6 S3.
- Do not redesign the acid-base equations or widen the scientific domain.
- Do not replace the existing canonical version manifest with scattered version
  literals.

**Implementation status:** Steps 1–3 are implemented and locally verified;
the next required evidence is the hosted CI attestation for the pushed
baseline. No milestone is promoted by this plan.

## Architecture

- Schema owns the serialized native bridge request contract and generated JSON
  Schema artifacts.
- Scientific Reality Core owns expression producer identity and applicability.
- Rust owns the native execution ABI but must conform to the schema contract.
- Evidence documents own historical attribution; rollout policy remains a later
  stage decision.

## Implementation steps

### Step 1 — Canonical native request boundary

- Add a canonical-unit native request schema and use it from
  `NativeSolveEnvelopeSchema`.
- Add a schema artifact/guard assertion that native request unit semantics are
  canonical-only and agree with the Rust bridge.
- Add negative tests proving authoring units remain valid for ordinary solve
  requests but are rejected by the native envelope.

Stop/go: the generated schema, TypeScript parser, Rust ABI, and negative
fixtures all agree; no current native runner requires non-canonical units.

### Step 2 — Exact native expression contract

- Introduce a minimal `ScientificExpressionSource` for the producer API and
  remove the fake `ScientificFrame` cast.
- Centralize expected equation IDs and producer-version validation.
- Validate exact equation sets, no duplicates, and acid-family applicability
  at native/result boundaries; add wrong-version, missing, duplicate, and
  non-acid applicability fixtures.

Stop/go: valid expressions pass; each malformed set fails with a specific
contract error; the producer version is read from the central manifest.

### Step 3 — Evidence and governance attribution

- Keep M0 historical evidence explicitly two-toolchain and add a separate
  post-M0 native-toolchain amendment packet.
- Add a post-baseline M5 semantic-remediation attestation rather than rewriting
  the original M5 baseline.
- Rewrite M4-B supersession prerequisites so explicit v2 world/replay,
  native composition/browser, artifact identity, and hosted CI precede any
  later default-backend rollout decision.
- Refresh stale native follow-up plan and canonical PLAN wording.

Stop/go: every claim has one baseline, one CI attestation, and one owner; no
historical milestone is retroactively credited with later work.

### Step 4 — Additional bounded hardening

- Extend native evidence checks for the complete TS/native matrix and document
  remaining native scientific-math corpus work if it cannot be completed in
  this round.
- Keep deallocation and nearest-supported identity regression coverage intact.

Stop/go: all targeted checks pass and remaining S3 work is explicit rather than
implicitly hidden in a green aggregate.

### Step 5 — Verification and handoff

- Run generated-schema/version checks, native guards, type checks, unit tests,
  native differential checks, Python evidence tests, and the full local suite.
- Inspect the final diff, commit the round, and push `main`.

## Evidence required

- TypeScript and Rust bridge negative fixtures.
- Native expression contract tests with exact equation sets.
- Historical evidence/amendment documents with explicit baselines.
- M4-B gate checker output and native differential output.
- Full reproducible command list in the final handoff.

## Acceptance criteria

- A native envelope cannot contain a non-canonical quantity unit.
- Native expressions cannot pass with a wrong producer version, duplicate or
  missing equations, or equations not applicable to the returned state.
- M0 and later native evidence remain separately attributable.
- The native supersession gate has no circular “default after gate” prerequisite.
- No stage is promoted to S3 by this round.
