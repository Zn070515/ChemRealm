# M5 Observable State Implementation Plan

> **Superseded for current contract work.** The initial implementation recorded
> here is historical. Its burette, level, symbolic-expression, and pH-scene
> steps were remediated by
> `docs/superpowers/plans/2026-09-13-m5-contract-remediation.md`, which is the
> current execution plan and is subordinate to `SPEC-0001` revision 21.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the pure M5 Observable layer and remove the unused
`ScientificProjectionInput.waterMass` contract without introducing a renderer,
browser dependency, or new chemistry logic.

**Architecture:** Add `@chemrealm/render` as a schema-only core package. Its
observable modules accept ScientificState, already-computed projection values,
declared geometry profiles, and supplied symbolic lines, then return frozen
presentation data. The composition root remains the only place that combines
World Runtime and Scientific Core; M5 does not change either.

**Tech Stack:** TypeScript 5.9, Vitest, pnpm workspaces, dependency-cruiser,
`@chemrealm/schema` branded quantities.

**Spec:** `docs/superpowers/specs/2026-09-13-m5-observable-state.md`

## Global Constraints

- `@chemrealm/render` may import only `@chemrealm/schema` from the workspace.
- Observable code is pure TypeScript with no DOM, React, PixiJS, network, or clock.
- Observable receives `protonationRatio`; it never receives or computes `Ka`, activity, or activity coefficient.
- pH curve values are supplied by ScientificProjection/state frames; Observable performs no equilibrium calculation.
- No persisted/event/schema version changes are made by M5.
- M5 remains S2 until browser inspection evidence and visual evidence are complete.

### Task 1: Remove the unused projection input field

**Files:**
- Modify: `packages/sci/src/projection.test.ts`
- Modify: `packages/sci/src/projection.ts`

**Interfaces:**
- Consumes: `ScientificState`, an authoritative `sourceStateHash`, and
  `liquidVolume`.
- Produces: `ScientificProjectionInput = { sourceStateHash, liquidVolume }`;
  the preferred composition boundary is `projectScientificFrame(...)`.

- [x] **Step 1: Write the failing test**

Remove `waterMass` from every projection test input and remove the old
`zero water mass` case. Keep the invalid-volume and hydrogen-state cases. The
first existing test must call:

```ts
projectScientificState(scientificState, {
  sourceStateHash: "state-hash",
  liquidVolume: litre(0.5),
});
```

- [x] **Step 2: Run the test to verify it fails**

Run:

```text
pnpm exec vitest run packages/sci/src/projection.test.ts
```

Expected: the current implementation throws because it still requires
`input.waterMass`.

- [x] **Step 3: Write the minimal implementation**

Remove the `Kilogram` import, `waterMass` property, validation, and `void
waterMass` from `projection.ts`. Keep all hydrogen amount, volume, molarity,
and deterministic-log behavior unchanged.

- [x] **Step 4: Run the test to verify it passes**

Run the same Vitest command and:

```text
pnpm typecheck
pnpm typecheck:tests
```

Expected: projection tests and both TypeScript checks pass.

### Task 2: Add the render package and its contract tests

**Files:**
- Create: `packages/render/package.json`
- Create: `packages/render/tsconfig.json`
- Create: `packages/render/tsconfig.tests.json`
- Modify: `tsconfig.json`
- Modify: `package.json`
- Create: `packages/render/src/observable/color.test.ts`
- Create: `packages/render/src/observable/level.test.ts`
- Create: `packages/render/src/observable/burette.test.ts`
- Create: `packages/render/src/observable/curve.test.ts`
- Create: `packages/render/src/observable/format.test.ts`
- Create: `packages/render/src/observable/species.test.ts`
- Create: `packages/render/src/observable/symbolic.test.ts`
- Create: `packages/render/src/observable/observable.test.ts`
- Create: `packages/render/src/state/scene.test.ts`

**Interfaces:**
- Consumes: schema quantities and `ScientificState`.
- Produces: failing executable tests for all pure M5 transforms.

- [x] **Step 1: Write failing tests**

Define the wished-for signatures in tests:

```ts
mapIndicatorRatioToColor(indicatorId: string, ratio: number): IndicatorColor
deriveLiquidLevel(volume: Litre, profile: VolumeProfile): LiquidLevel
deriveBuretteState(input: BuretteInput): BuretteState
buildCurve(frames: readonly CurveFrame[]): readonly CurvePoint[]
formatTaughtPh(value: TeachingHydrogenIonExponent): string
formatModelPh(value: Ph, activityModel: string): string
speciesRows(state: ScientificState): readonly SpeciesRow[]
presentSymbolicLines(lines: readonly ScientificExpression[], identity: ScientificExpressionIdentity): readonly PresentedScientificExpression[]
buildObservableModel(input: ObservableInput): ObservableModel
toRenderState(model: ObservableModel): RenderState
```

Tests must include the non-cylindrical profile, full burette draw, overdraw,
ratio continuity, model-pH label, curve order, frozen output, and no-input
mutation assertions described in the spec.

- [x] **Step 2: Run tests to verify they fail**

Run:

```text
pnpm exec vitest run packages/render/src
```

Expected: collection fails because the new package source modules do not yet
exist. This is the required red state before production implementation.

### Task 3: Implement scalar observable transforms

**Files:**
- Create: `packages/render/src/observable/tokens.ts`
- Create: `packages/render/src/observable/color.ts`
- Create: `packages/render/src/observable/level.ts`
- Create: `packages/render/src/observable/burette.ts`
- Create: `packages/render/src/observable/curve.ts`
- Create: `packages/render/src/observable/format.ts`
- Create: `packages/render/src/observable/species.ts`
- Create: `packages/render/src/observable/symbolic.ts`

**Interfaces:**
- Consumes: the exact test signatures from Task 2 and schema-owned types.
- Produces: frozen pure outputs with finite/physical input validation.

- [x] **Step 1: Implement the minimum code for the colour tests**

Use named endpoint tokens in `tokens.ts`. Compute only
`ratio / (1 + ratio)` after validating a finite non-negative ratio, then
interpolate token channels. Do not import any scientific constant or use a
chemical-name branch.

- [x] **Step 2: Run the colour tests**

Run:

```text
pnpm exec vitest run packages/render/src/observable/color.test.ts
```

Expected: all colour tests pass.

- [x] **Step 3: Implement level, burette, curve, format, species, and symbolic transforms**

Use `profile.heightAtVolume(volume)` for level, sum committed delivery volumes
for burette reading, copy curve frame values in input order, format taught pH
to two decimals and model pH with its activity-model label, re-present species
fields without calculation, and clone supplied symbolic lines. Freeze returned
objects/arrays and reject invalid inputs with `RangeError`.

- [x] **Step 4: Run the scalar transform tests**

Run:

```text
pnpm exec vitest run packages/render/src/observable/{level,burette,curve,format,species,symbolic}.test.ts
```

Expected: all scalar transform tests pass.

### Task 4: Compose ObservableModel and RenderState

**Files:**
- Create: `packages/render/src/observable/index.ts`
- Create: `packages/render/src/state/scene.ts`
- Create: `packages/render/src/index.ts`

**Interfaces:**
- Consumes: scalar transforms from Task 3.
- Produces: `buildObservableModel(input): ObservableModel` and
  `toRenderState(model): RenderState`.

- [x] **Step 1: Implement composition tests first**

The tests from Task 2 must assert that repeated calls with the same input are
deep-equal, returned model/arrays are frozen, the source ScientificState and
input arrays are unchanged, and the scene contains generic node kinds only.

- [x] **Step 2: Implement composition**

Compose indicator colours, one current liquid level, optional burette/curve/
symbolic data, species rows, and explicit readouts. `toRenderState` should
produce generic `group`, `shape`, and `text` nodes; it must not inspect chemical
identifiers or import a chemistry package.

- [x] **Step 3: Run the composition tests**

Run:

```text
pnpm exec vitest run packages/render/src/observable/observable.test.ts packages/render/src/state/scene.test.ts
```

Expected: all composition tests pass.

### Task 5: Wire package checks and document S2 handoff

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `packages/render/tsconfig.tests.json` if Task 2 did not finish it
- Modify: `docs/plans/PLAN-0001-world-foundation-acid-base-titration.md`
- Create: `docs/evidence/M5.md`
- Modify: `docs/adr/0006-renderer-and-observable-architecture.md`
- Modify: historical M4 companion evidence docs

**Interfaces:**
- Consumes: the package and tests from Tasks 1–4.
- Produces: reproducible M5 S2 evidence and a clean status source.

- [x] **Step 1: Add render to project/test verification**

Add the package project reference and `typecheck:tests` target. Keep the
dependency-cruiser boundary derived from `tools/core-boundaries.cjs`; do not
add a render exception.

- [x] **Step 2: Run all relevant checks**

Run:

```text
pnpm typecheck
pnpm typecheck:tests
pnpm test
pnpm build
pnpm depcruise
pnpm guards
pnpm lint
pnpm verify:guarantees
pnpm verify:schema-artifacts
pnpm test:browser
uv run pytest
git diff --check
```

Expected: every command exits 0. Browser and final-quality visual criteria
remain explicitly unverified because M6 owns real renderer/assets.

- [x] **Step 3: Update status and commit**

Record M5 as `S2 — implementation in progress/locally verified`, list exact
commands and remaining AC-V10/V11/M6 visual evidence, inspect the diff, then
commit and push the completed round. The implementation baseline is
`06190818d971c87e0ac84c5d480f660ed62aa90f`; hosted CI attestation remains a
post-push evidence update. Do not claim M5 S3.

## Stop/Go

Stop if render imports a forbidden core, any observable test needs a browser,
or a scientific calculation appears in render. Go to M6 only after owner review
of the M5 S2 handoff and a separate M6 asset/renderer specification.
