# M5 Contract Remediation Specification

**Status:** S1 specified; owner-approved remediation direction, 2026-09-13

**Canonical amendment:** `SPEC-0001` revision 21 Candidate. This document
does not override `SPEC-0001`; it describes the implementation needed to bring
the M5 slice back into alignment with that amendment.

## Context

The first M5 S2 slice established a pure observable package, but review found
four contract failures: its child specification weakened accepted AC-V4 and
AC-V6 wording, the burette transform confused contained volume with scale
reading and displayed litres at the wrong resolution, all indicators shared one
palette, and the scene emitted both pH conventions at once. Two bounded P2
risks are closed here as well: symbolic expressions become schema-owned
scientific outputs, and state/projection inputs travel as one source-identified
frame.

## Goal

1. Restore the accepted representation contracts without changing M4 science
   or World Runtime semantics.
2. Make volumetric profiles publish both directions and verify their inverse
   within a declared tolerance.
3. Represent a burette's contained volume, delivered volume, and scale reading
   as different named values; display the scale reading in `mL` to `0.01 mL`.
4. Select an empirical indicator palette by `indicatorId`, while keeping
   equilibrium entirely in Scientific Reality Core.
5. Make a RenderState contain exactly one hydrogen-ion convention selected by a
   replaceable presentation policy.
6. Prevent symbolic lines and projection data from becoming untraceable or
   cross-frame inputs.

## Non-goals

- No PixiJS, DOM screen, final apparatus art, animation clock, or M6 work.
- No change to M4 equations, constants, solver identity, event schemas, or
  persisted world schema.
- No renderer-side chemistry, indicator `Ka`, activity calculation, or
  reaction decision.
- No automatic migration of already-persisted M5 RenderState; the observable
  model is not persisted in this milestone.

## User experience

The pure model prepares later UI to show the selected pH convention rather than
both conventions in one view. A burette readout such as `25.00 mL` means the
graduated scale reading, while its contained and delivered volumes remain
available as separate data. Phenolphthalein and methyl orange transition through
different declared empirical palettes. A vessel level is accepted only when its
forward and inverse volume profile agree within the profile's tolerance.

## Architecture

`@chemrealm/render` remains schema-only and renderer-agnostic:

```text
schema ScientificState + ScientificProjection + ScientificExpression
                         ↓
                  @chemrealm/render
      observable transforms + selected presentation policy
                         ↓
                    RenderState
```

The composition root supplies a `ScientificFrame` containing the state,
projection, and source identity. The render package does not compute or verify
chemistry; it preserves and labels the supplied identity. Presentation policy
chooses one hydrogen-ion readout at scene construction time.

## Scientific design

Indicator palette selection is an empirical observable transform, not an
equilibrium calculation. The palette is keyed by the declared indicator
identity and contains named acid/base endpoint tokens plus an explicit
observable provenance note. The ratio remains the only scientific numeric input
to interpolation.

Scientific expressions are schema-owned records with expression classification,
model identity, and source-state identity. Render may copy and freeze them but
may not author an `exact` expression or rewrite an expression.

## World/event design

No events or WorldState fields change. Burette delivery history is supplied as
committed data. `BuretteReadingChanged` remains rejected as a second source of
truth. M5 only derives presentation data from initial scale reading, initial
contained volume, and committed deliveries.

## Representation design

- `VolumeProfile` requires `heightAtVolume`, `volumeAtHeight`, and a declared
  non-negative volume round-trip tolerance.
- `BuretteState` exposes `currentScaleReading`, `deliveredVolume`, and
  `containedVolume`; no field is named ambiguously `buretteReading`.
- `formatBuretteScaleReading` converts through the schema conversion module and
  emits `mL` with exactly two decimal places.
- `IndicatorPalette` is a declarative catalog keyed by indicator ID.
- `HydrogenIonPresentationPolicy` is a data policy selecting either taught pH
  or activity-model pH. `toRenderState` emits one selected readout only.

## Learning design

No ACE behavior changes. Explicitly labelled taught/model readouts support
inspection without inferring learner understanding or changing the science.

## Privacy/compliance

No network, identity, telemetry, persistence, or retention behavior changes.

## API/schema changes

`ScientificProjectionInput` retains only `scientificState` and `liquidVolume`.
The schema package adds a versioned `ScientificExpression` contract. Render's
input is:

```ts
interface ScientificFrame {
  readonly sourceStateHash: string;
  readonly scientificState: ScientificState;
  readonly projection: ScientificProjectionReadout;
}

interface ObservableInput {
  readonly frame: ScientificFrame;
  readonly liquidVolume: Litre;
  readonly volumeProfile: VolumeProfile;
  readonly burette?: BuretteInput;
  readonly curveFrames?: readonly CurveFrame[];
  readonly symbolicLines?: readonly ScientificExpression[];
}
```

The `ScientificExpression.sourceStateHash` and `modelId/modelVersion` must
match the frame's source-state and ScientificState provenance when the
expression is presented. No persisted world/event schema version changes.

## Failure modes

- A missing inverse profile or a round-trip outside tolerance is rejected.
- A burette delivery beyond contained volume is rejected; a negative reading is
  never clamped into a plausible value.
- An unknown indicator ID is rejected rather than shown with another
  indicator's palette.
- A policy never produces both pH conventions in one RenderState.
- A symbolic line with missing or mismatched model/source identity is rejected.
- A frame with an empty source identity is rejected.

## Test plan

- Add revision-21 contract assertions and mark the previous M5 false PASS rows
  as partial until DOM/visual evidence exists.
- Add schema tests for versioned `ScientificExpression` and conversion tests for
  litres-to-millilitres.
- Add inverse-profile tests with a conical profile, tolerance failure, and
  missing inverse rejection.
- Add burette tests for contained/delivered/current scale values, full draw,
  overdraw, and `25.00 mL` formatting.
- Add both phenolphthalein and methyl-orange endpoint/continuity tests.
- Add default taught-policy and scientific-model-policy scene tests proving
  exactly one pH convention is emitted.
- Add frame and symbolic source-identity tests.
- Run all repository checks and preserve M5 as S2.

## Acceptance criteria

| Criterion | Binary requirement | Evidence |
|---|---|---|
| AC-V2 | Colour remains continuous within the selected indicator's palette | palette/colour tests |
| AC-V3 | Palette is declarative, empirically labelled, and contains no equilibrium decision | render boundary tests/review |
| AC-V4 | `h(V)` is called and `V(h)` round-trips within stated tolerance | level tests |
| AC-V6 | pH formatting is at most two decimals; burette scale readout is `mL` at `0.01 mL` | formatter tests; DOM remains future evidence |
| AC-V8 | A replaceable policy selects exactly one hydrogen-ion convention per view | scene policy tests |
| AC-V9 | Render receives ratio/expression outputs and computes no chemistry | package and source guards |
| M5-FRAME | State, projection, and symbolic data carry a common source identity | frame/symbolic tests |

## Rollout/migration

No persisted schema migration is needed. Existing internal M5 callers are
updated atomically because the package is not yet a released public API.

## Open questions

None for this remediation. DOM inspection and final visual evidence remain M5
S3/M6 work and are not silently claimed here.
