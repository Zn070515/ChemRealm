# M6 Visual Asset System Remediation

**Status:** M6 S1 specified; implementation requires the companion plan and
does not claim M6 S3.

**Authority:** subordinate to `GOAL.md`, `SPEC-0001`, ADR-0006, ADR-0013,
`docs/visual/apparatus-standard.md` and
`docs/visual/m6-art-direction.md`.

## Context

The first M6 slice established typed apparatus specifications, profile identity,
detachable metadata, RenderState-only Pixi drawing and local asset packaging.
A visual audit found that technical package checks are not equivalent to a
professional apparatus system: family proportions, material language, capacity
variants, state variants and interaction geometry are not yet governed by one
production method.

The research record combines official NOBOOK surface/API evidence, Zhejiang
chemistry-examination pressure, education-equipment standards, manufacturer
anchors and virtual-lab learning research. It supports clarity and affordance
density as a benchmark, not copying or claims about NOBOOK internals. The
binding visual standard separately defines permitted pattern learning,
  orthographic-camera experiment worlds, strict frontal measurement views,
  non-measurement 2.5D previews, size-class/LOD token ranges, forbidden visual
  patterns and source-backed geometry variation.

## Goal

1. Establish one reviewable art-direction and asset-package contract for M6.
2. Produce original gold-standard families with visibly meaningful
   specification differences.
3. Make parts, ports, anchors, hit regions, capabilities and state coverage
   explicit and traceable.
4. Preserve accepted Scientific Reality, World Runtime, replay, optical,
   quantity, identity and central-version invariants.
5. Assemble binary visual, geometry, accessibility, provenance and responsive
   evidence without claiming S3 before owner review.

## Non-goals

- no chemistry, optical, WorldState, DomainEvent, replay or persistence change;
- no NOBOOK/vendor asset, screenshot, exact layout or distinctive expression
  reuse;
- no catalog editor/search/player UI implementation; only the future surface
  mode boundary is specified;
- no broad M7 interaction implementation;
- no strong-acid phenolphthalein orange implementation;
- no claim that catalog count equals mature product completeness.

NOBOOK may inform broad product patterns—catalog discoverability, a dominant
experiment stage, separated inspection, reusable parts, legible feedback and a
denser editor surface beside a clean demo/player surface. It may not supply
assets, screenshots, icons, exact panel positions or widths, toolbar order,
card system, distinctive interaction choreography, recognizable full-scene
composition or pixel-level details. All geometry and visual identity must be
original and source-recorded.

## User experience

Users should recognize a burette, beaker, Erlenmeyer flask, graduated cylinder
and volumetric flask by silhouette and functional structure before reading a
label. They should see why a 25 mL burette differs from a 100 mL burette, why a
beaker has a spout, and where a tube or stopper can connect. Liquid, meniscus,
scale, readout and optical refusal remain legible without implying chemistry
not supplied upstream.

The first page remains a read-only committed-world presentation. M6 does not
turn the page into a catalog editor or persist pointer movement. The asset
contract nevertheless names five future/present surface modes so a later UI
does not create a second geometry contract:

| Mode | Projection | Measurement-qualified | M6 role |
|---|---|---:|---|
| `experiment-world` | fixed orthographic camera with bounded 2.5D cues | no by default | read-only process composition |
| `measurement` | strict frontal orthographic/side elevation | yes | scale, meniscus and calibration evidence |
| `catalog-preview` | bounded 2.5D | no | future discovery and variant comparison |
| `inspector` / `construction` | bounded 2.5D | no | parts, ports, actuator and QA inspection |
| `demo-player` | orthographic world presentation | only through an explicit measurement subview | future clean demonstration surface |

Future M7 commands consume the same parts/ports/capabilities instead of
inventing a second interaction model.

The required burette variants are mechanically distinct:

| Type | Specification | Actuator |
|---|---|---|
| acid burette | 25 mL, `burette-acid-25ml-class-as` | glass/PTFE `rotary-valve` |
| alkali burette | 50 mL, `burette-alkali-50ml-class-b` | rubber tube/bead `pinch-valve` |
| v0/other declared type | 100 mL, `burette-v0-100ml` | explicitly named mechanism; no implied stopcock |

The catalog must also carry the remaining required capacity families and
detachable tube/stopper/connector parts defined by the binding art direction.

## Architecture

This is a Representation Engine change:

```text
World Runtime + Scientific Reality
  → ScientificFrame / ObservableModel
  → renderer-neutral RenderState
  → validated asset package and visual policy
  → Pixi + DOM presentation
```

The renderer remains blind to Sci/World packages. Catalog validation is pure
representation logic. A visual state may show an optical refusal but cannot
infer acid/base/species from a material name.

## Scientific design

M6 does not change equations, constants, activity conventions, optical models,
molality/molarity boundaries or domain refusal. A color is either a neutral
material token or an upstream `OpticalObservation`; indicator-specific empirical
palettes are source-labelled representation records, not equilibrium logic.

Geometry is scientific-adjacent representation: capacity, `h(V)`, `V(h)`,
graduations and reading direction remain consistent with frozen profile and
apparatus data. Visual assets cannot change amount or volume. Phenomena such as
liquid, bubbles, precipitate, gas, thermal cues and optical appearance are
state/effect overlays over reusable apparatus geometry; they are not copied
into chemistry-specific vessel masters.

## World/event design

No WorldState, DomainEvent or persisted schema change is introduced. Parts and
ports are future command inputs, not events. M6 pointer gestures are absent or
renderer-local and cannot mutate history. Existing profile/content hashes and
snapshot integrity remain authoritative.

## Representation design

The detailed contract is [`m6-art-direction.md`](../../visual/m6-art-direction.md).
The existing `ApparatusSpecification` is extended, where needed, with typed
anchors, hit regions, capabilities, state coverage and `ApparatusActuator`
records. Acid and alkali burettes have distinct actuator kinds and future
command intents. A normalized geometry signature tests visible variant
differences; labels alone do not qualify. Every changed geometry parameter is
linked to a provenance class (`reported`, `manufacturer-anchor`,
`standard-family` or `approximate-visual`) and its source or rationale.

The production unit is an asset package with master, state variants, manifest,
source/license records, QA and deterministic fixture. Visual and interaction
geometry are separate records linked by part ID. Runtime executable profiles are
constructed only from validated content-addressed snapshots.

## Learning design

M6 makes apparatus and state legible for future prediction, operation,
comparison and inspection. It does not claim that viewing polished assets is
learning evidence. ACE remains outside this change and cannot modify scientific
or visual state to make a task easier.

## Privacy/compliance

All masters, manifests and runtime code are bundled locally. Source URLs are
static audit metadata and are never fetched by the browser. No account,
identity, telemetry, cloud sync, public upload or behavioral tracking is added.
Originality and licensing remain recorded in every asset package.

## API/schema changes

Planned Representation Engine additions are:

- geometry signatures for normalized family comparison;
- typed anchors and hit regions linked to parts;
- capability and state-coverage records;
- family-level visual-token and construction-template identity;
- deterministic size-class/LOD selection for master, scene, preview and
  thumbnail surfaces;
- explicit experiment-world, measurement, catalog-preview, inspector and
  construction view-mode metadata;
- dual-background QA records for dark and light neutral conditions;
- deterministic fixture and visual-QA references.

The active version remains distributed only from
`contracts/version-manifest.json`. These additions must not duplicate
ScientificState, WorldState, chemistry constants or event semantics.

## Failure modes

- duplicate or unresolved part/port/anchor IDs fail validation;
- incompatible connection kinds fail before a future command is built;
- identical normalized geometry under a new label fails the variant test;
- missing state coverage is reported unsupported, never invented;
- optical refusal cannot receive a fallback chemical swatch;
- profile/hash mismatch rejects executable geometry;
- an acid/alkali actuator mismatch rejects the apparatus command mapping;
- a measurement value supplied by a non-measurement 2.5D view fails the view
  contract;
- a preview/thumbnail that changes semantic dimensions, profile identity or
  actuator kind fails LOD validation;
- a geometry difference without provenance or an explicit approximation rationale
  fails the package review;
- out-of-bounds interaction geometry fails QA;
- Sci/World renderer imports, network access or active version literals fail
  existing guards;
- any visual P0/P1 failure keeps M6 at S2 and blocks M7 authorization.

## Test plan

Tests must be written before each implementation change and observed failing.

1. Catalog tests cover family multiplicity, normalized geometry differences,
   detachable parts, ports, anchors, hit regions, capabilities and compatibility.
2. Asset tests cover layers, bounds, no external references, provenance,
   license and central version source.
3. Geometry tests cover profile round-trip, liquid clipping, graduation
   direction, family construction markers and profile-preserving LOD variants.
4. Render tests prove Pixi consumes only RenderState and dynamic values come
   from Observable output.
5. Fixtures cover empty, loaded, selected, refusal and supported observation
   states where declared.
6. Interaction tests prove traceability without creating World events.
7. Browser captures cover all four named viewports and accessible readouts.
8. Physical-scale and normalized-shape comparison sheets cover every family
   variation and list changed parameters with source/rationale.
9. Size-class and thumbnail tests cover identity-defining features at small
   rendered heights; dual-background captures cover dark and light neutral
   conditions.
10. Two independent audits compare code, catalog, SVG, screenshots, standard,
   research and prior M4/M5/world/replay/optical/quantity invariants.

## Acceptance criteria

| Criterion | Binary requirement | Required evidence |
|---|---|---|
| M6-VISUAL-SYSTEM | Art direction, layers, family rules and forbidden patterns are applied | spec review + QA |
| M6-GOLD-MASTER | Acid/alkali burettes, 100/250/1000 mL beakers and 100/250/500 mL Erlenmeyer flasks pass owner review at full and thumbnail size on dark/light neutral backgrounds | Gold Master captures + owner review |
| M6-FAMILY-VARIANTS | Required specifications have ≥3 visible normalized geometry differences | catalog signature test + comparison sheet |
| M6-LOD | Master, scene, preview and thumbnail retain semantic identity while reducing detail deterministically | LOD manifest/tests + captures |
| M6-STRUCTURE | Core vessels expose correct rims, bases, mouths, spouts, scales, stopcocks and calibration marks | asset tests + owner review |
| M6-VIEW-MODE | The experiment world uses bounded orthographic 2.5D cues; quantitative evidence uses strict frontal measurement presentation; other 2.5D views are explicitly non-measurement | view-mode contract + captures |
| M6-STATE | Declared state variants are traceable to Observable/RenderState or explicitly unsupported | fixture/source review |
| M6-INTERACTION | Parts, ports, anchors, hit regions, capabilities and actuator intents are explicit and compatible | catalog/interaction tests |
| M6-MATERIAL | Glass, liquid, metal, rubber, shadow and highlight language is coherent, size-class/LOD token-bounded, dual-background legible and non-cartoon | token QA + full/thumbnail dual-background captures + owner review |
| M6-PROVENANCE | Every changed geometry parameter has a citable source class or explicit approximate-visual rationale | manifest/source records + comparison sheets |
| M6-ACTUATOR | Acid and alkali burette mechanisms map to distinct future command intents | catalog/actuator tests |
| M6-RENDER | Pixi remains RenderState-only and chemistry-blind | dependency/source guards |
| M6-REPLAY | Geometry/profile identity, LOD identity and hash boundaries remain intact | world/profile/replay/LOD suite |
| M6-ACCESSIBILITY | DOM readouts, names, focus targets and contrast work at all viewports | browser/accessibility evidence |
| M6-PRIVACY | No external asset/network/telemetry behavior is added | artifact/network checks |
| M6-S2 | Local evidence passes while visual owner acceptance remains explicit | M6 packet |
| M6-S3 | Gold Master families pass all P0/P1 visual gates, owner review, reproducible full/thumbnail dual-background baseline and accessibility/originality evidence | final matrix |

## Rollout/migration

The remediation is a Representation Engine/catalog update and remains compatible
with existing World/Event/Scientific schemas. A geometry change that alters
persisted profile meaning requires the existing profile/content-hash migration;
a visual refresh must not silently reinterpret a historical world.

## Open questions

Deferred until the visual system exists: the first M7 connect/detach command,
later Canvas/SVG/WebGL/WASM acceleration choices, and which flow/gas/precipitate/
thermal states receive scientifically modelled effects. Strong-acid
phenolphthalein orange remains documented but is not implemented in this M6
visual package.
