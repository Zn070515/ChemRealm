# M6 Controlled Visual Study Vertical Slice Specification

Status: S1 specified; implementation pending plan and owner review
Authority: M6 Representation Engine; subordinate to `GOAL.md`,
`docs/visual/apparatus-standard.md`, and the accepted M6 hybrid asset-pipeline
contract
Stage: M6 visual production research
Scope: one 250 mL Griffin beaker only

## Context

The current Blender vertical slice proves that ChemRealm can build, validate,
and render a 250 mL Griffin beaker with a reproducible headless job and a GPU
review backend. It does not yet prove that the visual language is good enough
for a Gold Master. The current candidate still reads partly as a technical
prototype: its silhouette, spout transition, glass treatment, and lighting
have not been selected through an art-directed comparison process.

The repository already has strong negative constraints: assets must not own
chemistry or world truth; visual state must derive from Observable contracts;
physical geometry must remain compatible with a frozen profile; and M6 must not
silently promote prototype art. What is missing is a positive reference system
that teaches an agent what a successful ChemRealm apparatus should look like.

Public reference research establishes two different responsibilities:

- Manufacturer references provide source-backed physical cues. The Corning
  250 mL heavy-duty Griffin reference lists approximately 74.3 mm outside
  diameter, 90 mm height, 25 mL graduation increments, a spout, a double
  graduated scale, and ASTM E-960 as a reference standard.
  [Corning product record](https://ecatalog.corning.com/life-sciences/b2c/US/en/General-Labware/Beakers/Beakers%2C-Glass/PYREX%C2%AE-Beakers%2C-Griffin%2C-Heavy-Duty%2C-Graduated/p/1003-250)
- NOBOOK public material establishes a quality and interaction benchmark for a
  coherent virtual laboratory: discoverable apparatus, drag-and-drop setup,
  connection, manipulation, reading, and free-form experimentation. It does
  not authorize copying NOBOOK artwork, assets, branding, or implementation.
  [NOBOOK public product description](https://www.nobook.com/view/146)

This specification creates a controlled visual-search stage before any new
Gold Master claim. It does not replace the existing hybrid package or create a
parallel asset architecture.

## Goal

1. Establish a source-indexed positive visual reference Bible for ChemRealm
   glassware, lighting, composition, and the Griffin beaker.
2. Produce reproducible, GPU-backed contact sheets for three controlled study
   rounds:
   - Form: 3–4 geometry candidates using neutral/clay presentation;
   - Glass: 4 material treatments with geometry and lighting fixed;
   - Lighting: 3 lighting/reflection-card rigs with geometry and material fixed.
3. Make every candidate explainable as source-backed physical structure,
   declared visual approximation, or rejected treatment.
4. Produce an A/B evidence package comparing the current rejected SVG with the
   Blender study baseline under matched framing and backgrounds.
5. Preserve the current vertical slice as an implementation baseline while
   determining whether a selected study combination is worth promoting to a
   future Gold Master candidate.

## Non-goals

- Do not declare a Gold Master or M6 S3 from this work alone.
- Do not build a complete Blender/MCP platform or ChemRealm-owned MCP server.
- Do not install or depend on third-party Blender MCP tooling.
- Do not batch-generate other beakers, flasks, burettes, or apparatus families.
- Do not create a generic apparatus generator.
- Do not change Scientific Reality, World Runtime, Observable contracts,
  `VolumeProfileSnapshot`, chemistry, optical indicator science, or ACE.
- Do not create liquid, indicator, concentration, or reaction colours in the
  static beaker study.
- Do not copy NOBOOK screenshots, models, textures, branding, or proprietary
  implementation. External references are indexed and analyzed, not silently
  embedded as production art.
- Do not make EXR or CPU rendering mandatory without evidence that the study
  requires it.

## User experience

This stage has no learner-facing runtime change. Its human-facing output is a
reviewable set of contact sheets and close-ups in which an owner can compare
form, glass, and lighting choices without guessing which variable changed.

The intended future result is a beaker that remains recognizable and legible at
full-size, thumbnail, light-neutral, dark-neutral, and transparent-background
views without relying on a crude colored outline or a uniform blue body fill.

## Architecture

### Core ownership

| Concern | Owner | Rule |
|---|---|---|
| Physical identity and dimensions | existing apparatus source record / Representation Engine contract | Study variants may not alter source-backed dimensions without declaring a visual approximation or a source correction |
| World volume and `V(h)` | World/Representation boundary | Blender only reads a verified snapshot when one is provided; it never invents a profile |
| Scientific state and optical chemistry | Scientific Reality Core | No chemistry is authored, inferred, or baked into the study |
| Static pixels, geometry studies, materials, lighting | M6 asset production workflow | Every candidate has a study ID and provenance record |
| Runtime state and dynamic layers | Observable / Representation Engine | Out of scope for this study except preservation of current package boundaries |
| Review selection | project owner | An agent may present candidates and analysis but must not self-promote a candidate |

### Data flow

```text
physical/source records + visual reference register
        -> study job configuration
        -> Blender source/build
        -> GPU render matrix and contact sheets
        -> structural/semantic QA
        -> human visual review
        -> optional future Gold Master candidate
```

The study job is another invocation path for the existing Blender backend. It
must remain runnable without MCP, a browser, or a network connection after its
referenced source records are present locally.

### Study isolation

Study outputs live under a dedicated study QA/output area and must not replace
the current `source/blender/beaker-250ml.blend`, rejected SVG, or canonical
vertical-slice render evidence. A selected result is copied or promoted only in
a later, explicitly reviewed change.

## Scientific design

This specification adds no scientific model.

- The beaker's capacity, dimensions, graduations, and profile identity remain
  explicit source-backed facts.
- A study may show an empty apparatus only. It must not encode a liquid level,
  pH, indicator spectrum, concentration, or reaction state.
- Glass colour, edge tint, reflection cards, refraction, and highlight strength
  are empirical visual treatments, not measurements of the optical model.
- If a future study consumes `VolumeProfileSnapshot`, it must validate the
  existing snapshot identity and never regenerate or mutate it.
- A declared visual approximation must not be presented as a corrected
  physical measurement.

## World/event design

No authoritative event, world snapshot, branch, replay, or persisted schema is
changed by this stage. Render jobs consume existing records and produce
disposable study evidence.

No pointer gesture, camera move, render frame, or art-study choice is a World
Runtime event. Owner preference is review metadata, not scientific world truth.

## Representation design

### Positive visual reference Bible

The first implementation adds a reference index under
`docs/visual/reference/`. It must distinguish:

1. source-backed apparatus observations;
2. ChemRealm visual principles;
3. references that are useful only for lighting/material study;
4. rejected treatments and why they fail.

Each reference entry records, where applicable:

- stable source URL or local source record;
- publisher/author and access date;
- license/usage status and whether the image is embedded, linked, or only
  described;
- use for;
- do not copy;
- observed structure or visual behavior;
- relevance to light/dark/thumbnail views;
- whether the observation is source-backed, empirical, or ChemRealm-specific.

The Bible must include focused guidance for glass, lighting/reflection cards,
composition/framing, 250 mL Griffin form, and rejected prototype patterns.

### Controlled studies

#### Round 1 — Form Study

- fixed orthographic camera and review framing;
- neutral/clay material with no glass trickery;
- 3–4 asset-specific candidates;
- only silhouette, rim, wall/base transition, spout continuity, and visual mass
  may vary;
- physical envelope and source-backed dimensions remain constrained;
- every candidate receives a study ID and a short rationale.

#### Round 2 — Glass Study

- one owner-selected or explicitly provisional form;
- fixed camera, background, and lighting;
- four material treatments from near-neutral scientific illustration to
  controlled educational edge readability;
- no liquid or indicator colour;
- compare full-size, thumbnail, light, dark, and transparent views.

#### Round 3 — Lighting Study

- one fixed form and one fixed glass treatment;
- three lighting/reflection-card rigs;
- compare rim, spout, wall, base, graduation readability, dark/light behavior,
  thumbnail behavior, and whether highlights become plastic-like or theatrical.

The job must prevent accidental multi-variable changes. Each study manifest
records the inherited geometry/material/lighting IDs and the one dimension that
is intentionally varied.

### Render backend

The current central toolchain remains authoritative. GPU OptiX is the preferred
interactive/review backend on the available RTX 4090; CPU remains an explicit
fallback. Geometry, semantic identity, configuration, and QA determinism are
separate from rendered-pixel reproducibility. Pixel comparisons use declared
tolerance or perceptual review; equal PNG hashes are not treated as proof of
visual correctness across backends.

## Learning design

There is no learner-facing learning behavior in this stage. The review process
must nevertheless preserve the mature product's visual learning goals:
apparatus identity, readable measurement cues, progressive disclosure, and
unobstructed experimental state. A visually attractive study that hides a
graduation, rim, spout, or later interaction affordance fails the visual
direction even if its render is polished.

## Privacy and compliance

- No learner data, account, telemetry, or world event is used.
- Local Blender jobs must not upload source files, renders, or reference data.
- External web research is recorded as source links and provenance metadata;
  downloaded third-party images are not silently committed as production art.
- The study may use public product images for private visual analysis only when
  the source record and usage status are explicit; production exports must be
  independently authored.

## API/schema changes

This stage introduces no runtime scientific, world, or public application API.

The study job is located at:

```text
tools/blender/jobs/beaker-250ml-griffin/studies/
  study.json
  build.py
  render.py
  validate.py
```

Each study writes only to:

```text
assets/apparatus/masters/beaker-250ml/qa/blender-studies/<studyId>/
```

The existing vertical-slice source and QA directories are read-only inputs for
this stage. A study manifest must reference existing source records by
repository-relative path and SHA-256 rather than copying physical values into
an untracked second manifest. Render outputs, contact sheets, validation JSON,
and review notes are all children of the study output directory.

It adds a study-job metadata contract with at least:

```json
{
  "studyId": "beaker-250ml-griffin-form-v1",
  "assetId": "beaker-250ml-griffin",
  "round": "form",
  "candidateId": "F03",
  "inherits": {
    "geometry": null,
    "glass": "clay-neutral",
    "lighting": "review-neutral"
  },
  "intentionalVariable": "spout-transition",
  "sourceInputs": [],
  "outputs": [],
  "status": "candidate"
}
```

`round` is one of `form`, `glass`, or `lighting`; `candidateId` is unique
within the study; `intentionalVariable` is required and must match the round's
allowed variable set. `sourceInputs` contains repository-relative paths and
hashes. `outputs` is populated only after a successful render/validation run.
No study status may be interpreted as a Gold Master or S3 status.

## Failure modes

| Failure | Required behavior |
|---|---|
| Missing source-backed physical input | fail the study job; do not invent a dimension |
| Missing Blender/toolchain identity | fail before rendering |
| Unresolved external dependency | fail QA; do not silently substitute |
| Study changes multiple controlled variables | fail metadata/QA review |
| A candidate contains liquid/chemistry state | reject the candidate as out of scope |
| Profile reference is missing or mismatched | defer profile validation or fail; never synthesize a profile |
| GPU backend differs in pixels | report backend/tolerance evidence; do not claim pixel identity |
| Reference image license/status is unknown | link and describe only; do not embed or ship it |
| Candidate looks polished but violates silhouette/legibility | remain rejected; visual polish cannot override contract failure |

## Test plan

### Structural and job tests

- every candidate has a unique study ID and candidate ID;
- each round has exactly one declared intentional variable;
- inherited geometry/material/lighting IDs are present and valid;
- duplicate IDs, missing outputs, unresolved dependencies, and missing toolchain
  identity fail with non-zero exit status;
- existing M6 asset guards continue to pass.

### Source and boundary tests

- physical dimensions are loaded from existing source records, not duplicated
  as untracked constants;
- profile identity, when supplied, is read and verified rather than rebuilt;
- no study output contains a scientific liquid or indicator state;
- no runtime/API package is modified by the study job.

### Render tests

- fixed orthographic framing is present;
- form, glass, and lighting matrices cover their required light/dark and
  thumbnail/full-size views;
- transparent export is present for the selected matrix where configured;
- metadata records Blender version/build, backend, color management, resolution,
  source hashes, and output hashes;
- GPU repeat and CPU comparison use declared tolerances and are reported as
  evidence, not hidden.

### Human visual review

Each contact sheet must be reviewed against the positive Bible and the current
rejected SVG. The review records:

- silhouette and physical recognizability;
- rim, spout, wall, and base readability;
- glass depth cues without uniform candy tint;
- graduation hierarchy;
- light/dark and thumbnail robustness;
- prototype/icon failure modes;
- selected direction and rejected directions with reasons.

## Acceptance criteria

| Criterion | Required evidence |
|---|---|
| Reference Bible exists and distinguishes source facts, observations, approximations, and rejects | reference files + source register review |
| Form study is single-variable and reproducible | form manifest, contact sheet, QA JSON, headless command |
| Glass study is single-variable and reproducible | glass manifest, contact sheet, QA JSON, headless command |
| Lighting study is single-variable and reproducible | lighting manifest, contact sheet, QA JSON, headless command |
| Physical and scientific ownership boundaries remain intact | boundary QA + existing M6 guards |
| GPU review is used without claiming cross-backend pixel identity | render metadata + repeat/tolerance report |
| Rejected SVG and Blender baseline are compared under matched views | A/B contact sheets + comparison report |
| No candidate is falsely promoted to Gold Master | evidence packet explicitly remains M6 S2/prototype |
| The output is reproducible without MCP | clean headless rebuild succeeds |
| Owner can select a visual direction from the evidence | review record with candidate choice or explicit “not selected” |

## Rollout and migration

No persisted world or runtime schema migration is required. Study outputs are
new evidence artifacts. The current vertical slice remains the baseline until
an owner-approved future change explicitly promotes a selected study result to
the asset package.

The study job must be additive. Removing or replacing the rejected SVG is out
of scope. A future Gold Master promotion must repeat asset package QA,
profile-boundary QA, browser/Observable integration, and owner review.

## Open questions

- Which form candidate, glass treatment, and lighting rig will the owner select?
- Does the selected direction require an authored editable Blender source to be
  committed, or can a frozen source/export bundle be sufficient?
- Does the selected result need a persistent VolumeProfileSnapshot for its
  runtime integration, or should that remain a later composition concern?
- Which named visual operations recur often enough to justify future MCP/addon
  design? This is intentionally deferred until after the study.

## Evidence boundary

Passing this specification's tests means the visual-search experiment is
reproducible and reviewable. It does not mean:

- the Blender candidate is a Gold Master;
- the asset is admitted to M7;
- the visual style is final;
- the runtime composition is complete;
- Blender MCP is justified;
- all apparatus variants are covered.
