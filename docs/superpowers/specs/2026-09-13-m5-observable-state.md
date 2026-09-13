# M5 Observable State Specification

**Status:** S1 specified; owner-approved design direction, 2026-09-13

**Goal:** Turn approved scientific outputs into a pure, renderer-agnostic
observable model without moving chemistry, world mutation, or presentation
clock semantics into the wrong core.

## Context

M0–M4 established the schema, event-sourced World Runtime, Scientific Reality
Core, and the scientific projection boundary. M5 is the first downstream
product layer. It must make the existing scientific state usable by later
visual and inspection surfaces while remaining runnable in Node and independent
of browser APIs.

The project also uses NOBOOK as an interaction benchmark, not as a scientific
or asset source. The M5 layer therefore prepares semantic presentation data;
it does not imitate proprietary scenes or introduce apparatus behavior before
the M6 asset contract.

## Goal

M5 will provide a pure `@chemrealm/render` package that:

1. maps a ScientificState and already-computed projection values to immutable
   observable data;
2. maps an indicator's scientific `protonationRatio` to a continuous empirical
   colour value without recomputing equilibrium;
3. derives liquid level only by calling a declared vessel volume profile;
4. derives burette reading from initial volume and committed deliveries;
5. re-presents species, pH conventions, accuracy qualification, and supplied
   symbolic expressions without inventing chemistry;
6. builds pH–volume points from a supplied sequence of states/projections; and
7. exposes a renderer-neutral scene description with no PixiJS, DOM, or
   scientific-package dependency.

## Non-goals

- PixiJS, SVG, DOM components, screenshots, or final apparatus art.
- Pointer gestures, snap/port interaction, animation clocks, or persistence.
- Solving equilibrium, calculating indicator ratios, choosing reactions, or
  importing `@chemrealm/sci`.
- Constructing symbolic chemistry expressions from constants. Scientific Core
  supplies any expressions; Observable only presents them.
- ACE interventions, learner inference, or teaching policy decisions.

## User experience

M5 has no shipped screen. It defines the data that later screens may render:

- a learner receives a continuous indicator transition rather than a hidden
  threshold jump;
- liquid level follows the apparatus-declared `h(V)` profile;
- a burette readout reflects the committed delivery history;
- the default taught hydrogen-ion exponent may be labelled `pH`, while model pH
  always carries its activity-model label;
- a result outside the proposed accuracy envelope carries a visible-ready
  qualification flag; and
- species and supplied scientific expressions can be inspected without the
  observable layer making a chemistry decision.

## Architecture

The package boundary is:

```text
schema-owned ScientificState + projection DTO
                         ↓
                 @chemrealm/render
       observable transforms + RenderState data
                         ↓
              future Pixi/DOM renderer
```

`@chemrealm/render` may import `@chemrealm/schema` types and constructors. It
must not import `@chemrealm/sci`, `@chemrealm/world`, `@chemrealm/ace`, React,
DOM APIs, or PixiJS. The composition root remains responsible for invoking
`ScientificProjection` and passing its result into this package.

The pH–volume curve belongs to Observable. It consumes an ordered sequence of
already-computed state/projection frames and performs no new chemistry. The
animation clock remains a renderer decision for M6 and is not represented in
M5 data or hashes.

## Scientific design

Observable may re-present a scientific value, format it, map it to a display
geometry, or map the supplied indicator ratio to empirical colour. It may not
read `Ka`, activity, activity coefficient, reaction direction, or model
parameters to derive a new value.

The colour mapping is an explicit continuous interpolation between named
empirical endpoint tokens. The input is the Scientific Core's non-negative
`protonationRatio`; the observable layer converts it to a bounded interpolation
fraction only. The mapping is empirical and not a chemistry result.

`ScientificState.modelPh` remains activity-based and model-dependent.
`TeachingHydrogenIonExponent` comes from the ScientificProjection. The
observable layer never derives one from the other.

## World/event design

M5 adds no events and mutates no WorldState. Burette deliveries and vessel
volumes are supplied as committed data by the composition layer. Pointer noise,
animation time, and hover state are not accepted as world truth.

## Representation design

The package owns these pure transformations:

| Module | Responsibility |
|---|---|
| `observable/color.ts` | ratio → continuous empirical colour |
| `observable/level.ts` | volume → declared profile height |
| `observable/burette.ts` | initial volume − committed delivery sum |
| `observable/curve.ts` | ordered state/projection frames → curve points |
| `observable/species.ts` | ScientificState species → inspection rows |
| `observable/symbolic.ts` | supplied scientific expressions → display lines |
| `observable/format.ts` | labels and display precision only |
| `observable/tokens.ts` | named empirical presentation tokens |
| `observable/index.ts` | compose an immutable ObservableModel |
| `state/scene.ts` | ObservableModel → renderer-neutral RenderState |

`RenderState` contains generic nodes, text, colour, and geometry data. It does
not contain chemistry algorithms or an animation clock.

## Learning design

No ACE behavior changes. M5 keeps scientific labels and qualifications available
for a future inspection policy; it does not decide when to hint or infer what a
learner understands.

## Privacy/compliance

No network, account, identity, telemetry, or persistence behavior is added.
All functions are local and deterministic for their inputs.

## API/schema changes

The new package exports:

```ts
export const OBSERVABLE_MODEL_VERSION = 1;

export interface ScientificProjectionReadout {
  readonly taughtHydrogenIonExponent: TeachingHydrogenIonExponent;
}

export interface ObservableInput {
  readonly scientificState: ScientificState;
  readonly projection: ScientificProjectionReadout;
  readonly liquidVolume: Litre;
  readonly volumeProfile: VolumeProfile;
  readonly burette?: BuretteInput;
  readonly curveFrames?: readonly CurveFrame[];
  readonly symbolicLines?: readonly SymbolicLine[];
}

export function buildObservableModel(input: ObservableInput): ObservableModel;
```

The package may expose narrower pure functions for tests and composition. All
returned arrays/objects are frozen at the package boundary. Input arrays are
never mutated.

## Failure modes

- negative, non-finite, or over-capacity volumes are rejected;
- a volume profile that returns a non-finite height is rejected;
- a negative/non-finite indicator ratio is rejected;
- a delivery sequence that overdraws a burette is rejected;
- duplicate or empty scientific species identifiers are rejected when creating
  inspection rows;
- a curve with no frames returns an empty curve, while a frame with a missing
  required value is rejected by the TypeScript/runtime boundary;
- symbolic lines are treated as supplied text and are not silently rewritten;
  empty identifiers or expressions are rejected; and
- Observable never substitutes a fallback chemistry value after a scientific
  failure. The caller must decide how to present a failed result.

## Test plan

- projection input regression proves `waterMass` is not part of the molarity
  projection contract;
- colour tests check endpoints, boundedness, continuity, no threshold branch,
  and immutability;
- level tests use a non-cylindrical hand-computed profile and reject invalid
  volume/profile outputs;
- burette tests check the exact `initial − Σ delivered` invariant, full draw,
  and overdraw rejection;
- curve tests check ordered frame identity and no chemistry recomputation;
- species/symbolic/format tests check re-presentation and labels;
- composition tests check deterministic deep equality, frozen output, and no
  input mutation;
- scene tests check generic renderer data only; and
- package/dependency checks prove render imports schema only and has no Pixi or
  DOM dependency.

## Acceptance criteria

| Criterion | Binary requirement | Evidence |
|---|---|---|
| AC-V2 | Colour output is continuous and has no threshold branch | `packages/render/src/observable/color.test.ts` |
| AC-V3 | No chemical colour decision/literal is embedded in render transforms | token/module review and render guard |
| AC-V4 | Liquid height is obtained from the declared `h(V)` profile | `level.test.ts` |
| AC-V6 | pH and burette readouts obey their display precision | `format.test.ts` |
| AC-V8 | Taught and model quantities have distinct, explicit labels | `format.test.ts` and later M5 DOM evidence |
| AC-V9 | Render receives only `protonationRatio`; no equilibrium expression or `Ka` appears in render | dependency/type/source checks |
| M5-PURE | Same input produces the same frozen model without DOM/Pixi or mutation | `observable.test.ts` |
| M5-CURVE | Curve points preserve the supplied state sequence and values | `curve.test.ts` |

AC-V10 and AC-V11 require inspection DOM copy and therefore remain M5 S3
criteria after the inspection surface exists. This S2 implementation exposes
the exact model-pH provenance and accuracy flag needed by that later surface;
it does not claim their browser evidence yet.

## Rollout/migration

No persisted schema changes. The package is additive and can be released behind
the existing composition root. Future RenderState changes require an explicit
`ObservableModelVersion` bump and a migration or rejection policy before any
rendered state is persisted.

## Open questions

None for the M5 S1 scope. Animation clock ownership remains intentionally
deferred to M6.
