# Native Follow-up Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Record the native follow-up remediation and keep its historical
evidence attributable without overstating native M4-B or M5 completion. The
later semantic-closure round is tracked in
`2026-09-14-native-semantic-closure.md`.

**Handoff status:** The native REF matrix, host/WASM differential, pinned
PHREEQC comparison, explicit opt-in composition, and local contract/toolchain
checks listed by this plan have since been exercised and attested by their own
commits. The remaining work is the explicit native supersession gate: v2
WorldCreated creation/replay, final native browser/artifact evidence, and a
hosted attestation for one committed baseline. The default-backend choice is a
later rollout decision, not evidence for that gate.

**Architecture:** Keep `packages/schema` as the only authored cross-boundary contract, with Rust consuming a generated or mechanically checked representation. Keep native execution separate from the accepted TypeScript legacy backend, and make all stage-gate decisions explicit in the canonical plan and ADRs. Strengthen refusal identity at the `@chemrealm/sci` adapter boundary without changing World Runtime semantics.

**Tech Stack:** TypeScript 5.9, Zod/JSON Schema, Rust 1.97/Cargo, serde, Vitest, Python/pytest, Markdown ADR/spec/plan documents.

**Spec:** `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`, `docs/superpowers/specs/2026-09-13-m4-native-contract-remediation.md`, and `docs/superpowers/specs/2026-09-13-m4-native-scientific-backend.md`.

## Global Constraints

- Preserve accepted legacy M4 S3 evidence for the TypeScript `1.0.0` backend.
- Do not claim M4-B S3, native M5 S3, or M6 authorization before their evidence exists.
- `packages/schema` owns persisted and bridge wire contracts; Rust must not silently become a second source of truth.
- `sourceStateHash` is the opaque World Runtime replay-equivalence identity; `requestHash` is the exact native bridge request identity.
- Davies symbolic expressions use reduced dimensionless `Î` with unit `1`.
- Native backend failures must not silently fall back to the TypeScript backend.
- Active version values are read from `contracts/version-manifest.json`; generated sources and guards must remain synchronized.
- M0's two-toolchain evidence is historical; Rust/Cargo is a post-M0 amendment.
- A native-default rollout is a post-supersession decision, never a gate input.

---

### Task 1: Make the native Rust bridge contract mechanically schema-derived

**Files:**
- Modify: `packages/schema/src/scientific.ts`
- Modify: `packages/schema/src/json-schema.ts` or the existing schema artifact emitter
- Create or modify: `native/sci-core/build.rs`
- Modify: `native/sci-core/src/lib.rs`
- Create or modify: `tools/check_native_schema_contract.mjs`
- Test: `packages/sci/src/native-backend.test.ts`
- Test: `native/sci-core/tests/contract.rs`
- Test: `tools` contract test or existing guard test location

**Interfaces:**
- Consumes: schema-owned `SolveRequestSchema`, `NativeSolveEnvelopeSchema`, `NativeBackendPayloadSchema`, `ScientificExpressionSchema`, and generated JSON artifacts.
- Produces: one checked-in/generated Rust bridge contract representation and a guard that fails when Rust field names or root versions drift from the schema artifacts.

- [x] **Step 1: Write the failing contract test**

Add a machine-checkable test that loads the emitted native envelope/payload JSON schemas, extracts required properties and root version literals, and compares them with the Rust bridge contract metadata or generated file. The test must fail if a required field is removed from the schema or if Rust's declared bridge version/root fields do not match.

- [x] **Step 2: Run the focused test and verify the failure**

Run `pnpm exec vitest run packages/sci/src/native-backend.test.ts` and the new native contract guard. The test must fail because the current Rust DTOs are still handwritten and have no schema-derived attestation.

- [x] **Step 3: Implement the smallest mechanical bridge attestation**

Generate a Rust source file from committed schema artifacts or generate a canonical Rust contract manifest from the same artifacts during `build.rs`. Replace duplicated root/version/field declarations where practical, and make the guard compare the actual emitted Rust contract metadata to the schema artifact. Keep model arithmetic and domain logic in Rust; only the wire shapes are generated/checked.

- [x] **Step 4: Run the focused test and Rust checks**

Run `pnpm exec vitest run packages/sci/src/native-backend.test.ts`, `pnpm verify:schema-artifacts`, the new guard, `cargo test --manifest-path native/sci-core/Cargo.toml`, and `cargo check --manifest-path native/sci-core/Cargo.toml`. All must pass.

- [x] **Step 5: Record evidence without claiming native supersession**

Update the native evidence/plan to state that the Rust wire contract is mechanically checked against schema artifacts, while native differential/oracle and production composition remain S2/pending.

- [x] **Step 6: Commit**

Included in the final round commit after the schema, governance, and evidence changes.

### Task 2: Close refusal-result identity and preserve capability statically

**Files:**
- Modify: `packages/sci/src/identity.ts`
- Modify: `packages/sci/src/registry.ts`
- Modify: `packages/sci/src/adapter.ts`
- Test: `packages/sci/src/adapter.test.ts`
- Test: `packages/sci/src/registry.test.ts`

**Interfaces:**
- Consumes: `SolverAdapter`, `ScientificExecutionAdapter`, `ModelDescriptor`, `SolveResult`.
- Produces: adapter wrappers and registry lookup results that preserve scientific-execution capability and validate `nearestSupported` against the selected adapter model identity.

- [x] **Step 1: Write failing tests**

Add tests for a `MODEL_OUT_OF_DOMAIN` result whose `nearestSupported.id`, `version`, or nested validity differs from the registered adapter. The wrapper must reject all three. Add a type/runtime test showing a registered `ScientificExecutionAdapter` remains discoverable through the registry capability path without an unsafe cast.

- [x] **Step 2: Run focused tests and verify failure**

Run `pnpm exec vitest run packages/sci/src/adapter.test.ts packages/sci/src/registry.test.ts`. The malformed nearest-supported identity test must fail against the current implementation.

- [x] **Step 3: Implement identity validation**

Extend `assertSolveResultIdentity()` with a model-descriptor comparison for `MODEL_OUT_OF_DOMAIN`, including exact nested identity fields. Keep `NOT_CONVERGED` and `INVALID_INPUT` semantics unchanged. Introduce a capability-aware registry result type or a safe narrowing API so consumers can retrieve `ScientificExecutionAdapter` without pretending every adapter has that capability.

- [x] **Step 4: Run focused tests and full TypeScript checks**

Run the focused tests, `pnpm typecheck`, and `pnpm typecheck:tests`.

- [x] **Step 5: Commit**

Included in the final round commit after the schema, governance, and evidence changes.

### Task 3: Correct native/scientific governance and milestone dependencies

**Files:**
- Modify: `docs/adr/0014-native-scientific-core-and-wasm-deployment.md`
- Modify: `docs/adr/0001-repository-and-workspace-strategy.md`
- Modify: `docs/plans/PLAN-0001-world-foundation-acid-base-titration.md`
- Modify: `README.md`
- Modify: `docs/evidence/M5.md`
- Modify: relevant native M4-B evidence/plan files
- Test: `tools/check_versions.mjs` or a dedicated governance guard

**Interfaces:**
- Consumes: current `contracts/version-manifest.json` and canonical SPEC revision 26.
- Produces: consistent governance statements: ADR-0014 accepted as architecture only, ADR-0001 amended for TS/pnpm + Python/uv + Rust/Cargo, M6 gated by M5 S3 and M4-B S3, and M5 references revision 26.

- [x] **Step 1: Write failing governance assertions**

Add a guard that fails when ADR-0014 is still `Proposed`, when the canonical milestone map says M6 depends only on M5, or when active M5 evidence/plan files refer to SPEC revision 25 while the version manifest says 26.

- [x] **Step 2: Run the guard and verify failure**

Run `pnpm verify:versions` and the new governance guard. It must identify the current stale ADR/plan/evidence statements.

- [x] **Step 3: Update governance documents**

Mark ADR-0014 as `Accepted — architecture decision only`; state explicitly that M4-B supersession remains S2. Amend ADR-0001 with the Rust/Cargo toolchain, location, lockfile, schema relationship, CI ordering, contributor requirements, and WASM artifact ownership. Update README setup wording and canonical PLAN so M6 requires M5 S3 plus M4-B S3. Keep the M5 contract revision and native-backend revision as separate manifest-backed authority fields.

- [x] **Step 4: Run the governance checks**

Run the new guard, `pnpm verify:versions`, and the relevant Markdown/evidence consistency checks. Confirm the documents still say native REF/PHREEQC/browser supersession evidence is pending.

- [x] **Step 5: Commit**

Included in the final round commit after the governance and evidence changes.

### Task 4: Keep the native scientific evidence boundary honest

**Files:**
- Modify: `docs/evidence/M4.md` or native M4-B evidence packet
- Modify: `docs/superpowers/plans/2026-09-13-m4-native-contract-remediation.md`
- Modify: `docs/superpowers/specs/2026-09-13-m4-native-contract-remediation.md`
- Modify: native test/evidence metadata only if required by the new guard

**Interfaces:**
- Consumes: native host/WASM smoke tests, current TS differential tests, PHREEQC runner identity, and canonical SPEC revision 26.
- Produces: a truthful native S2 handoff distinguishing completed bridge checks from pending full REF/oracle/native-browser composition.

- [x] **Step 1: Add a failing evidence consistency test**

Assert that native evidence cannot say M4-B S3 or native M5 S3 while the native REF/PHREEQC/browser composition rows remain pending, and that legacy M4 S3 remains historical rather than being overwritten.

- [x] **Step 2: Run the test and verify the current evidence state**

Run the focused evidence guard. If the current evidence is already truthful, retain the negative test as a regression and record no artificial completion.

- [x] **Step 3: Align native evidence wording**

State clearly that Rust host/WASM, schema bridge, differential smoke cases, and CI toolchain checks are complete slices; full REF-1…REF-10, PHREEQC native sweep, and registered-native production World → Science → Observable → DOM composition are still required for M4-B/M5 closure.

- [x] **Step 4: Commit**

Included in the final round commit after the governance and evidence changes.

### Task 5: Full verification and handoff

**Files:**
- No production file changes unless verification exposes a regression.
- Modify: final evidence handoff only if committed-baseline metadata is stale.

- [x] **Step 1: Run focused verification**

Run the native bridge tests, identity/registry tests, governance/evidence guards, `pnpm verify:versions`, `pnpm verify:schema-artifacts`, and Rust fmt/test/clippy/check commands.

- [x] **Step 2: Run the full repository verification**

Run `pnpm typecheck`, `pnpm typecheck:tests`, `pnpm test -- --run`, `pnpm build`, `pnpm verify:guarantees`, `pnpm verify:schema-artifacts`, `pnpm verify:versions`, `pnpm verify:scientific-math`, `pnpm verify:scientific-quantities`, `pnpm verify:m4-contracts`, `pnpm verify:m5-contracts`, `pnpm verify:world`, `pnpm artifacts`, `pnpm lint`, `pnpm test:browser`, and `uv run pytest`.

- [x] **Step 3: Inspect diff and status**

Run `git diff --check`, `git status --short`, and review every changed governance/source file for accidental stage claims, duplicated active version literals, or weakened tests.

- [x] **Step 4: Commit and push**

Completed as the current round's normal commit and pushed to the configured upstream. No force-push was used.

## Stop/Go

- **STOP:** Any P0/P1 finding remains, a focused regression does not fail before its fix, a full verification command fails, or evidence would need to be weakened to pass.
- **GO:** All focused and full checks pass, governance is internally consistent, Rust bridge drift is mechanically detected, refusal identity is exact, and the handoff explicitly keeps native supersession and M6 gated.
