# M5 Frame and Contract Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining M5 identity, canonical representation, and burette numeric-boundary gaps without changing M4 science or starting M6.

**Architecture:** The Scientific Core creates a source-identified projection frame from one authoritative world-state identity, and render consumes that frame structurally without recomputing chemistry. Canonical SPEC-0001 revision 21 records the empirical palette and readout ownership semantics; the M5 observable layer keeps exact scale/contained/delivered values and uses a bounded floating-point summation policy.

**Tech Stack:** TypeScript 5.9, Vitest, pnpm workspaces, `@chemrealm/schema` branded quantities, existing M4 scientific projection.

**Spec:** `docs/superpowers/specs/2026-09-13-m5-contract-remediation.md` and `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md` revision 21 Candidate.

## Global Constraints

- M4 S3 remains accepted; no M4 equation, solver, World Runtime, replay, or persisted-world change.
- M5 remains S2 until its scoped DOM/contract and owner evidence exist; M6
  visual realization evidence is downstream and is not an M5 prerequisite.
- `packages/render` may not import `packages/sci`; composition uses structural data from the Scientific Core.
- Scientific identity is supplied by the authoritative world-state hash and is produced once at the composition boundary.
- Burette scale reading is `initialScaleReading + deliveredVolume`; contained volume is separate.
- Empirical palette literals may exist only in the declared identity-keyed palette catalogue, with an explicit empirical note.
- Tests must be written and observed failing before production behavior is changed.

### Task 1: Bind projection identity at the Scientific Core boundary

**Files:**
- Modify: `packages/sci/src/projection.ts`
- Modify: `packages/sci/src/projection.test.ts`
- Modify: `packages/sci/test/reference.test.ts`
- Create: `packages/sci/src/frame.ts`
- Create: `packages/sci/src/frame.test.ts`
- Modify: `packages/sci/src/index.ts`
- Modify: `packages/render/src/observable/index.ts`
- Modify: `packages/render/src/observable/observable.test.ts`

**Interfaces:**
- Consumes: authoritative `sourceStateHash`, one `ScientificState`, and canonical `liquidVolume`.
- Produces: `ScientificProjection.sourceStateHash` and `projectScientificFrame(state, { sourceStateHash, liquidVolume })`.

- [ ] **Step 1: Write the failing tests**

Add a projection assertion that the returned projection carries the supplied
source hash. Add a frame test that creates two frames with different hashes and
proves that combining state A with projection B is rejected by
`buildObservableModel`. The frame factory must call `projectScientificState`
internally so callers do not manually fill a second projection identity.

- [ ] **Step 2: Run the focused tests and verify RED**

```text
pnpm exec vitest run packages/sci/src/projection.test.ts packages/sci/src/frame.test.ts packages/render/src/observable/observable.test.ts
```

Expected: the new source-hash assertion and frame import/identity assertions
fail because projection has no identity field and the factory does not exist.

- [ ] **Step 3: Implement the minimal binding**

Add `sourceStateHash` to `ScientificProjectionInput` and the frozen projection
result. Add `projectScientificFrame` in `packages/sci` that validates a non-empty
hash, invokes `projectScientificState` once, and returns one frozen object with
the state, projection, and same hash. Render compares the frame hash against
the projection hash and the frame's ScientificState provenance model identity.

- [ ] **Step 4: Run focused tests and verify GREEN**

```text
pnpm exec vitest run packages/sci/src/projection.test.ts packages/sci/src/frame.test.ts packages/render/src/observable/observable.test.ts
pnpm typecheck:tests
```

Expected: source identity is produced by the Scientific Core frame factory,
cross-frame state/projection combinations are rejected, and existing projection
tests use the new input contract.

### Task 2: Make canonical representation wording match the implemented M5 boundary

**Files:**
- Modify: `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`
- Modify: `docs/superpowers/specs/2026-09-13-m5-contract-remediation.md`
- Modify: `docs/adr/0006-renderer-and-observable-architecture.md`
- Modify: `docs/evidence/M5.md`
- Modify: `docs/plans/PLAN-0001-world-foundation-acid-base-titration.md`

**Interfaces:**
- Consumes: implemented identity-keyed empirical palettes and observable formatter.
- Produces: SPEC revision 21 language that does not prohibit the declared palette or misassign readout ownership.

- [ ] **Step 1: Write the failing document-consistency checks**

Extend the M5 contract consistency test or add a focused repository test that
requires revision 21 to state both:

```text
chemical colour literals are allowed only in a provenance-bearing empirical palette catalogue
readout precision/formatting belongs to the observable presentation boundary, while DOM rendering remains Renderer-owned
```

It must reject the old unqualified AC-V3 wording when it appears as the active
criterion and reject the old `Readout text, 2 dp formatting | Renderer` ownership
claim.

- [ ] **Step 2: Run the checks and verify RED**

```text
pnpm verify:m4-contracts
pnpm verify:m5-contracts
```

Expected: the new revision-21 assertions fail against the current canonical
wording.

- [ ] **Step 3: Update only the canonical wording and evidence status**

Amend revision 21 Candidate rather than letting the child spec override
SPEC-0001. Preserve AC-V4, AC-V6, and AC-V8 as full canonical criteria. State
that the palette catalogue is the sole allowed home for empirical colour
constants, and that observable formatting owns string/precision policy while a
Renderer owns actual DOM/Pixi drawing. Keep M5 evidence at S2/PARTIAL where
browser or visual evidence is absent.

- [ ] **Step 4: Run checks and verify GREEN**

```text
pnpm verify:m4-contracts
uv run python tools/check_acceptance_coverage.py
git diff --check
```

### Task 3: Harden burette summation at the exact full-draw boundary

**Files:**
- Modify: `packages/render/src/observable/burette.ts`
- Modify: `packages/render/src/observable/burette.test.ts`
- Modify: `packages/render/src/observable/format.test.ts`

**Interfaces:**
- Consumes: finite non-negative canonical litre deliveries.
- Produces: deterministic `BuretteState` with no false overdraw for a mathematically exact full draw and no negative contained volume.

- [ ] **Step 1: Write the failing boundary tests**

Add a case where several finite deliveries sum to the initial contained volume
within ordinary IEEE-754 accumulation error, and assert it returns
`containedVolume: 0` rather than throwing. Add a case with the same shape but a
real positive overdraw and assert it still throws. Retain the existing ordinary
full-draw and overdraw cases.

- [ ] **Step 2: Run the tests and verify RED**

```text
pnpm exec vitest run packages/render/src/observable/burette.test.ts
```

Expected: the floating-point full-draw case is rejected by the current direct
`delivered > initialContainedVolume` comparison.

- [ ] **Step 3: Implement a documented numeric policy**

Use a deterministic compensated sum for deliveries and a roundoff bound derived
from the number of additions and `Number.EPSILON`. If the compensated total is
within that bound of the initial contained volume, use the semantic exact-full-
draw branch (`deliveredVolume = initialContainedVolume`, `containedVolume = 0`).
If it exceeds the bound, reject; never clamp a genuine overdraw. Keep scale
reading as initial scale plus the normalized delivered total.

- [ ] **Step 4: Run focused tests and verify GREEN**

```text
pnpm exec vitest run packages/render/src/observable/burette.test.ts packages/render/src/observable/format.test.ts
```

### Task 4: Final verification and handoff

**Files:**
- Modify: `docs/evidence/M5.md`

**Interfaces:**
- Consumes: Tasks 1–3 and all existing repository gates.
- Produces: exact implementation baseline, local evidence, and no M5 S3 claim.

- [ ] **Step 1: Run all repository checks**

```text
pnpm typecheck
pnpm typecheck:tests
pnpm build
pnpm test
pnpm depcruise
pnpm guards
pnpm lint
pnpm verify:guarantees
pnpm verify:schema-artifacts
pnpm verify:scientific-math
pnpm verify:scientific-quantities
pnpm verify:world
pnpm verify:m4-contracts
pnpm verify:m5-contracts
pnpm test:browser
uv run pytest
uv run python tools/check_acceptance_coverage.py
git diff --check
```

- [ ] **Step 2: Pin evidence after the implementation commit**

Record the implementation commit and hosted CI separately. Keep criteria
partial/not-run where their scoped DOM or contract evidence is not present;
AC-V3/AC-V4 contract evidence is owned by M5, while M6 visual realization is
downstream. Do not authorize M6 from this S2 round.

- [ ] **Step 3: Commit and push**

```text
git add <changed-files>
git commit -m "Close M5 frame and representation contracts"
git push origin main
```

## Stop/Go

Stop if the frame factory causes `packages/render` to import `packages/sci`, if
the floating-point tolerance can classify a real overdraw as a full draw, or if
canonical SPEC wording is changed without a revision-21 amendment. Go to M6
only after separate owner acceptance and the missing DOM/visual evidence is
actually produced.
