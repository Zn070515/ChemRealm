# M5 Provenance and Frame Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make the M5 representation boundary consume only replayable, source-bound scientific and physical inputs, while preserving the accepted M4 world/runtime contracts.

**Architecture:** The schema package will persist a serializable, content-addressed volume-profile snapshot inside each genesis vessel. The web composition root resolves and hashes that snapshot; World Runtime stores and replays it without loading assets. Scientific Core will return a frame that owns its physical liquid volume, and Render will consume that frame rather than accepting a second volume. Symbolic expressions and curve points will be produced from source-bound scientific frames, while presentation policy becomes a discriminated union.

**Tech Stack:** TypeScript 5.9, Zod 4, Vitest, pnpm workspaces, JSON Schema generation.

**Spec:** SPEC-0001 revision 24 Candidate, ADR-0013, and the M5 remediation spec.

## Global Constraints

- World Runtime remains a synchronous deterministic event fold and must not import Scientific Core or renderer code.
- Genesis must be self-contained; replay must not resolve geometryRef or load mutable content.
- Scientific Core owns chemistry and scientific expressions; Render only re-presents approved outputs.
- ScientificFrame owns the exact physical inputs used by its projection; no duplicate liquidVolume may enter Observable construction.
- Persisted schema changes require a forward migration and explicit version bump; migrated genesis content hashes are rebuilt at the World Runtime boundary.
- Existing M4 S3 status is preserved; this round must not alter the M4 solver or PHREEQC acceptance claims.
- M5 remains S2 until browser/DOM and visual evidence are actually produced.

---

### Task 1: Record the replayable volume-profile contract

**Files:**
- Create packages/schema/src/volume-profile.ts
- Modify packages/schema/src/content.ts and packages/schema/src/world.ts
- Modify packages/schema/src/index.ts
- Create docs/adr/0013-replayable-geometry-and-scientific-frame.md
- Modify SPEC-0001 and the M5 remediation spec
- Test packages/schema/src/contracts.test.ts

**Interfaces:**
- Consumes canonical quantity schemas and DataProvenanceSchema.
- Produces VolumeProfileSnapshotSchema and a required volumeProfile field on authored/resolved vessel definitions.

- [x] Write failing schema tests proving a resolved vessel requires profile identity, version, hash, serializable knots, ranges, tolerance, and provenance; a geometryRef-only vessel must be rejected.
- [x] Run the focused schema tests and verify RED.
- [x] Implement the schema with canonical L/mm quantities, monotonic knots, explicit valid ranges, and no functions in persisted data.
- [x] Add ADR-0013 and SPEC revision 22 Candidate. Define profileHash as the digest of the canonical profile payload excluding the hash field.
- [x] Run schema tests and generated-schema drift checks.

### Task 2: Version and migrate persisted world profiles

**Files:**
- Modify packages/schema/src/world.ts, events.ts, migrate.ts, and export.ts
- Modify packages/world/src/state.ts and snapshot.ts
- Test packages/schema/src/contracts.test.ts and packages/world/src/state.test.ts/replay.test.ts

**Interfaces:**
- Consumes VolumeProfileSnapshot and the current world migration chain v1 to v3.
- Produces persisted world schema v4 and a loud v3 to v4 migration boundary requiring an explicit profile resolver when an old record has only geometryRef.

- [x] Write failing tests for v3 records without profiles, explicit-profile migration, contentHash rebuilding, and replay after external profile changes.
- [x] Run focused migration tests and verify RED.
- [x] Implement v4 and a 3 to 4 migration that injects only an explicitly supplied canonical profile or returns NO_PATH; never invent a profile from geometryRef.
- [x] Rebuild scenario contentHash at the World Runtime boundary whenever migration changes profile data; keep schema migration unaware of derived hashes.
- [x] Update valid fixtures to v4 and run schema/world tests.

### Task 3: Resolve profiles in the composition root and expose an internal runtime profile adapter

**Files:**
- Modify apps/web/src/world-creation.ts and its tests
- Modify packages/render/src/observable/level.ts and level.test.ts
- Modify packages/render/src/index.ts

**Interfaces:**
- Consumes authored profile knots and persisted VolumeProfileSnapshot.
- Produces deterministic profile hashing/resolution and an internal
  volumeProfileFromSnapshot(snapshot): VolumeProfile adapter.

- [x] Write failing tests for equivalent profile inputs, persisted profile hashes, and both-direction calculation from frozen knots without external lookup.
- [x] Run focused tests and verify RED.
- [x] Implement canonical profile resolution: normalize knots, validate ranges/tolerance, hash the hash-excluded payload, and persist the digest.
- [x] Implement a render-side piecewise-linear adapter using only snapshot data.
- [x] Run composition and level tests.

### Task 4: Bind physical volume into ScientificFrame and remove the Observable duplicate

**Files:**
- Modify packages/sci/src/frame.ts and frame.test.ts
- Modify packages/render/src/observable/index.ts and observable.test.ts
- Modify packages/render/src/state/scene.test.ts

**Interfaces:**
- Consumes ScientificState, source replay identity, and canonical Litre.
- Produces frozen ScientificFrame.physical.liquidVolume; ObservableInput consumes only frame plus volumeProfileSnapshot.

- [x] Write failing tests for a frame made at 0.1 L being unable to accept a second 0.5 L input, and for the frame exposing the projection volume.
- [x] Run focused tests and verify RED.
- [x] Implement the frozen physical block and make projection use that exact value.
- [x] Remove ObservableInput.liquidVolume; derive level and volume-dependent presentation from frame.physical.liquidVolume.
- [x] Run science/render tests and typecheck.

### Task 5: Make hydrogen-ion policy and frame payload states unambiguous and immutable

**Files:**
- Modify packages/render/src/state/scene.ts and scene.test.ts
- Modify packages/sci/src/frame.ts and frame.test.ts
- Modify docs/adr/0006-renderer-and-observable-architecture.md

**Interfaces:**
- Consumes one ScientificFrame and one policy identifier.
- Produces an ID-only or discriminated HydrogenIonPresentationPolicy, a deep-frozen frame payload, and one readout per view.

- [x] Write failing compile/runtime tests for a mismatched policy and nested scientific-state mutation.
- [x] Run tests/typecheck and verify RED.
- [x] Implement the smallest contract: prefer policy ID only, derive readout key/id internally, and deep-clone/deep-freeze the frame crossing the boundary.
- [x] Update scene construction and ADR wording.
- [x] Run render tests and compile-time guarantees.

### Task 6: Create Scientific Core symbolic expressions and source-bound curve frames

**Files:**
- Create or modify packages/sci/src/expressions.ts and packages/sci/src/frame.ts
- Modify packages/render/src/observable/symbolic.ts and curve.ts
- Modify symbolic/curve/observable tests

**Interfaces:**
- Consumes an immutable ScientificFrame and model provenance.
- Produces createScientificExpressions(frame) and a source-identified curve-frame contract; Render receives validated source-bound records. Live multi-frame composition remains an evidence task.

- [x] Write failing producer and curve tests proving expressions carry frame identity and malformed/unbound curve frames are rejected.
- [x] Run focused tests and verify RED.
- [x] Implement the producer and frame-derived curve conversion; keep expression semantics in sci.
- [x] Update Observable callers while retaining only narrow schema validation at the boundary.
- [x] Run science/render tests and dependency guards.

### Task 7: Align evidence, guards, and handoff

**Files:**
- Modify docs/evidence/M5.md, M5 specs, PLAN-0001, tools/check_m5_contract_consistency.mjs, package.json, and CI workflow.

**Interfaces:**
- Consumes tests and implementation from Tasks 1 to 6.
- Produces explicit M5 S2 evidence with no false PASS for profile replay, frame, or symbolic producer.

- [x] Write failing guard fixtures for string-only geometryRef claims, duplicate Observable volume, and premature frame/symbolic PASS.
- [x] Run the guard and verify RED against current documentation.
- [x] Update canonical/spec/ADR/plan/evidence language, bump persisted world schema and SPEC revision, and keep DOM/visual evidence open.
- [x] Run the complete repository verification chain: typecheck, test typecheck, build, test, scientific math/quantity guards, M4/M5 contracts, world, guarantees, schema artifacts, dependency cruise, guards, lint, browser, Python Oracle, acceptance coverage, artifact inspection, and git diff check.
- [x] Inspect the diff, commit, push, and record hosted CI: implementation commit `fe323d4`, hosted CI `34754417753` success. Handoff states M4 S3 remains accepted, M5 remains S2, M6 is not authorized, and symbolic/browser/visual evidence remains open.

### Task 8: Close the executable geometry seam at the Observable boundary

**Objective:** Ensure all Observable liquid-level geometry is derived from the
replay-frozen profile snapshot rather than from caller-supplied functions or a
payload that only self-reports a matching hash.

**Files:** `packages/render/src/observable/index.ts`, Observable/scene tests,
render/world test TypeScript configurations, the M5 contract guard, and the
revision 24 specification/evidence documents.

**Interfaces:** `ObservableInput` accepts `volumeProfileSnapshot` only;
`buildObservableModel` validates the frame/profile hash and calls
`volumeProfileFromSnapshot` internally. The shared schema parser recomputes the
profile content hash before constructing the executable adapter.

- [x] Add a compile-time negative fixture proving an executable `volumeProfile`
  cannot satisfy `ObservableInput`.
- [x] Enable the render/world test TypeScript projects to include their test
  sources so the negative boundary is actually checked.
- [x] Replace render callers with the frozen snapshot input and reconstruct the
  runtime adapter inside Observable.
- [x] Recompute and verify the profile content hash before reconstructing the
  executable adapter; retain the frame/profile identity check as a separate
  binding validation.
- [x] Update canonical revision, ADR/spec/plan/evidence wording, and the M5
  consistency guard.
- [x] Run the complete verification chain, inspect the diff, commit, push, and
  record the hosted CI attestation: implementation commit
  `e02d176574be3fc7c321ff51d5c1831568bfb925`, hosted CI
  `34757093908` — success. Keep M5 S2 and M6 unauthorized.

## Stop/Go Conditions

- Stop if a required persisted profile cannot be migrated without explicit profile data; do not invent geometry from geometryRef.
- Stop if any change makes World Runtime depend on Scientific Core or renderer.
- Proceed only after each task's focused tests are green and its interface is reflected in the next task.
- Do not claim M5 S3 or authorize M6; DOM, browser, final renderer, and visual baselines remain later evidence.
