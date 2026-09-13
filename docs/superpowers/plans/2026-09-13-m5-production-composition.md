# M5 Production Composition Vertical Path

> **Status:** implementation plan; M5 remains S2 until the browser evidence is
> complete. This plan is subordinate to `SPEC-0001` and the current M5
> observable-state specification; it does not redefine an `AC-*` criterion.

## Problem and scope

The repository has independently verified World Runtime, Scientific Reality,
ScientificFrame, expression, curve, profile, ObservableModel, and RenderState
contracts, but `apps/web` still renders only the M0 placeholder. The missing
evidence is the real production path:

```text
authored scenario
  → WorldCreated + committed event log
  → replayed WorldState
  → exact solver selected by persisted solver identity
  → ScientificState
  → ScientificFrame
  → Scientific expressions / curve / burette observables
  → ObservableModel
  → RenderState
  → deterministic DOM composition
```

This round owns the composition root and a deterministic inspection surface. It
does not introduce PixiJS, final apparatus art, pointer/port interaction,
animation clocks, persistence, ACE, or M6 asset production.

## Required pre-coding answers

1. **Problem:** prove that a committed world can reach a user-visible,
   renderer-neutral observable surface through one production path.
2. **GOAL scope:** this directly serves the one-world/multiple-projections,
   visible scientific state, event-sourced replay, and no-scientific-truth-in-
   renderer principles in `GOAL.md` §§5.1–5.4 and §11.
3. **Owning cores:** `apps/web` is the composition root; Sci owns solving and
   scientific expressions; World owns events/replay; Render owns pure observable
   and scene transforms; Schema remains the contract authority.
4. **Existing contracts:** `createWorldFromScenario`, `stateHash`,
   `createAcidBaseAdapter`, `buildIndicatorInputsFromSnapshot`,
   `projectScientificFrame`, `createScientificExpressions`,
   `buildObservableModel`, and `toRenderState` already exist and must be used.
5. **Scientific assumptions:** v0 monoprotic Davies acid-base model at 25 °C;
   model identity and indicator constants come from the frozen genesis snapshot;
   no chemistry is added to the app or renderer.
6. **Persistence:** no new persisted schema. The vertical fixture is authored
   through the existing Scenario → WorldCreated path and replayed from its
   committed event log.
7. **User-visible behavior:** the built web artifact shows one committed world,
   one selected hydrogen-ion convention, an mL burette reading, liquid level,
   indicator swatch, species/inspection evidence, symbolic evidence, and a
   sequence-derived pH curve. A local policy control switches the single pH
   convention.
8. **Privacy/compliance:** no network, account, telemetry, or storage behavior;
   the browser test continues to enforce the no-third-party-origin boundary.
9. **Evidence:** focused composition tests plus Playwright DOM assertions must
   prove the source world/sequence/hash, real adapter execution, frame-bound
   volume/profile, one pH readout, and source-identified curve/symbolic/burette
   data.
10. **Out of scope:** final visual baseline/AC-V5, PixiJS, M6 interaction
    geometry, and learner/ACE behavior.

## Implementation steps

### Step 1 — Lock the production composition contract with failing tests

**Files:** create `apps/web/src/composition.ts` and
`apps/web/src/composition.test.ts`; modify `packages/render/src/observable/burette.ts`,
`packages/render/src/observable/index.ts`, and their tests if the identity
fields are not yet present.

**Interfaces:**

```ts
interface ProductionTitrationComposition {
  readonly worldId: string;
  readonly eventLog: EventLog;
  readonly state: WorldState;
  readonly frame: ScientificFrame;
  readonly observable: ObservableModel;
  readonly renderState: RenderState;
}

async function composeProductionTitration(): Promise<ProductionTitrationComposition>;
```

Write RED tests that require:

- the result comes from a parsed/replayed committed event log, not a hand-built
  `WorldState`;
- the persisted solver identity is looked up exactly before solving;
- the final frame hash/sequence/volume/profile hash match the replayed state;
- the scientific expression, every curve point, and burette input belong to the
  same world/frame identity;
- the final ObservableModel and RenderState are frozen and deterministic.

If the Render burette input is expanded with `sourceStateHash` and `sequence`,
those are required at the Observable boundary and validated against the frame.

**Stop/go:** the focused tests must fail for the absence of the production
composition and for an unbound burette; no implementation is written before
the RED result is observed.

### Step 2 — Implement the composition root over the real event/runtime path

**Files:** `apps/web/src/composition.ts`; create
`apps/web/src/production-scenario.ts`; modify `apps/web/package.json` and
`apps/web/tsconfig.json` project references.

Create one deterministic v0 demonstration scenario with sourced/provenance-
shaped authoring inputs, a target vessel, a burette source vessel, a frozen
piecewise-linear profile, and one frozen indicator. Use
`createWorldFromScenario(new SolverRegistry([createAcidBaseAdapter()]), ...)`.

Then:

1. replay the returned event log with the World Runtime;
2. derive a `SolveRequest` from the replayed target contents and the frozen
   snapshot indicator data, using the model-owned component catalog to select
   solute modes and the frozen HOAc constant where applicable;
3. resolve the adapter by `state.solverConfig.id/version`, never by a mutable
   catalog fallback;
4. solve each committed target prefix (initial plus committed transfers);
5. create each `ScientificFrame` from that prefix's `stateHash`, sequence,
   target `liquidVolume`, and persisted target profile hash;
6. create symbolic expressions from the final frame and curve points from the
   ordered frame sequence;
7. derive burette deliveries from the committed `TransferCommitted` events and
   bind them to the final frame identity;
8. build ObservableModel from only the frame/profile snapshot and those
   source-bound outputs, then convert it to RenderState.

No test-only helper, pre-authored pH number, or render-side chemistry is allowed
on this path. A non-OK solver result is a surfaced composition failure, not a
fallback value.

**Stop/go:** focused composition tests pass; changing a committed transfer must
change the frame hash/sequence, curve source, burette state, and displayed
readout through the same path.

### Step 3 — Replace the M0 placeholder with a deterministic DOM adapter

**Files:** `apps/web/src/App.tsx`, `apps/web/src/main.tsx`,
`apps/web/src/App.test.ts`, create `tests/browser/m5-composition.spec.ts`.

The React layer may select a presentation policy and map generic RenderState
nodes to semantic DOM. It must not inspect `Ka`, species balances, solver
parameters, or choose chemistry. It will expose stable accessible labels and
test IDs for:

- world ID and committed sequence/hash;
- exactly one selected hydrogen-ion readout;
- liquid-level height and burette scale reading in mL;
- indicator identity/swatch;
- species rows and Scientific Core expression;
- curve point count and source sequence/hash;
- accuracy qualification when present.

The page starts with a deterministic loading/error state and renders the
composition once the single local promise resolves. A button switches only
between the existing taught and scientific-model policies; each view continues
to expose exactly one hydrogen-ion readout.

**Stop/go:** Playwright loads the built artifact, sees the real composition
heading and committed world markers, verifies DOM values against the composition
contract, switches policy, and confirms no second pH readout appears. The
existing network-boundary test remains green.

### Step 4 — Record evidence without claiming M6 or prematurely claiming M5 S3

**Files:** `docs/superpowers/specs/2026-09-13-m5-production-composition.md`,
`docs/evidence/M5.md`, the canonical PLAN, and any focused M5 guard.

Add a subordinate implementation note that references the current canonical
SPEC revision and explicitly says it is composition/DOM evidence, not a rewrite
of AC-V3/V4/V6/V8. Update the M5 matrix only with evidence actually produced:

- M5-FRAME, M5-SYMBOLIC, M5-CURVE: production composition evidence can move
  from PARTIAL only if the tests prove producer identity and shared sequence;
- AC-V6, AC-V8, AC-V10, AC-V11: move only when the browser assertions cover
  their complete wording;
- AC-V5 and M6 visual evidence remain open.

Do not accept SPEC rev24 or authorize M6 in this round merely because the
deterministic DOM exists.

### Step 5 — Verify, inspect, commit, and hand off

Run focused RED/GREEN tests during implementation, then the repository chain:

```text
pnpm typecheck
pnpm typecheck:tests
pnpm test
pnpm build
pnpm depcruise
pnpm guards
pnpm verify:scientific-math
pnpm verify:scientific-quantities
pnpm verify:m4-contracts
pnpm verify:m5-contracts
pnpm verify:world
pnpm verify:guarantees
pnpm verify:schema-artifacts
pnpm lint
pnpm test:browser
uv run pytest
uv run python tools/check_acceptance_coverage.py
pnpm artifacts
git diff --check
```

Inspect the diff and generated artifacts. Commit and push only after all local
checks pass. The handoff must record the exact implementation commit and hosted
CI attestation, state M4 S3 remains accepted, state M5's exact S2/S3 matrix,
and keep M6 unauthorized until visual/asset/interaction gates are separately
met.

## Acceptance matrix for this round

| Criterion | Binary evidence required |
|---|---|
| Production world path | `composition.test.ts` proves Scenario → WorldCreated → event log → replayed WorldState |
| Exact solver identity | composition resolves adapter by persisted `id/version`; no fallback |
| Bound frame | frame hash/sequence/volume/profile hash match the replayed target state |
| Scientific producer chain | expressions and curve frames are created from the bound frame/state sequence |
| Burette identity | committed transfer prefix and frame hash/sequence are checked at Observable boundary |
| Observable composition | `buildObservableModel` and `toRenderState` are the only representation path |
| DOM pH policy | Playwright sees exactly one taught or model readout per selected policy |
| DOM provenance | world ID, sequence/hash, model label, expression, and curve source markers are visible |
| Privacy | existing network inspection sees no third-party request |
| M6 boundary | no Pixi/final art/pointer/animation/persistence changes; M6 remains unauthorized |

## Known limitations after this round

- The DOM is a deterministic inspection/composition surface, not the final
  visual apparatus baseline.
- M6 still owns PixiJS, asset semantic contracts beyond the frozen profile,
  pointer/snap/port interaction, animation, screenshots, and performance.
- M5 S3 can be considered only after the owner reviews the complete evidence
  matrix and current SPEC candidate amendments; this plan does not perform that
  acceptance.
