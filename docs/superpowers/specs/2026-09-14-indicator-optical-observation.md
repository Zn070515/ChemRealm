# Indicator Optical Observation Design

> **Status:** Candidate boundary implemented through refusal-first S2; no
> quantitative production profile or `OPTICAL_MODEL_OK` acceptance claim
> 
> **Scope:** A data-backed replacement for endpoint-RGB indicator presentation.
> 
> **Authority:** This design is subordinate to `GOAL.md`, `SPEC-0001`,
> `ADR-0003`, `ADR-0006`, and `docs/visual/apparatus-standard.md`. Its future
> implementation requires a canonical `SPEC-0001` candidate amendment before
> it can change any accepted AC-* criterion.

## Context

The earlier M5 slice mapped a Scientific Core indicator `protonationRatio`
directly onto identity-keyed endpoint RGB tokens. Those tokens gained
resolvable qualitative provenance, but they remained **presentation
approximations**:
they do not contain an absorption spectrum, indicator amount, solution
concentration, optical path length, illumination, observer model, or a
coverage/refusal policy. They therefore cannot truthfully be described as a
spectrophotometric liquid-colour model.

That omission matters chemically. An indicator's observed colour is not a
single function of a label or a pH threshold. Under the dilute-solution
Beer–Lambert approximation, wavelength-specific absorbance is

\[
A(\lambda) = \ell\sum_i \epsilon_i(\lambda)c_i,
\qquad T(\lambda)=10^{-A(\lambda)},
\]

where \(\epsilon_i\) is the molar absorptivity of each optical species,
\(c_i\) its concentration, and \(\ell\) a declared optical path length. The
transmission spectrum must then be combined with an illuminant and observer
convention before a display-space colour can be derived.

Phenolphthalein is the required adversarial case. Its neutral lactone is
colourless through ordinary acidic and near-neutral aqueous conditions; the
well-known quinoid/dianion form is pink/fuchsia in its alkaline transition
band. A separate highly protonated, strongly acidic form can be orange or
orange-red in an extreme-acidity regime. A recent analysis reports that regime
below approximately pH −1 and discusses a visible maximum near 497 nm; it is
not evidence that every solution merely below pH 7 is orange. The current
Davies v0 acid-base model does not claim that extreme-acidity domain, so it
must not fabricate the orange form from the existing monoprotic ratio.

Methyl orange is also unsuitable for a two-RGB endpoint shortcut: its acidic
and alkaline spectra differ, and published work records concentration,
tautomeric, and strong-acid effects. A model that silently reduces either
indicator to a fixed fill RGBA would violate `GOAL.md` §§5.2, 5.3, and 5.11.

Primary references to be recorded at datum level before implementation include:

- A. V. Malakhov et al., *Absorption of colored phenolphthalein dianion in
  aqueous solution: a theoretical analysis*, Spectrochimica Acta A (2025),
  including its cited discussion of the extreme-acid orange form and visible
  absorption: <https://www.sciencedirect.com/science/article/pii/S0301010425002897>.
- K. M. Tawarah and H. M. Abu-Shamleh, *A Spectrophotometric Study of the
  Tautomeric and Acid-Base Equilibria of Methyl Orange and Methyl Yellow in
  Aqueous Acidic Solutions*, Dyes and Pigments 16 (1991), 241–251,
  <https://doi.org/10.1016/0143-7208(91)85014-Y>.
- The Royal Society of Chemistry teaching data for aqueous methyl-orange
  acid/base UV–Vis measurements, which states experimental concentration and
  1 cm path-length conditions:
  <https://www.rsc.org/suppdata/books/184973/9781849739634/bk9781849739634-chapter%205.1.pdf>.

Those citations establish research direction, not a licence to transcribe an
incomplete spectrum, infer missing wavelengths, or claim calibration outside
their reported solvent, temperature, concentration, or acidity ranges.

## Goal

1. Replace endpoint-RGB-as-chemistry with a deterministic, provenance-bearing
   optical observation pipeline driven by declared spectra, chemical form
   fractions, total indicator concentration, and path length.
2. Make every displayed indicator colour explicitly one of:
   `OPTICAL_MODEL_OK`, `OPTICAL_MODEL_OUT_OF_COVERAGE`, or
   `OPTICAL_MODEL_DATA_MISSING`; never silently fall back to an unrelated
   palette token.
3. Represent phenolphthalein's ordinary colourless, alkaline pink, and
   extreme-acid orange regimes as distinct chemical/optical cases. The orange
   case is displayable only when a Scientific Core model supplies its form
   fraction within a declared validity domain and a sourced optical profile
   covers that form.
4. Preserve the four-core boundary: Scientific Reality owns chemical
   speciation; the Representation Engine owns propagation of documented light
   through that state; the renderer owns glass, lighting, and drawing; ACE
   interprets rather than alters the result.

## Non-goals

- This is not a general radiative-transfer, scattering, fluorescence,
  turbidity, precipitation, camera, or physically based glass-rendering model.
- This is not permission to extrapolate Beer–Lambert behaviour into concentrated,
  aggregating, precipitating, fluorescent, or unsourced regimes.
- This does not change the accepted M4 v0 acid-base domain or assert that it
  reaches phenolphthalein's extreme-acid orange regime.
- This does not make a rendered pixel a calibrated analytical measurement.
- This does not authorize M6, replace M6 visual review, or let a renderer infer
  chemistry from a colour.
- This does not derive or generate oracle spectra from the production solver.

## User experience

In a supported, data-covered vessel, the inspection view can state, in plain
language, that the displayed liquid tint is an empirical optical prediction
under named conditions, for example:

```text
Phenolphthalein optical observation
Forms: neutral lactone 97.4%, quinoid base form 2.6%
Indicator concentration: 2.0e-5 mol/L
Declared optical path: 2.4 cm
Profile: aqueous 25 °C, D65 / CIE 1931 2° / sRGB
Status: within declared optical coverage
```

For a state whose chemistry is valid but whose optical model lacks a spectrum,
form fraction, concentration, path length, or coverage, the view must say that
the colour observation is unavailable. It must not show a familiar-looking
pink/red/yellow substitute. A teaching policy may explain *why* it is
unavailable, but cannot replace the missing model with an answer-shaped colour.

Extreme-acid phenolphthalein must be presented with its own qualification. A
user must never see orange solely because a generic pH test says "acidic". The
inspection copy must identify the required strongly acidic form and optical
profile; if the active Scientific Core refuses that regime, the optical result
is unavailable rather than orange.

## Architecture

```text
frozen World indicator dose + vessel geometry/path declaration
                         │
                         ▼
Scientific Reality Core ── chemical form fractions + model identity
                         │
                         ▼
Representation Engine ── sourced ε(λ), c, ℓ, illuminant/observer
                         │        │
                         │        └─ Beer–Lambert transmission + colour transform
                         ▼
ObservableModel ── display tint, coverage/refusal, provenance summary
                         │
                         ▼
Renderer ── solution material + tint strength + glass/light composition
```

### Ownership

| Owner | Responsibilities | Must not do |
|---|---|---|
| Scientific Reality Core | Resolve supported indicator chemical forms and their fractions; attach model identity and validity | Choose RGB, illumination, glass opacity, or a teaching palette |
| World Runtime | Persist indicator dose/inventory and declared geometry/path inputs; conserve them during transfers; replay exactly | Calculate equilibrium or colour |
| Representation Engine | Validate spectral-profile provenance/coverage; calculate absorbance/transmission and deterministic display transform; report refusal | Invent chemical forms, `Ka`, pH thresholds, or a spectrum |
| Renderer | Combine the Observable tint with vessel/glass/light material | Treat tint alpha as liquid opacity or decide chemistry |
| ACE | Explain a colour/model limitation and adapt teaching language | Change forms, concentration, path length, or optical status |

## Scientific design

### Chemical forms are not colour labels

Replace the current generic observable-only indicator output with a
Scientific Core-owned form record. A future supported indicator result has the
following semantic shape:

```ts
interface IndicatorChemicalFormFraction {
  readonly formId: string;       // e.g. "neutral-lactone", "quinoid-dianion"
  readonly fraction: number;     // [0, 1], all forms sum to 1 within tolerance
}

interface IndicatorChemicalObservation {
  readonly indicatorId: string;
  readonly totalAmount: Mol;
  readonly forms: readonly IndicatorChemicalFormFraction[];
  readonly scientificCoverage: "OK" | "OUT_OF_DOMAIN" | "DATA_MISSING";
  readonly modelId: string;
  readonly modelVersion: string;
  readonly sourceReplayHash: string;
}
```

`protonationRatio` may remain as a compatibility/teaching projection for the
existing monoprotic v0 model, but it is insufficient as the sole input to an
optical model with more than two forms. The form set is model-specific and must
be produced by Scientific Reality, not reverse engineered by the renderer from
`modelPh`.

The parser must reject an empty form list, duplicate `formId`, non-finite or
negative fractions, and a fraction sum whose absolute error from one exceeds
`1e-12`. A form may be absent only when the whole observation carries the
explicit `DATA_MISSING` or `OUT_OF_DOMAIN` coverage state; an apparently
complete `OK` observation must not silently omit a non-zero form.

For phenolphthalein, the required semantic forms are at least:

| Form ID | Regime | Observational meaning |
|---|---|---|
| `strong-acid-cation` | Declared extreme-acidity model only | orange/orange-red if both chemical and optical coverage exist |
| `neutral-lactone` | Ordinary acidic to near-neutral aqueous regime | colourless/near-transparent contribution |
| `quinoid-base` | Alkaline coloured regime | pink/fuchsia contribution |
| `strong-base-altered` | Declared high-base model only | colourless/fading contribution if a kinetic/equilibrium model supports it |

The existing v0 Davies adapter does not have constants or species equations for
all four forms. It must therefore return an optical coverage refusal for forms
it cannot calculate, rather than mapping a generic monoprotic fraction onto
the orange regime.

### Optical profile data

Every optical form requires a datum-level profile record. A profile is valid
only if it includes:

```text
indicatorId, formId, spectrum ID and content hash
wavelength grid (nm) and molar absorptivity ε(λ) [L mol⁻¹ cm⁻¹]
solvent/composition, temperature, ionic-strength/acidity conditions
concentration range tested, aggregation/linearity constraints
source citation, source precision, extraction/normalisation method
illuminant, observer, colour-space conversion convention
review status and known limitations
```

At runtime, all covered forms are combined wavelength-by-wavelength:

\[
A(\lambda) = \ell\sum_i \epsilon_i(\lambda)c_{\mathrm{total}}f_i,
\quad T(\lambda)=10^{-A(\lambda)}.
\]

The model uses a fixed declared illuminant and observer (initially D65 and CIE
1931 2°), integrates transmitted spectral power into XYZ, then uses a pinned
sRGB transform. These conventions are part of optical profile provenance and
replay identity. The result is a **presentation tint**, never a literal claim
about bulk liquid opacity.

The initial implementation may only include forms for which complete numerical
spectral data and conditions are checked in. A source that gives a colour word
or only a single \(\lambda_{max}\) supports a qualitative swatch/reference,
but does **not** support a Beer–Lambert spectrum. It must be recorded as
qualitative-only and cannot enable `OPTICAL_MODEL_OK`.

### Concentration and path length

Indicator chemistry remains dilute enough that v0 may neglect its effect on
bulk pH only under an explicit Scientific Core approximation. Optical
concentration may not be neglected. The persisted world must carry a conserved
indicator amount, so every vessel's optical concentration is derived from
amount divided by that vessel's current liquid volume. Transfers move the dose
with the liquid using the same exact/conservation discipline as other dissolved
inventory.

Optical path length is not `liquidHeight` by default. It is a declared
geometry/camera-independent effective path value or derivation rule owned by a
frozen vessel optical-profile snapshot. It must name its validity range and be
replayable. M6 may use the result to drive a view-dependent material, but it
may not replace it with an arbitrary alpha channel.

### Explicit refusal boundaries

`OPTICAL_MODEL_OUT_OF_COVERAGE` is required for any of:

- unknown indicator/form/profile;
- Scientific Core form coverage unavailable or out of domain;
- indicator concentration, path length, temperature, solvent, ionic strength,
  or acidity outside a profile's declared range;
- incomplete spectral grid or unsupported illuminant/observer convention;
- a non-dilute/aggregation regime where the source says Beer–Lambert is not
  applicable.

`OPTICAL_MODEL_DATA_MISSING` is required when chemistry supplied a form but no
reviewed spectrum exists. Both statuses preserve a provenance-rich diagnostic;
neither returns an approximate RGB fallback.

## World/event design

Indicator dose and optical profile identity become persisted scientific inputs.
They are neither renderer settings nor mutable content lookups. The exact
persisted contracts are:

```ts
interface FrozenIndicatorOpticalInput {
  readonly indicatorId: string;
  readonly initialVesselId: string;
  readonly totalAmount: Mol;
  readonly opticalProfile: OpticalProfileSnapshot;
  readonly provenance: DataProvenance;
}

interface VesselIndicatorOpticalInventory {
  readonly indicatorId: string;
  readonly amount: Mol;
}

interface FrozenVesselOpticalPath {
  readonly pathRuleId: string;
  readonly pathRuleVersion: string;
  readonly pathRuleHash: string;
  readonly validity: {
    readonly minLiquidVolume: Litre;
    readonly maxLiquidVolume: Litre;
  };
  readonly provenance: DataProvenance;
}
```

`FrozenIndicatorOpticalInput.totalAmount` is a declared genesis dose. At world
creation it is allocated into the declared vessel inventory; after genesis the
per-vessel inventory is authoritative. Its sum may change only through an
explicit indicator-addition/removal event introduced by a later accepted
contract. A transfer moves it by the same pre-transfer fraction and exact
full-transfer semantics as any other dissolved amount.

```text
ScenarioSnapshot
  └─ indicatorOpticalInputs[]
       indicatorId, initialVesselId, totalAmount, opticalProfile, provenance

WorldState vessel inventory
  └─ indicatorAmounts[]          // conserved and transferred with liquid

Vessel optical profile snapshot
  └─ opticalPath?/pathRuleHash   // optional fixed path, frozen with geometry identity
```

An optical profile or path-rule artifact is valid only when its payload hash is
recomputed and equals the frozen hash before it is used. An artifact version is
read from the single central version manifest; no package, JSON fixture, native
module, or document may restate a literal profile-format version. The following
properties are non-negotiable:

- a world/event schema bump and explicit migration policy are required;
- old worlds that lack an optical dose/profile may replay their chemistry but
  yield `OPTICAL_MODEL_DATA_MISSING`, never current-content colour;
- no migration may invent a historical indicator amount, profile, or spectrum;
- world transfer tests must prove indicator amount conservation and branch
  isolation;
- the frozen indicator optical input and profile hashes participate in the
  relevant world/replay identity.
- the v4→v5 admission adds an empty `indicatorOpticalInputs` block and empty
  per-vessel `indicatorAmounts` when absent; it never invents dose, profile,
  spectrum, or path data.

## Representation design

Replace `IndicatorColour` as the scientific-looking boundary with an explicit
observation result:

```ts
type IndicatorOpticalObservation =
  | {
      readonly status: "OPTICAL_MODEL_OK";
      readonly indicatorId: string;
      readonly tintSrgb: readonly [number, number, number];
      readonly tintStrength: number; // clamp(1 - Ytransmitted / Yblank, 0, 1)
      readonly transmittanceSamples: readonly {
        readonly wavelengthNanometres: number;
        readonly transmittance: number;
      }[];
      readonly profileId: string;
      readonly profileHash: string;
      readonly sourceReplayHash: string;
      readonly conditions: Readonly<Record<string, number | string>>;
    }
  | {
      readonly status: "OPTICAL_MODEL_OUT_OF_COVERAGE" | "OPTICAL_MODEL_DATA_MISSING";
      readonly indicatorId: string;
      readonly reason: string;
      readonly sourceReplayHash: string;
      readonly missingOrOutOfRange: readonly string[];
    };
```

`tintSrgb` and `tintStrength` are explicitly presentation output. A renderer
must combine them with base-liquid, lighting, glass, meniscus, and scene
materials. It must not interpret `tintSrgb` as an RGBA liquid fill or use
`tintStrength` as physical optical depth.

The transform must be deterministic, pure, and free of `Ka`, pH thresholds, or
equilibrium equations. It consumes only the validated chemical form fractions,
conserved dose/volume-derived concentration, declared path length, and frozen
spectral profile.

`Yblank` and `Ytransmitted` are the same pinned observer/illuminant integration
with, respectively, unit and calculated transmission. `tintStrength` is thus a
deterministic display aid derived from the optical calculation, not an arbitrary
opacity knob. The renderer may apply its material policy to that value but must
not substitute a different chemistry-dependent strength.

## Learning design

The inspection view should distinguish these claims:

- chemical form fractions come from the named scientific model;
- the tint is an empirical optical prediction under named conditions;
- a colour change is an observation, not proof of a unique reaction pathway;
- unavailable optical coverage is a model limitation, not an absence of
  chemistry.

Teaching policies may progressively disclose the spectrum, Beer–Lambert
relation, concentration/path-length dependence, and why a colour can fade on
dilution. They must not replace an unavailable optical model with a school
mnemonic.

## Privacy/compliance

All profiles, spectra, source metadata, and deterministic transforms are
checked-in local assets. No camera sampling, screen capture, learner image,
network query, account, telemetry, or server-side colour analysis is required.
Any future upload/calibration workflow requires a separate privacy and consent
specification.

## API/schema changes

Implementation must introduce, at minimum:

1. Schema-owned `IndicatorChemicalObservation` / chemical form fraction DTOs.
2. A versioned, content-addressed optical-profile artifact format owned by a
   single central version manifest entry; no duplicated format versions in
   TypeScript, Rust, JSON, or docs.
3. Persisted indicator dose and frozen optical-profile references/hashes in
   scenario/world state, with migration/refusal semantics.
4. Representation-owned `IndicatorOpticalObservation` tagged union replacing
   direct endpoint colour output.
5. A deterministic spectrum-to-sRGB implementation with its own test corpus;
   it must not use arbitrary palette interpolation as a fallback.
6. Explicit compatibility adapters only where required for historical worlds;
   these adapters return `OPTICAL_MODEL_DATA_MISSING` when historic inputs are
   insufficient.

No public API may accept a bare `pH` or `protonationRatio` and return a colour
without a validated optical profile and conditions.

## Failure modes

| Failure | Required response |
|---|---|
| A renderer maps `modelPh < 7` to orange | Contract guard fails; no pH enters optical transform |
| Token RGB is presented as a measured spectrum | Provenance/coverage guard fails; source type distinguishes qualitative from spectral |
| Missing indicator amount/path length | `OPTICAL_MODEL_DATA_MISSING`, no colour fallback |
| Extreme-acid phenolphthalein requested from v0 Davies model | Scientific/out-of-coverage refusal, not orange |
| Spectrum valid only for dilute water is used in concentrated/aggregating state | `OPTICAL_MODEL_OUT_OF_COVERAGE` |
| Transfer changes liquid volume but not indicator amount | World conservation/replay test fails |
| Asset/profile changes alter an old world | content-hash/profile-hash validation fails or old world reports missing coverage |
| Renderer treats tint alpha as liquid opacity | renderer/observable boundary guard fails |
| A source has only \(\lambda_{max}\) but enables full spectrum output | profile validator rejects it |

## Test plan

### Scientific and data tests

- Profile parser rejects missing wavelength samples, non-monotone wavelength
  grids, non-finite \(\epsilon\), missing conditions, missing source, or a
  qualitative-only source marked quantitative.
- Form fractions are finite, non-negative, sum within declared tolerance, and
  have a Scientific Core model/source identity.
- The normal phenolphthalein lactone fixture is near-transparent only with a
  supplied neutral-lactone profile; it is not derived from a generic acid test.
- The strong-acid phenolphthalein orange fixture requires an explicit
  `strong-acid-cation` fraction plus a profile whose domain covers the stated
  acidity. The same request through the v0 Davies adapter must refuse optical
  coverage.
- Methyl-orange acid/base profile fixtures prove spectral-form identity is not
  borrowed from phenolphthalein.

### Optical tests

- For a fixed spectrum/form composition, every wavelength's transmission is
  non-increasing as `concentration × pathLength` increases.
- Zero optical concentration yields unit transmittance and zero tint strength.
- A doubled optical path length equals a doubled absorbance in the declared
  Beer–Lambert range.
- Pinned spectra, D65/CIE constants, and sRGB transform vectors reproduce
  reference XYZ/sRGB values within stated deterministic tolerance.
- Any missing profile, unsupported form, or condition outside a profile range
  returns a tagged refusal and no `tintSrgb`.

### World/replay tests

- Genesis freezes dose/profile identity; changing current content cannot change
  old-world optical inputs.
- Partial/full transfer conserves each indicator dose and changes concentration
  only via the committed vessel amount/volume state.
- Replay with/without cache and forked branches yields identical optical
  observation statuses and hashes at committed boundaries.
- Historic worlds without an optical input remain replayable chemically and
  produce `OPTICAL_MODEL_DATA_MISSING` rather than a substituted palette.

### Representation/browser tests

- Render code imports only `IndicatorOpticalObservation`, not `Ka`, model pH,
  or form-equilibrium constants.
- DOM inspection names profile, status, concentration, path length, and
  limitation where applicable.
- A colour/refusal fixture is deterministic across required viewports; M6 owns
  final apparatus screenshots and visual review.

## Acceptance criteria

The canonical SPEC amendment must introduce or refine binary criteria before
implementation claims completion:

| ID | Criterion |
|---|---|
| AC-O1 | Every optical profile resolves to checked-in spectral data, conditions, source provenance, review record, and content hash. |
| AC-O2 | Display tint is derived from declared species fractions, total indicator concentration, path length, spectral absorptivity, and pinned illuminant/observer conversion; no endpoint RGB fallback is used. |
| AC-O3 | A state without a covered form/profile/condition returns a tagged optical refusal and no display colour. |
| AC-O4 | Phenolphthalein ordinary lactone, alkaline quinoid, and extreme-acid cation are distinct cases; the extreme-acid orange case cannot be emitted by the v0 monoprotic model. |
| AC-O5 | Doubling concentration or path length has the declared Beer–Lambert absorbance effect inside the profile domain. |
| AC-O6 | Indicator dose is conserved through world transfers and its replay identity is frozen. |
| AC-O7 | Renderer consumes tint/strength/status only and cannot treat a scientific pH or ratio as a colour instruction. |
| AC-O8 | Optical-profile data, deterministic transform, replay, refusal, and browser inspection evidence are reproducible on the committed baseline. |

## Rollout/migration

1. Keep the current qualitative palette registry only as historical M5 evidence;
   it must be relabelled as qualitative and cannot be advertised as an optical
   model once this work begins.
2. Add the central manifest entry and candidate SPEC amendment before any
   versioned profile data is checked in.
3. Bump persisted scenario/world schema only after the exact indicator-dose and
   frozen-profile fields are specified. Migration never invents dose or profile
   values.
4. Run TS/native differential tests for the chemical form contract before a
   native backend claims it supports an optical form.
5. Land data/profile validation and refusal behaviour before enabling any
   spectrum-to-colour output.
6. Enable individual indicator forms only after their independent spectral data
   packet and reference vectors are accepted.
7. M6 consumes the frozen observation result for final materials and visual
   review; it does not reinterpret scientific/optical input.

## Open questions

1. Which primary numerical spectra can be licensed, archived, and checked in
   for phenolphthalein's neutral, quinoid, and strong-acid forms under declared
   aqueous conditions?
2. Should the first quantitative profile target a cuvette-like fixed path or a
   vessel-specific effective path rule derived from frozen apparatus geometry?
   The latter is the product target; the former may be an isolated evidence
   fixture if it is not presented as the final vessel model.
3. Does the initial chemistry roadmap extend the Scientific Core to a
   multi-form phenolphthalein model, or does it ship `DATA_MISSING` for all
   forms beyond the accepted monoprotic v0 approximation until that scientific
   model has its own M4 validation gate?
4. Which standard observer/illuminant and gamut-clipping policy should be
   frozen for the initial display transform, and what independent reference
   vectors will validate it?
