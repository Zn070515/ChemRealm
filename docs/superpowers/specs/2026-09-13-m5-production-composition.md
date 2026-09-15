# M5 Production Composition Specification

**Status:** M5 S3 composition contract verified locally and by hosted CI;
owner acceptance recorded 2026-09-15. M6 visual realization remains a separate
downstream stage.

**Authority:** This document is subordinate to `SPEC-0001` and the M5
observable-state specification. It references canonical `AC-*` criteria; it
does not redefine or weaken them.

**Canonical revision:** the M5 contract revision declared by
`contracts/version-manifest.json` (revision 25); the native-backend amendment
is a separate current candidate revision.

M5 S3 evaluates the observable and composition contracts that this document
defines. It does not wait for M6 final assets or visual review. The
refusal-first optical boundary is specified separately by
`2026-09-14-indicator-optical-observation.md`; M6 consumes its tagged output
and provides concrete visual realization evidence.

## Context

The scientific, world, frame, profile, symbolic, curve, and ObservableModel
contracts exist independently, but the web application still rendered only an
M0 placeholder. Local package tests therefore did not prove that a committed
world could reach a user-visible representation through the intended boundary.

## Goal

Provide one deterministic composition path that:

1. creates and replays an authored world through the real World Runtime;
2. resolves and invokes the exact persisted Scientific Core adapter;
3. creates source-bound frames, expressions, curve points, and burette data;
4. builds ObservableModel and renderer-neutral RenderState; and
5. presents those outputs, including optical status and diagnostics, in a
   local DOM inspection surface suitable for reproducible Playwright evidence.

## Non-goals

- PixiJS, final apparatus art, screenshots, pointer/port/snap interaction, or
  animation clocks (M6);
- persistence, network, accounts, telemetry, or ACE/learner inference;
- a second chemistry engine, pre-authored pH/curve values, or render-side
  scientific calculation;
- M6 authorization or an automatic M5 S3 claim.

## User experience

The built local page shows a committed-world inspection surface with world
identity, committed sequence, replay hash, one selected hydrogen-ion readout,
liquid level, burette scale reading in mL, indicator identity/optical status, species,
Scientific Core expression, and source-identified curve points. A local policy
control switches between the existing taught and scientific-model conventions;
each view emits exactly one hydrogen-ion readout.

## Architecture

```text
apps/web composition root
  → @chemrealm/world event creation/replay
  → @chemrealm/sci exact adapter + frame/expression producer
  → @chemrealm/render ObservableModel + RenderState
  → apps/web DOM adapter
```

World Runtime remains synchronous and chemistry-agnostic. Scientific Core owns
solving and scientific expressions. Render owns pure observable/scene
transforms and has no Sci/World/DOM dependency. React only maps RenderState and
ObservableModel output to accessible DOM; it does not inspect constants or
choose chemistry.

## Scientific design

The fixture uses the existing v0 acid-base Davies adapter at 25 °C. Solute
mode and the HOAc constant are selected by the model-owned Scientific Core
request builder and fixed model identity. Indicator constants are copied from
the resolved genesis snapshot. The Representation Engine consumes only the
frame-owned optical path/profile and Scientific Core chemical observation. A
missing chemical form or quantitative profile is surfaced as a tagged optical
refusal with no endpoint-colour fallback. A non-OK solver result is surfaced as
a composition error; no fallback number is substituted. The optional accuracy
probe changes only the authored concentration fixture and remains inside the
solver domain while deliberately outside the proposed accuracy envelope.

## World/event design

The fixture is authored as a normal `Scenario`, resolved by
`createWorldFromScenario`, and extended only with validated
`DeliverTitrant` commands. The returned event log is parsed/replayed before
science is solved. Burette delivery volumes come from committed
`TransferCommitted` events; its source hash and sequence must match the final
ScientificFrame. No new persisted schema or event type is introduced.

## Representation design

The composition creates one frame for the initial target prefix and one frame
per relevant committed source→target titrant transfer. The curve x-axis is
cumulative `deliveredTitrantVolume` starting at zero; it is not the target
flask's final liquid volume. Acid-base request construction and expressions are
produced by Scientific Core (`buildAcidBaseSolveRequest` and
`createScientificExpressions`), and `buildObservableModel` is the only render
observable composition entry. The DOM adapter consumes generic RenderState and
  approved observable outputs, including optical status/context. It is an
  inspection/evidence surface, not the M6 visual renderer.

## Learning design

No ACE or learner-state behavior changes. The policy switch exposes a scientific
convention but does not infer learner understanding or alter the world.

## Privacy/compliance

All data is deterministic and local. The page adds no storage, identity,
telemetry, cloud request, or third-party resource. Existing artifact and
browser network gates remain applicable.

## API/schema changes

`apps/web` adds the composition-root function
`composeProductionTitration(options?): Promise<ProductionTitrationComposition>`.
The web root supplies canonical world contents and frozen indicator inputs to
the Sci-owned acid-base request builder; it does not own component modes or
equilibrium constants.
The schema-owned ScientificExpression wire contract is version 3 and requires
an equation id, formula, and current substitutions in addition to producer and
source identity.
`@chemrealm/render`'s `BuretteInput` and `BuretteState` carry the committed
`sourceStateHash` and `sequence` so the Observable boundary can reject a
delivery prefix from another frame. No persisted World/Event schema changes.
`ObservableIndicator` carries a tagged `IndicatorOpticalObservation` and
diagnostic context; it does not expose a ratio-to-colour palette API.

## Failure modes

- incompatible scenario resolution produces no genesis event;
- missing exact solver identity fails composition rather than falling back;
- any non-OK solve fails the local composition surface;
- a frame/profile, symbolic, curve, or burette identity mismatch throws at its
  owning boundary;
- a failed composition renders an alert and no scientific fallback;
- browser assertions fail if the built page does not expose the committed path
  or emits more than one hydrogen-ion readout.

## Test plan

- `apps/web/src/composition.test.ts` verifies Scenario → event log → replay →
  exact adapter → frames → expressions/curve/burette → ObservableModel →
  RenderState, including deterministic frozen output;
- Render tests verify burette source identity and sequence binding;
- `tests/browser/m5-composition.spec.ts` loads the built artifact, checks
  committed identity and observable outputs, and switches pH policy while
  asserting a single readout;
- existing `test:browser` network inspection, dependency guards, and all M4
  regressions remain required.

## Acceptance criteria

| Criterion | Binary requirement | Evidence |
|---|---|---|
| Production composition | A real committed/replayed world reaches ObservableModel and RenderState without hand-built scientific state | `apps/web/src/composition.test.ts` |
| Shared identity | final frame, projection, symbolic output, curve/burette inputs, and ObservableModel share the committed source identity; burette also matches sequence | composition and render tests |
| AC-V6 | built page displays pH at two decimals and the burette scale in mL | Playwright DOM assertion |
| AC-V8 | switching policy changes the one selected convention and never emits two pH readouts | Playwright DOM assertion |
| M5-FRAME / M5-SYMBOLIC / M5-CURVE | production composition uses the Scientific Core frame/expression producer, committed frame sequence, and cumulative titrant-delivery x-axis | composition tests + browser markers |
| M5-OPTICAL-REFUSAL | missing chemical-form/profile data produces a tagged no-tint observation and the DOM exposes its context/diagnostic | render tests + Playwright DOM assertion |
| Privacy | no third-party request is introduced | existing network-boundary browser test |
| M6 boundary | no Pixi/final-art/gesture/animation/persistence change is required | diff and dependency review |

## Rollout/migration

No persisted format changes. The deterministic fixture is a local composition
entry point and can later be replaced by catalog-driven content without
changing the core boundaries.

## Open questions

M5 owner acceptance still determines the final status of the DOM and
representation-contract evidence. Visual quality, apparatus interaction
semantics, concrete final assets, screenshots, and final visual review remain
M6 decisions and are downstream of M5 S3 rather than prerequisites for it.
