# M5 Contract Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore M5's canonical representation contracts and harden the pure observable boundary without changing M4 science or World Runtime.

**Architecture:** The canonical `SPEC-0001` revision 21 amendment owns the behavior. `@chemrealm/schema` owns cross-package expression and unit contracts; `@chemrealm/render` owns pure observable transforms and a renderer-neutral scene policy. No browser or Pixi code is introduced.

**Tech Stack:** TypeScript 5.9, Zod, Vitest, pnpm workspaces, dependency-cruiser, existing schema artifact generation.

**Spec:** `docs/superpowers/specs/2026-09-13-m5-contract-remediation.md`

## Global Constraints

- `@chemrealm/render` may import only `@chemrealm/schema` from the workspace.
- Render code must not import `@chemrealm/sci`, `@chemrealm/world`, `@chemrealm/ace`, DOM, React, or PixiJS.
- No renderer transform may read or calculate `Ka`, activity, activity coefficient, or reaction direction.
- `V(h)` and `h(V)` are the only volume-to-height routes, with explicit round-trip tolerance.
- A burette scale reading is `initialScaleReading + deliveredVolume`; contained volume is a separate value.
- Burette readouts use `mL` and `0.01 mL`; conversion code lives in `@chemrealm/schema`.
- A RenderState contains one selected pH convention; the policy is replaceable without changing science or observable transforms.
- M5 remains S2 until DOM, screenshot, and final visual evidence exist.

### Task 1: Canonical revision-21 and remediation documents

**Files:**
- Modify: `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`
- Modify: `docs/adr/0006-renderer-and-observable-architecture.md`
- Modify: `docs/plans/PLAN-0001-world-foundation-acid-base-titration.md`
- Modify: `docs/superpowers/specs/2026-09-13-m5-observable-state.md`
- Modify: `docs/evidence/M5.md`
- Create: `docs/superpowers/specs/2026-09-13-m5-contract-remediation.md`
- Create: `docs/superpowers/plans/2026-09-13-m5-contract-remediation.md`

**Interfaces:** Canonical AC-V4/AC-V6/AC-V8 remain authoritative; revision 21
records the projection cleanup and corrected observable semantics.

- [ ] **Step 1: Add revision 21 Candidate amendment**

Update the SPEC header from current revision 20 Accepted to “Accepted through
20; current revision 21 Candidate”, append the amendment, and update the
projection/burette/representation text without marking M5 S3.

- [ ] **Step 2: Narrow M5 evidence claims**

Change M5 AC-V4 and AC-V6 from PASS locally to PARTIAL until their complete
inverse/DOM evidence exists; document the new policy and burette contract.

- [ ] **Step 3: Run document consistency search**

Search all docs for the old `initial − Σ delivered` and M5 child-spec wording;
every remaining occurrence must be explicitly historical or corrected.

### Task 2: Schema-owned units and scientific expressions

**Files:**
- Test: `packages/schema/src/units.test.ts`
- Test: `packages/schema/src/scientific-expression.test.ts`
- Modify: `packages/schema/src/units.ts`
- Modify: `packages/schema/src/scientific.ts`
- Modify: `packages/schema/src/json-schema.ts`

**Interfaces:** Produce `litresToMillilitres(value: Litre): number` and
`ScientificExpressionSchema`/`ScientificExpression`, with a versioned source
state hash.

- [ ] **Step 1: Write failing conversion and expression tests**

```ts
expect(litresToMillilitres(litre(0.025))).toBe(25);
expect(() => ScientificExpressionSchema.parse({
  schemaVersion: 1, id: "x", label: "exact", expression: "E",
  omittedTerms: [], modelId: "m", modelVersion: "1.0.0", sourceStateHash: "h"
})).not.toThrow();
```

- [ ] **Step 2: Run the focused tests and observe RED**

Run `pnpm exec vitest run packages/schema/src/units.test.ts packages/schema/src/scientific-expression.test.ts`.
Expected: the new exports/test file are missing.

- [ ] **Step 3: Implement minimal schema contracts and artifact source**

Add the conversion in `units.ts`, add the versioned expression schema in
`scientific.ts`, and add it to `JSON_SCHEMA_SOURCES`.

- [ ] **Step 4: Run focused tests and schema generation**

Run `pnpm exec vitest run packages/schema/src/units.test.ts packages/schema/src/scientific-expression.test.ts` and `pnpm build`.
Expected: focused tests pass and the committed expression schema artifact is
current.

### Task 3: Volume profile inverse and totality

**Files:**
- Test: `packages/render/src/observable/level.test.ts`
- Modify: `packages/render/src/observable/level.ts`
- Modify: `packages/render/test/fixtures.ts`

**Interfaces:** `VolumeProfile` gains `volumeAtHeight` and
`roundTripTolerance`; `deriveLiquidLevel` checks both directions.

- [ ] **Step 1: Rewrite level tests for the inverse contract**

Add `volumeAtHeight`, a successful conical round-trip, a tolerance failure, and
a missing/invalid inverse case before changing production code.

- [ ] **Step 2: Run level tests and observe RED**

Run `pnpm exec vitest run packages/render/src/observable/level.test.ts`.
Expected: the old profile shape no longer satisfies the desired contract or the
new inverse assertion fails.

- [ ] **Step 3: Implement inverse validation**

Validate the profile tolerance, call `heightAtVolume`, then call
`volumeAtHeight(height)` and reject an absolute volume difference outside the
declared tolerance. Return the frozen level.

- [ ] **Step 4: Run level tests GREEN**

Run the focused level test; all cases must pass.

### Task 4: Burette semantics and mL precision

**Files:**
- Test: `packages/render/src/observable/burette.test.ts`
- Test: `packages/render/src/observable/format.test.ts`
- Test: `packages/render/src/observable/observable.test.ts`
- Modify: `packages/render/src/observable/burette.ts`
- Modify: `packages/render/src/observable/format.ts`
- Modify: `packages/render/src/observable/index.ts`
- Modify: `packages/render/src/state/scene.ts`

**Interfaces:** Produce `BuretteState` and `deriveBuretteState`; replace
`buretteReading` with `burette`; emit `currentScaleReading` and format it as
`mL` through `litresToMillilitres`.

- [ ] **Step 1: Write failing semantic tests**

```ts
const state = deriveBuretteState({
  initialScaleReading: litre(0), initialContainedVolume: litre(0.05),
  deliveredVolumes: [litre(0.025)]
});
expect(state.currentScaleReading).toBe(0.025);
expect(state.containedVolume).toBe(0.025);
expect(formatBuretteScaleReading(state.currentScaleReading)).toBe("25.00 mL");
```

- [ ] **Step 2: Run focused tests and observe RED**

Run `pnpm exec vitest run packages/render/src/observable/burette.test.ts packages/render/src/observable/format.test.ts packages/render/src/observable/observable.test.ts`.
Expected: the old subtractive API/units fail the new assertions.

- [ ] **Step 3: Implement the named state and formatter**

Use the schema conversion helper. Reject overdraw; never clamp negative
contained volume. Update composition and scene to use the formatter.

- [ ] **Step 4: Run focused tests GREEN**

Run the same focused command; all cases must pass.

### Task 5: Indicator-specific palettes

**Files:**
- Test: `packages/render/src/observable/color.test.ts`
- Test: `packages/render/src/observable/observable.test.ts`
- Modify: `packages/render/src/observable/tokens.ts`
- Modify: `packages/render/src/observable/color.ts`
- Modify: `packages/render/src/observable/index.ts`

**Interfaces:** `mapIndicatorRatioToColor(indicatorId, ratio)` resolves a
declarative `IndicatorPalette`; unknown identities fail; each palette has acid
and base endpoints and an empirical provenance note.

- [ ] **Step 1: Add failing methyl-orange and unknown-identity tests**

Assert that methyl-orange endpoints differ from phenolphthalein endpoints and
that an unknown indicator is rejected.

- [ ] **Step 2: Run color tests and observe RED**

Run `pnpm exec vitest run packages/render/src/observable/color.test.ts packages/render/src/observable/observable.test.ts`.
Expected: the old ratio-only function cannot select the second palette.

- [ ] **Step 3: Implement the declarative palette catalog**

Add named palettes and route interpolation through the selected palette. Keep
the mapping arithmetic limited to ratio normalization and channel interpolation.

- [ ] **Step 4: Run focused tests GREEN**

Run the same color/observable test command.

### Task 6: Frame identity, schema expressions, and one-convention scenes

**Files:**
- Test: `packages/render/src/observable/symbolic.test.ts`
- Test: `packages/render/src/observable/observable.test.ts`
- Test: `packages/render/src/state/scene.test.ts`
- Modify: `packages/render/src/observable/symbolic.ts`
- Modify: `packages/render/src/observable/curve.ts`
- Modify: `packages/render/src/observable/index.ts`
- Modify: `packages/render/src/state/scene.ts`
- Modify: `packages/render/src/index.ts`

**Interfaces:** `ObservableInput.frame` becomes the single state/projection
boundary; `ScientificExpression` is schema-owned; `toRenderState` accepts an
optional `HydrogenIonPresentationPolicy` defaulting to taught pH and emits one
hydrogen readout.

- [ ] **Step 1: Write failing frame, symbolic, and policy tests**

Use a source hash in the fixture, assert a mismatched symbolic line is rejected,
and assert default/scientific policies each produce exactly one pH node.

- [ ] **Step 2: Run focused tests and observe RED**

Run `pnpm exec vitest run packages/render/src/observable/symbolic.test.ts packages/render/src/observable/observable.test.ts packages/render/src/state/scene.test.ts`.
Expected: old input shape, local symbolic type, and two unconditional scene
nodes fail the new assertions.

- [ ] **Step 3: Implement the frame/policy boundary**

Change composition to consume the frame, validate source identity, reuse the
burette formatter, use schema expressions, and select one readout by policy.

- [ ] **Step 4: Run focused tests GREEN**

Run the same focused command.

### Task 7: Evidence and full verification

**Files:**
- Modify: `docs/evidence/M5.md`
- Modify: `docs/superpowers/plans/2026-09-13-m5-observable-state.md`
- Modify: `docs/plans/PLAN-0001-world-foundation-acid-base-titration.md`
- Modify: `docs/adr/0006-renderer-and-observable-architecture.md`

- [ ] **Step 1: Update evidence without overstating S3**

Record AC-V4 and AC-V6 as partial for missing inverse/DOM evidence, record the
new pure policy/palette/burette evidence, and keep AC-V5/V10/V11 open.

- [ ] **Step 2: Run the full verification set**

Run `pnpm test`, `pnpm typecheck`, `pnpm typecheck:tests`, `pnpm build`,
`pnpm depcruise`, `pnpm guards`, `pnpm lint`, `pnpm verify:guarantees`,
`pnpm verify:schema-artifacts`, `pnpm verify:scientific-math`,
`pnpm verify:scientific-quantities`, `pnpm verify:world`,
`pnpm verify:m4-contracts`, `pnpm test:browser`, `uv run pytest`, and
`uv run python tools/check_acceptance_coverage.py`.

- [ ] **Step 3: Inspect, commit, and push**

Run `git diff --check`, inspect the staged diff, commit the remediation round,
and push `main` to its configured upstream. The handoff must state M5 S2 and
list all remaining S3 evidence.

## Stop/Go

Stop if a render module imports a forbidden core, if a test requires a browser,
if any transform computes chemistry, or if a canonical acceptance criterion is
quietly weakened. Go to M6 only after a separate visual/asset specification and
owner acceptance of M5's remaining S3 evidence.
