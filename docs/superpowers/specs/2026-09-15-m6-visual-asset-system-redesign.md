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
density as a benchmark, not copying or claims about NOBOOK internals.

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
- no NOBOOK/vendor asset, screenshot, layout or distinctive expression reuse;
- no catalog editor/search/player UI;
- no broad M7 interaction implementation;
- no strong-acid phenolphthalein orange implementation;
- no claim that catalog count equals mature product completeness.

## User experience

Users should recognize a burette, beaker, Erlenmeyer flask, graduated cylinder
and volumetric flask by silhouette and functional structure before reading a
label. They should see why a 25 mL burette differs from a 100 mL burette, why a
beaker has a spout, and where a tube or stopper can connect. Liquid, meniscus,
scale, readout and optical refusal remain legible without implying chemistry
not supplied upstream.

The first page remains a read-only committed-world presentation. M6 does not
turn the page into a catalog editor or persist pointer movement. Future M7
commands consume the same parts/ports/capabilities instead of inventing a
second interaction model.

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
apparatus data. Visual assets cannot change amount or volume.

## World/event design

No WorldState, DomainEvent or persisted schema change is introduced. Parts and
ports are future command inputs, not events. M6 pointer gestures are absent or
renderer-local and cannot mutate history. Existing profile/content hashes and
snapshot integrity remain authoritative.

## Representation design

The detailed contract is [`m6-art-direction.md`](../../visual/m6-art-direction.md).
The existing `ApparatusSpecification` is extended, where needed, with typed
anchors, hit regions, capabilities and state coverage. A normalized geometry
signature tests visible variant differences; labels alone do not qualify.

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
   direction and family construction markers.
4. Render tests prove Pixi consumes only RenderState and dynamic values come
   from Observable output.
5. Fixtures cover empty, loaded, selected, refusal and supported observation
   states where declared.
6. Interaction tests prove traceability without creating World events.
7. Browser captures cover all four named viewports and accessible readouts.
8. Two independent audits compare code, catalog, SVG, screenshots, standard,
   research and prior M4/M5/world/replay/optical/quantity invariants.

## Acceptance criteria

| Criterion | Binary requirement | Required evidence |
|---|---|---|
| M6-VISUAL-SYSTEM | Art direction, layers, family rules and forbidden patterns are applied | spec review + QA |
| M6-FAMILY-VARIANTS | Required specifications have ≥3 visible normalized geometry differences | catalog signature test + comparison sheet |
| M6-STRUCTURE | Core vessels expose correct rims, bases, mouths, spouts, scales, stopcocks and calibration marks | asset tests + owner review |
| M6-STATE | Declared state variants are traceable to Observable/RenderState or explicitly unsupported | fixture/source review |
| M6-INTERACTION | Parts, ports, anchors, hit regions and capabilities are explicit and compatible | catalog/interaction tests |
| M6-MATERIAL | Glass, liquid, metal, rubber, shadow and highlight language is coherent and non-cartoon | four screenshots + owner review |
| M6-RENDER | Pixi remains RenderState-only and chemistry-blind | dependency/source guards |
| M6-REPLAY | Geometry/profile identity and hash boundaries remain intact | world/profile/replay suite |
| M6-ACCESSIBILITY | DOM readouts, names, focus targets and contrast work at all viewports | browser/accessibility evidence |
| M6-PRIVACY | No external asset/network/telemetry behavior is added | artifact/network checks |
| M6-S2 | Local evidence passes while visual owner acceptance remains explicit | M6 packet |
| M6-S3 | All P0/P1 visual gates, owner review, reproducible baseline and accessibility/originality evidence pass | final matrix |

## Rollout/migration

The remediation is a Representation Engine/catalog update and remains compatible
with existing World/Event/Scientific schemas. A geometry change that alters
persisted profile meaning requires the existing profile/content-hash migration;
a visual refresh must not silently reinterpret a historical world.

## Open questions

Deferred until the visual system exists: the first M7 connect/detach command,
later Canvas/SVG/WebGL/WASM acceleration choices, and which flow/gas/precipitate/
thermal states receive scientifically modelled effects.

