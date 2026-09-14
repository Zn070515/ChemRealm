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
3. derives liquid level only by calling a declared vessel volume profile and
   checking its inverse;
4. derives separate burette scale-reading, delivered-volume, and
   contained-volume values from committed deliveries;
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

- a learner receives a continuous, indicator-specific transition rather than a hidden
  threshold jump;
- liquid level follows the apparatus-declared `h(V)` profile whose `V(h)` inverse
  passes its stated tolerance;
- a burette readout is a graduated scale reading in `mL`, separate from the
  amount remaining in the burette;
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

The replayable physical inputs are established before Observable is called:
the World Runtime persists a serializable `VolumeProfileSnapshot` in each
genesis vessel, and the Scientific Core frame carries the committed
`liquidVolume` plus that profile's hash. Observable receives only the
serializable `VolumeProfileSnapshot`, recomputes and verifies its content hash,
then verifies that hash against the frame before reconstructing the executable
interpolation adapter internally. It must not
receive caller-supplied profile functions, a second liquid-volume value, or
resolve `geometryRef` from mutable content.

## Scientific design

Observable may re-present a scientific value, format it, map it to a display
geometry, or map the supplied indicator ratio to empirical colour. It may not
read `Ka`, activity, activity coefficient, reaction direction, or model
parameters to derive a new value. Scientific expressions are accepted only as
schema-owned records carrying model and source-state identity.

The colour mapping is an explicit continuous interpolation between the named
empirical endpoint tokens for the declared indicator identity. The input is the
Scientific Core's non-negative `protonationRatio`; the observable layer
converts it to a bounded interpolation fraction only. The mapping is empirical
and not a chemistry result. An unknown indicator has no safe palette and is
rejected.

`ScientificState.modelPh` remains activity-based and model-dependent.
`TeachingHydrogenIonExponent` comes from the ScientificProjection. The
observable layer never derives one from the other. A scientific expression must
also carry the same model id/version as the frame's ScientificState; render may
present it, but cannot make an expression from an arbitrary string.

## World/event design

M5 adds no events and mutates no WorldState. Burette deliveries and vessel
volumes are supplied as committed data by the composition layer. Pointer noise,
animation time, and hover state are not accepted as world truth.

## Representation design

The package owns these pure transformations:

| Module | Responsibility |
|---|---|
| `observable/color.ts` | ratio → continuous empirical colour |
| `observable/level.ts` | volume → declared profile height plus inverse check |
| `observable/burette.ts` | scale reading, delivered volume, and contained volume from committed deliveries |
| `observable/curve.ts` | ordered state/projection frames → curve points |
| `observable/species.ts` | ScientificState species → inspection rows |
| `observable/symbolic.ts` | schema-owned scientific expressions → frozen display lines |
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
  readonly sourceStateHash: string;
  readonly taughtHydrogenIonExponent: TeachingHydrogenIonExponent;
}

export interface ScientificFrame {
  readonly sourceStateHash: string;
  readonly sequence: number;
  readonly scientificState: ScientificState;
  readonly physical: {
    readonly liquidVolume: Litre;
    readonly volumeProfileHash: string;
  };
  readonly projection: ScientificProjectionReadout;
}

export interface ObservableInput {
  readonly frame: ScientificFrame;
  readonly volumeProfileSnapshot: VolumeProfileSnapshot;
  readonly burette?: BuretteInput;
  readonly curveFrames?: readonly CurveFrame[];
  readonly symbolicLines?: readonly ScientificExpression[];
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
- symbolic lines are schema-owned scientific expressions and are not silently
  rewritten; empty identifiers, expressions, or frame/model identity are
  rejected; and
- Observable never substitutes a fallback chemistry value after a scientific
  failure. The caller must decide how to present a failed result.

## Test plan

- projection input regression proves `waterMass` is not part of the molarity
  projection contract;
- colour tests check endpoints, boundedness, continuity, no threshold branch,
  and immutability;
- level tests use a non-cylindrical hand-computed profile, verify `V(h)`/`h(V)`
  round-trip, and reject invalid/tolerance-breaking profiles;
- burette tests check the scale-reading and contained-volume invariants, full
  draw, overdraw rejection, and `mL` display precision;
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
| AC-V2 | Colour output is continuous within the declared indicator-specific palette and has no threshold branch | `packages/render/src/observable/color.test.ts` |
| AC-V3 | No chemical colour decision/literal is embedded in render transforms; empirical palette tokens are declared, identity-keyed, and provenance-bearing | token/module review and render guard; final visual realization is M6 evidence |
| AC-V4 | Liquid height is obtained from the declared `h(V)` profile and its `V(h)` inverse agrees within tolerance | `level.test.ts` and profile-integrity tests; concrete asset realization is M6 evidence |
| AC-V6 | pH is at most two decimals and a burette scale reading is displayed in `mL` at `0.01 mL` | `format.test.ts`; DOM evidence remains open |
| AC-V8 | A replaceable presentation policy emits one hydrogen-ion convention per view | `state/scene.test.ts`; DOM evidence remains open |
| AC-V9 | Render receives only scientific outputs/expressions and performs no equilibrium computation | dependency/type/source checks |
| M5-PURE | Same input produces the same frozen model without DOM/Pixi or mutation | `observable.test.ts` |
| M5-CURVE | Curve points preserve the supplied state sequence and values | `curve.test.ts` |

AC-V10 and AC-V11 require inspection DOM copy and therefore remain M5 S3
criteria after the inspection surface exists. This S2 implementation exposes
the exact model-pH provenance and accuracy flag needed by that later surface;
it does not claim their browser evidence yet. M5 S3 does not require M6 final
assets or visual review; M6 owns the visual realization of the already-frozen
AC-V3/AC-V4 contracts.

## Rollout/migration

This M5 closure includes the persisted vessel-profile contract introduced by
the current M5 contract amendment in `SPEC-0001`, whose revision is declared by
`contracts/version-manifest.json` (revision 25); World/Event schema v4 is the current persisted
version, with an explicit v3→v4 migration that requires a reviewable profile
resolver for legacy geometry-only records. The observable model itself is not
persisted. Future RenderState changes require an explicit
`ObservableModelVersion` bump and a migration or rejection policy before any
rendered state is persisted.

## Open questions

None for the M5 S1 scope. Animation clock ownership remains intentionally
deferred to M6.
