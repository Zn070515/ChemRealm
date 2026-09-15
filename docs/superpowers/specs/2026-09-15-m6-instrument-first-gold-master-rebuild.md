# M6 Instrument-First Gold Master Rebuild

> Status: S1 candidate — implementation is not authorized by this document alone.
> Date: 2026-09-15
> Authority: `GOAL.md`, `AGENTS.md`, `SPEC-0001`, the accepted M4/M5 contracts, and `C:\Users\16275\Desktop\advices\ChatGPT.md`.
> Supersession: when accepted, this governs the M6 Gold Master construction approach in preference to the earlier M6 industrialization, final-quality, and Gold-Master-remediation plans. Historical documents remain evidence, not implementation authority.

## Context

M6 has a useful persisted apparatus/profile contract, but its present Gold Master pipeline is not instrument-first. `ApparatusGraduation` describes all vessels with one generic numeric ladder and `tools/create_gold_master_assets.mjs` generates beaker, flask, and burette silhouettes plus marks from generic formulae. Contract tests can therefore pass while a rendered instrument is physically and visually wrong.

The audit identified a concrete P0-class representation failure: the current 250 mL beaker master labels its marks `0, 50, 100, 150, 200, 250` from top to bottom, contrary to a normal contained-volume vessel scale and to the cited Griffin beaker range. It also identified an externally-ruler-like burette scale, generic flask silhouette, insufficient family breadth, and tests that prove internal consistency rather than instrument truth.

This work rebuilds M6 around authored, reviewable instrument masters. It does not copy NOBOOK pixels or treat decorative SVG density as quality. NOBOOK is used as product evidence that a chemistry simulation needs a rich, manipulable apparatus catalogue: multiple capacities, distinct acid/alkali burettes, and detachable equipment such as tubing.

### Research basis

- [Corning PYREX VISTA Griffin Low Form 250 mL beaker](https://ecatalog.corning.com/life-sciences/b2c/US/en/General-Labware/Beakers/Beakers%2C-Glass/PYREX%C2%AE-VISTA%E2%84%A2-Beakers%2C-Standard-Low-Griffin/p/70000-250) documents the 250 mL Griffin family, 25 mL increments, 25–200 mL range, approximately 95 mm height and 70 mm OD, and that its graduations indicate approximate content.
- [DWK 25 mL Class AS burette](https://www.dwk.com/duran-burette-class-as-with-schellbach-stripe-and-ptfe-key-25-ml-243303304) and [DWK 250 mL Erlenmeyer flask](https://www.dwk.com/duran-erlenmeyer-flask-with-din-thread-without-cap-250-ml-218033604) are primary manufacturer references for the first-wave glassware. The implementation source register must preserve the exact fields actually used; it must not elevate catalogue prose into unsupported claims.
- [NOBOOK chemistry laboratory example](https://www.nobook.com/view/91) is product research for a rich apparatus/interactions catalogue, not a source of copied visual assets.
- [Zhejiang Provincial Education Examinations Authority chemistry assessment guidance](https://www.zjzs.net/art/2020/7/11/art_46_5302.html) supports the educational importance of experimental operation and instrument literacy; it does not override scientific or metrological sources.

## Goal

1. Make the first four apparatus masters physically legible, source-traceable instruments rather than generic SVG primitives:
   - 250 mL Griffin beaker;
   - 250 mL Erlenmeyer flask;
   - 25 mL acid burette;
   - 50 mL alkali burette.
2. Replace generic graduation metadata with instrument-specific, calibration-aware marking semantics.
3. Make the compiler derive LOD assets from approved manual masters; it must never invent a vessel silhouette or measurement scale.
4. Separate contract, instrument, render-geometry, and owner visual-review evidence so a green structural check cannot claim visual or metrological correctness.
5. Preserve replay, content-addressed profile identity, M5 `ScientificFrame` integrity, local-first behavior, and central version distribution.

## Non-goals

- No M7 interaction workflow, drag mechanics, reaction animation, or ACE behavior.
- No claim that beaker/flask graduations are analytical measurements.
- No claim of first-principles colour, glass optics, or manufacturing simulation.
- No automatic generation of artistic master silhouettes from a few dimensions.
- No asset-package release, visual S3 claim, or M7 authorization without owner visual review.
- Strong-acid phenolphthalein orange behavior remains documented scientific/empirical follow-up; it is not silently approximated into this asset pass.

## User experience

At M6 completion, a learner sees coherent apparatus families that read as real laboratory instruments at normal desktop viewing distance: a low Griffin beaker with contained-volume marks, a conical 250 mL Erlenmeyer with appropriate neck/body/proportions, and distinct acid/alkali burettes whose markings increase downward from top zero. Apparatus specifications, calibrations, and limitations are inspectable. A master asset never becomes production-ready merely because it has valid JSON, an SVG hash, or many path elements.

## Architecture

| Core | Owner | M6 responsibility |
| --- | --- | --- |
| Scientific Reality Core | Chemistry, species, indicator facts | No apparatus silhouette or scale decisions. It may provide approved observable inputs only. |
| World Runtime | Replayable world and frozen profile snapshots | Continues to freeze/validate `VolumeProfileSnapshot`; this work must not weaken hash or migration guarantees. |
| Representation Engine | Apparatus semantics, observable geometry, asset rendering | Owns instrument markings, authored masters, LOD compilation, render geometry checks, and visual evidence. |
| ACE | Learning support | Out of scope; M6 exports inspectable apparatus truth without deciding pedagogy. |

Data flow:

```text
authoritative instrument record + cited source record + approved master SVG
    -> canonical asset source and content hashes
    -> ApparatusSpecification / frozen VolumeProfileSnapshot
    -> master-to-LOD compiler (no silhouette/scale invention)
    -> ObservableModel / render geometry
    -> deterministic screenshot + owner visual review
```

`WorldCreated` remains the owner of replay-frozen vessel/profile truth. The representation layer must derive executable `V(h)`/`h(V)` only from the validated frozen profile snapshot, never from a mutable asset reference or a caller-supplied executable function.

## Instrument and scientific design

### Replace generic graduation with `InstrumentMarking`

The contract replaces `ApparatusGraduation` with a discriminated `InstrumentMarking`. A marking is not inferred from capacity.

```ts
type MarkingKind =
  | "burette-ex"
  | "graduated-cylinder-in"
  | "approximate-contained"
  | "volumetric-single-mark";

type ValueDirection = "increases-downward" | "increases-upward" | "single-mark";
type CalibrationMode = "Ex" | "In" | "approximate";

interface InstrumentMarkingBase {
  readonly kind: MarkingKind;
  readonly displayRangeMl: { readonly minimum: number; readonly maximum: number };
  readonly valueDirection: ValueDirection;
  readonly reference: "top-zero" | "bottom-zero" | "single-calibration-mark";
  readonly calibration: CalibrationMode;
  readonly markingSurface: "tube-wrap" | "vessel-wall" | "neck-ring";
  readonly labelPolicy: "all-major" | "selected-major" | "none";
  readonly provenance: DataProvenance;
}

interface RepeatedScaleMarking extends InstrumentMarkingBase {
  readonly kind: "burette-ex" | "graduated-cylinder-in" | "approximate-contained";
  readonly majorIntervalMl: number;
  readonly minorIntervalMl: number | undefined;
  readonly readingResolutionMl: number | undefined;
}

interface VolumetricSingleMarking extends InstrumentMarkingBase {
  readonly kind: "volumetric-single-mark";
  readonly nominalVolumeMl: number;
  readonly toleranceMl: number | undefined;
  readonly calibrationTemperatureCelsius: number | undefined;
  readonly accuracyClass: string | undefined;
}
```

All rendering positions must come from `valueToPhysicalPosition(marking, valueMl, geometry)`, whose direction/reference behavior is covered by instrument tests. It is forbidden to use a generic `maximum / majorEvery / index` interpolation as a substitute for a real instrument rule.

### First-wave truth table

| Asset | Source-backed target | Marking semantics | Explicit limitation |
| --- | --- | --- | --- |
| `beaker-250ml` | Griffin 250 mL family; approximately 70 mm OD and 95 mm high; cited 25–200 mL graduation range at 25 mL spacing | `approximate-contained`, wall surface, values increase upward, selected labels | Marks communicate approximate content, not analytical measurement. |
| `erlenmeyer-250ml` | 250 mL Erlenmeyer family; cited 85 mm diameter and 145 mm high | no measurement marking unless individually source-backed | Capacity and geometry do not invent a scale. |
| `acid-burette-25ml` | 25 mL Class AS, Ex at 20 °C, source-backed 0.05 mL interval and down-reading scale | `burette-ex`, tube-wrap, top-zero, values increase downward | Required manufacturer details are source-recorded; no unsupported tolerance/class claim. |
| `alkali-burette-50ml` | separately sourced 50 mL alkali-burette family | `burette-ex` only where source evidence supports it | Acid/alkali differentiation is a real asset identity, not colour-only reuse. |

Every record identifies whether a property is sourced, interpolated, or a labelled pedagogical approximation. A source omission stays omitted; repository code must not fabricate source precision, pressure, calibration class, or manufacturer claims.

## Representation design

### Master-first package shape

Each first-wave asset must be a complete package:

```text
assets/apparatus/<asset-id>/
  master/master.svg
  master/source-record.md
  master/measurement-sheet.json
  master/review.md
  states/
  manifest.json
  license.md
  qa/
```

The master SVG has named, reviewable layers (`glass`, `rim`, `body`, `scale`, `labels`, `stopcock`, `tip`, `acid-marking`/`alkali-marking` where applicable). It is authored from the instrument record, not emitted as an opaque one-shot illustration. The source record states source URL/edition/model, licensed/reference-use posture, dimensions, calibration semantics, exact/approximate classification, and known deviations.

### Compiler boundary

The revised asset tool is a compiler, not an illustrator:

- it validates source records, master layers, hashes, and marking mapping;
- it extracts or references named master geometry and creates bounded LOD derivatives only where approved;
- it may optimize, simplify, or package paths without changing scale values, marking direction, calibration labels, or silhouette landmarks;
- it may not contain generic `beakerGeometry`, `flaskGeometry`, `buretteGeometry`, or generic `graduation` functions.

Path count is diagnostic metadata only. It is never a quality acceptance criterion.

### Family and interaction readiness

The catalogue must model family/variant/size independently of rendering asset identity. Initial catalogue evidence covers at least the first-wave masters plus planned family records for common classroom capacities (beaker 100/250/1000 mL; Erlenmeyer 100/250 mL; graduated cylinder 10/50/100 mL; volumetric flask 50/100/250 mL; acid and alkali burettes). Future M7 interactions may expose detachable parts such as tubing only through `part`, `port`, `region`, and `capability` contracts. M6 does not implement that interaction.

## Learning design

M6 improves the perceptual preconditions for later experimental learning: learners must be able to distinguish approximate contained-volume marks from calibrated delivered-volume markings and recognize family/size/part identity. It does not infer learner state, choose scaffolds, or score technique. ACE must consume later interaction evidence rather than treating an asset selection as evidence of mastery.

## World/event design

- No new chemistry or world-domain event is introduced.
- Existing `VolumeProfileSnapshot` content hash, `ScientificFrame`, profile parser, replay-equivalence hash, and exact snapshot-integrity safeguards remain mandatory regression boundaries.
- If apparatus asset/catalog schema changes, bump only the relevant entry in `contracts/version-manifest.json`, run `pnpm generate:versions`, and consume generated versions. No source, test, asset, SVG, or documentation implementation path may hard-code a distributed release/schema version.
- If a persisted representation schema changes, write explicit migration behavior. `NO_PATH` is preferable to silently resolving historical geometry from mutable current content.

## API and schema changes

- `ApparatusSpecification.marking` becomes `InstrumentMarking | undefined`; legacy `graduation` is removed from the production public surface.
- The asset manifest gains explicit `assetStatus`, named anatomy (`parts`, `ports`, `regions`, `capabilities`), master identity/hash, and source/measurement-record links.
- Runtime scale mapping receives a validated marking plus frozen profile geometry; it must not receive generic graduation numbers or mutable executable geometry.
- Any version change is generated from `contracts/version-manifest.json`. No consumer receives a separately written version literal.

## Privacy and compliance

Asset packages, screenshots, source records, and review artifacts are repository-local. No runtime network fetch, remote image hotlink, learner telemetry, account, or cloud storage is introduced. Source records must document licensing/reference provenance sufficiently to prevent untracked asset copying.

## Failure modes

| Failure | Required response |
| --- | --- |
| Scale direction/range disagrees with cited instrument semantics | Instrument Audit fails; asset cannot be packaged. |
| SVG shape passes schema but lacks named instrument layers | Contract Audit fails. |
| Compiler introduces scale/silhouette primitives not in master | Compiler-source guard fails. |
| Geometry mapping violates `V(h)`/`h(V)` profile or profile hash | Render Geometry Audit fails; replay regression blocks merge. |
| Source precision/calibration is absent | Keep it absent or label as approximation; never invent metadata. |
| Visual review is absent/rejected | M6 remains S2 visual NO-GO. |
| Browser uses prototype/legacy art | Deterministic screenshot/asset-identity test fails. |

## Test plan and acceptance criteria

| ID | Binary criterion | Evidence |
| --- | --- | --- |
| M6-I1 | No production contract or compiler path uses `ApparatusGraduation` or generic silhouette/scale generation. | AST/source guard with negative fixtures. |
| M6-I2 | Each first-wave master has a source record, manifest, named layers, canonical hash, and no unresolved placeholder. | Contract Audit. |
| M6-I3 | Beaker 250 mL marks are 25–200 mL at 25 mL increments, increase upward, and are labelled approximate-contained. | Instrument Audit fixture + rendered master inspection. |
| M6-I4 | Acid 25 mL burette marks are Ex/top-zero/downward/tube-wrap with 0.05 mL source-backed intervals; labels/mark positions follow the mapping. | Instrument Audit fixture. |
| M6-I5 | Alkali 50 mL burette is a distinct asset/record and cannot inherit acid identity by palette substitution. | Catalog/asset identity test. |
| M6-I6 | Flask has source-backed silhouette landmarks and does not fabricate a volumetric marking. | Master measurement-sheet test and review sheet. |
| M6-I7 | Valid frozen profile snapshot produces the same geometry mapping; payload/hash tampering is rejected before executable geometry is created. | Existing World/Representation replay regressions plus M6 integration fixture. |
| M6-I8 | LOD output preserves approved master landmark and scale mapping bounds; path count is reported but never used as pass/fail quality evidence. | Render Geometry Audit. |
| M6-I9 | Required family/variant catalogue records exist without pretending that non-master variants completed visual review. | Catalog breadth test + manifest status check. |
| M6-I10 | Browser screenshots at declared viewports use the approved master identity, derive from ObservableModel, and contain no prototype labels. | Playwright fixtures/screenshots. |
| M6-I11 | Two independent document/code self-audits find no unresolved P0/P1 in instrument semantics, replay identity, version distribution, or asset provenance. | `docs/evidence/M6.md` audit records. |
| M6-S3 | Owner approves visual masters after reviewing the four separate audit packets and deterministic screenshots. | Signed/recorded owner evidence; without it M6 remains S2. |

## Rollout

1. Preserve existing M4/M5 regression behavior while introducing the new contracts behind tests.
2. Replace generic construction only after first-wave master packages and instrument semantics exist.
3. Generate deterministic render evidence and perform two audits before any S3 claim.
4. Record known visual limitations and defer non-master variants, detachable interactions, and strong-acid indicator colour behavior explicitly.

## Open questions

None that block specification. The deliberate owner visual-review decision is an acceptance gate, not an unresolved implementation choice.
