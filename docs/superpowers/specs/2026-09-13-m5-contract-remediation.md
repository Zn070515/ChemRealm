# M5 Contract Remediation Specification

**Status:** S1 specified; owner-approved remediation direction, 2026-09-13

**Canonical amendment:** the M5 contract revision declared by
`contracts/version-manifest.json` (revision 25); the native-backend amendment
is a separate current candidate revision. This document does not override
`SPEC-0001`; it describes the implementation needed to bring
the M5 slice back into alignment with that amendment.

## Context

The first M5 S2 slice established a pure observable package, but review found
four contract failures: its child specification weakened accepted AC-V4 and
AC-V6 wording, the burette transform confused contained volume with scale
reading and displayed litres at the wrong resolution, all indicators shared one
palette, and the scene emitted both pH conventions at once. Two bounded P2
risks are closed here as well: symbolic expressions become schema-owned
scientific outputs, and state/projection inputs travel as one source-identified
frame. Revision 22 additionally makes the vessel volume profile part of frozen
genesis truth and binds the frame to the physical volume/profile identity used
by Observable. Revision 23 closes the last executable-geometry seam: Observable
consumes the replay-frozen `VolumeProfileSnapshot` and reconstructs its runtime
adapter internally. A caller cannot provide functions that merely self-report
the frame's profile hash. Revision 24 closes the remaining content-address
seam: the shared schema parser recomputes the hash over the hash-excluded
payload before any executable adapter is constructed, so a matching frame
label alone is never sufficient.

The later indicator-optical plan supersedes the interim endpoint-RGB palette
as the active production path. Task 7 consumes a tagged, refusal-first
`IndicatorOpticalObservation`; the former palette artifacts are historical
contract evidence and must not be used as a fallback when chemical forms or
quantitative spectra are unavailable.

## Goal

1. Restore the accepted representation contracts without changing M4 science
   or World Runtime semantics.
2. Make volumetric profiles publish both directions and verify their inverse
   within a declared tolerance.
3. Represent a burette's contained volume, delivered volume, and scale reading
   as different named values; display the scale reading in `mL` to `0.01 mL`.
4. Expose an indicator optical observation by `indicatorId`, refusing missing
   chemical forms or quantitative profile data instead of inventing a colour.
5. Make a RenderState contain exactly one hydrogen-ion convention selected by a
   replaceable presentation policy.
6. Prevent symbolic lines and projection data from becoming untraceable or
   cross-frame inputs.

M5 owns the contract-level portions of AC-V3 and AC-V4: the declared
identity-keyed palette, replayable profile snapshot, both profile directions,
round-trip tolerance, and Observable transformations. M6 owns concrete asset
realization, final visual tuning, screenshots, and visual review; those
downstream deliverables do not gate M5 S3.

Within this scope, AC-V3 is a M5 contract-level palette criterion and AC-V4 is
a M5 contract-level volume-profile criterion. The canonical criterion text is
unchanged; only the evidence ownership boundary is made explicit here.

## Non-goals

- No PixiJS, DOM screen, final apparatus art, animation clock, or M6 work.
- No change to M4 equations, constants, solver identity, or event semantics.
  Persisted World/Event schema v5 is current: this remediation introduced the
  replayable volume-profile contract in v4, and the explicit v4→v5
  optical-boundary admission is owned by the World Runtime without inventing
  optical data.
- No renderer-side chemistry, indicator `Ka`, activity calculation, or
  reaction decision.
- No automatic migration of already-persisted M5 RenderState; the observable
  model is not persisted in this milestone.

## User experience

The pure model prepares later UI to show the selected pH convention rather than
both conventions in one view. A burette readout such as `25.00 mL` means the
graduated scale reading, while its contained and delivered volumes remain
available as separate data. Phenolphthalein and methyl orange are represented by
identity-bearing optical observations when the required chemical forms and
reviewed spectra are available; otherwise the user sees a diagnostic refusal
without a fallback colour. A vessel level is accepted only when its forward and
inverse volume profile agree within the profile's tolerance.

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

The Scientific Core composition boundary supplies a `ScientificFrame` created
by `projectScientificFrame(...)`, containing the state, projection, and source
identity. The render package does not compute or verify
chemistry; it preserves and labels the supplied identity. Presentation policy
chooses one hydrogen-ion readout at scene construction time.

The persisted `VolumeProfileSnapshot` is the replayable geometry contract. It
contains canonical knots, ranges, tolerance, provenance, and a hash of the
hash-excluded payload; `geometryRef` is not consulted to reconstruct an old
world. The shared schema parser recomputes and verifies that hash before
runtime geometry is restored.

## Scientific design

The active indicator representation is the refusal-first optical observation
boundary defined by the optical plan. The Scientific Core supplies either
identity-bearing chemical-form fractions or a tagged chemical-coverage refusal.
The Representation Engine then requires a frozen, reviewed spectral profile,
optical path, conserved amount, and covered conditions before applying the
Beer–Lambert/colourimetry transform. Missing or out-of-coverage data produces
an explicit status and no tint; the former endpoint-RGB palette is not a
fallback. Render components do not receive `Ka`, pH, activity, or raw
protonation inputs.

Scientific expressions are schema-owned, equation-bearing records with current
numeric substitutions, expression classification, model identity, and
source-state identity. Render may copy and freeze them but may not author an
`exact` expression or rewrite an expression. The Scientific Core owns the
acid-base component-to-request mapping.

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
- `IndicatorOpticalObservation` is a tagged, refusal-first result keyed by
  indicator ID. The active production path has no endpoint-RGB fallback;
  quantitative colour requires the optical plan's reviewed profile and
  chemical-form coverage.
- `HydrogenIonPresentationPolicy` is a data policy selecting either taught pH
  or activity-model pH. `toRenderState` emits one selected readout only.

## Learning design

No ACE behavior changes. Explicitly labelled taught/model readouts support
inspection without inferring learner understanding or changing the science.

## Privacy/compliance

No network, identity, telemetry, persistence, or retention behavior changes.

## API/schema changes

`ScientificProjectionInput` retains only `sourceStateHash` and `liquidVolume`;
`projectScientificFrame` is the preferred composition-boundary constructor and
calls the projection with the same authoritative identity.

The ObservableModel owns readout strings and precision policy; a later DOM/Pixi
Renderer owns actual text drawing. This separation keeps formatting testable
without making the renderer a second source of display semantics.
The schema package adds a versioned `ScientificExpression` contract. Render's
input is:

```ts
interface ScientificFrame {
  readonly sourceStateHash: string;
  readonly sequence: number;
  readonly scientificState: ScientificState;
  readonly physical: {
    readonly liquidVolume: Litre;
    readonly volumeProfileHash: string;
    readonly temperature: Kelvin;
    readonly solvent: string;
    readonly optical: {
      readonly path: FrozenOpticalPathSnapshot | undefined;
      readonly profiles: readonly OpticalProfileSnapshot[];
    };
  };
  readonly projection: ScientificProjectionReadout;
}

interface ObservableInput {
  readonly frame: ScientificFrame;
  readonly volumeProfileSnapshot: VolumeProfileSnapshot;
  readonly burette?: BuretteInput;
  readonly curveFrames?: readonly CurveFrame[];
  readonly symbolicLines?: readonly ScientificExpression[];
}
```

The `ScientificExpression.sourceStateHash` and `modelId/modelVersion` must
match the frame's source-state and ScientificState provenance when the
expression is presented. Scientific expressions are emitted by the
Scientific-Core producer and carry `producerId = "scientific-core"`; render
validates this boundary but does not claim cryptographic authorship. Persisted
world/event schema version 4 freezes serializable volume profiles in genesis;
legacy geometry-only v3 records require an explicit profile resolver and are
never guessed from `geometryRef`.

## Failure modes

- A missing inverse profile or a round-trip outside tolerance is rejected.
- A burette delivery beyond contained volume is rejected; a negative reading is
  never clamped into a plausible value.
- An unknown indicator ID is rejected rather than shown with another
  indicator's optical profile.
- Missing chemical forms, spectra, or path data produce a tagged optical
  refusal and never a generic acid/base colour.
- A policy never produces both pH conventions in one RenderState.
- A symbolic line with missing or mismatched model/source identity is rejected.
- A frame with an empty source identity is rejected.
- A projection/frame pair is created by one source-identified factory; render
  rejects a frame whose projection identity differs from its frame identity.
- A structurally valid profile whose payload no longer matches its declared
  `profileHash` is rejected before executable geometry is created.

## Test plan

- Add revision-21 contract assertions and mark the previous M5 false PASS rows
  as partial until DOM/visual evidence exists.
- Add schema tests for versioned `ScientificExpression` and conversion tests for
  litres-to-millilitres.
- Add inverse-profile tests with a conical profile, tolerance failure, and
  missing inverse rejection.
- Add burette tests for contained/delivered/current scale values, full draw,
  overdraw, and `25.00 mL` formatting.
- Add tagged optical refusal/coverage tests and keep quantitative optical
  profile admission behind the separate source-review plan.
- Add default taught-policy and scientific-model-policy scene tests proving
  exactly one pH convention is emitted.
- Add frame and symbolic source-identity tests.
- Add shared schema and Observable negative tests for a tampered profile payload
  retaining the old `profileHash`.
- Run all repository checks and preserve M5 as S2.

## Acceptance criteria

| Criterion | Binary requirement | Evidence |
|---|---|---|
| AC-V2 | Active indicator presentation is continuous only within an admitted optical model; unsupported data is refused | optical observation tests; quantitative profile admission remains in the optical plan |
| AC-V3 | Active indicator presentation is a tagged, provenance-bearing optical observation; no endpoint-RGB fallback or render-side equilibrium decision exists | optical boundary tests and source-review plan |
| AC-V4 | M5 contract-level `h(V)` is called and `V(h)` round-trips within stated tolerance | level/profile-integrity tests; M6 supplies concrete asset realization |
| AC-V6 | pH formatting is at most two decimals; burette scale readout is `mL` at `0.01 mL` | formatter tests; DOM remains future evidence |
| AC-V8 | A replaceable policy selects exactly one hydrogen-ion convention per view | scene policy tests |
| AC-V9 | Render receives ratio/expression outputs and computes no chemistry | package and source guards |
| M5-FRAME | State, projection, and symbolic data carry a common source identity | frame/symbolic tests |

## Rollout/migration

Persisted World/Event schema v5 is not an in-place reinterpretation: v3→v4
requires an explicit, reviewable volume-profile resolver for legacy
geometry-only records, and v4→v5 admits the optical boundary without
inventing optical data. Existing internal M5 callers are updated atomically
because the package is not yet a released public API; the persisted migration
is still explicit and non-destructive.

## Open questions

None for this remediation. DOM inspection remains an M5 S3 criterion where
required by the canonical matrix. Final visual evidence and concrete asset
realization are M6-owned and do not gate M5 S3; neither is silently claimed
here.
