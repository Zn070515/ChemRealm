# M6 Final-quality apparatus slice

**Status:** M6 S1 specified / implementation authorized; not M6 S3.

**Authority:** subordinate to `GOAL.md`, `SPEC-0001`, ADR-0006, ADR-0013,
`docs/visual/apparatus-standard.md`, and the M6 entry gate. The NOBOOK/web
research brief is evidence-informed guidance, not a replacement for those
contracts.

## Context

M4 scientific reality and M5 world-to-observable composition are accepted.
The web currently has a deterministic DOM inspection surface, but no concrete
final-quality apparatus renderer or asset package. M6 is the first point at
which ChemRealm may turn the frozen observable output into an original,
reviewable experiment view.

The local NOBOOK research identifies the important product lesson as a system
of reusable objects, state legibility and separate information surfaces. The
current public NOBOOK integration API confirms independent equipment, settings,
player and information surfaces, but does not prove its internal scientific
implementation. PhET research and virtual-lab literature further constrain the
slice: visual interactivity should support observation and inquiry, not be
mistaken for learning evidence.

## Problem

Without an actual final-quality view, ChemRealm cannot test whether its
scientific state remains readable when represented as glass, liquid, meniscus,
graduations, apparatus relationships and inspection data. A one-off image or
DOM-only mock would hide the geometry, asset and renderer seams that M6 is
intended to validate.

## Goal

1. Deliver one original, deterministic titration-bench asset family containing
   a burette, conical flask, stand/clamp and supporting beaker as semantic
   asset records plus a vector/2.5D master.
2. Add a PixiJS v8 renderer adapter that consumes only `RenderState`; all
   chemistry, volume-to-height conversion, indicator optics and text values
   remain upstream.
3. Mount the renderer from the existing committed-world composition and keep
   the DOM inspection/readout surface synchronized with the same frame.
4. Make the apparatus legible at `desktop-primary`, `desktop-compact`,
   `tablet` and `narrow` logical viewports, with no third-party network access.
5. Produce deterministic unit, browser and visual-capture evidence while
   retaining an honest M6 S2 boundary until owner visual review is complete.

## Non-goals

- No new chemistry, solver, equilibrium, optical profile or strong-acid-orange
  implementation.
- No M7 world-mutating pointer interaction, drag commit, snap event, undo or
  live titrant delivery. M6 may expose semantic hit-region metadata and a
  non-mutating focus/inspection affordance only.
- No full NOBOOK-like catalog, search engine, material authoring studio or
  hundreds of assets.
- No ACE, learner inference, account, telemetry, cloud sync or server.
- No runtime fetching of fonts, textures, models or external references.
- No use of generated imagery as a source of graduations, units, liquid levels,
  chemical colour or geometry truth.

## User experience

The page presents a world-dominant titration bench with an original
orthographic side elevation. A separate inspection panel exposes the committed
world identity, sequence, scientific backend, one selected pH convention,
liquid level, burette scale reading and optical status in DOM text. The canvas
is a visual representation of the same `RenderState`; it is not the only way
to obtain scientific information.

The apparatus is intentionally not a catalog/editor/player bundle in this
slice. This follows the NOBOOK finding that those surfaces have different
information-density responsibilities. M6 supplies the reusable visual object
and presentation surface; catalog discovery and committed interaction remain
later work.

## Core ownership

| Concern | Owner | Contract |
|---|---|---|
| Chemistry, optical observation, validity | Scientific Reality Core | Existing M4/M4-B adapters and M5 frame inputs |
| Committed world and event history | World Runtime | Existing event log, replay and state identity |
| Observable/scene data and apparatus visual package | Representation Engine | `ObservableModel`, `RenderState`, asset manifest, Pixi adapter |
| Page composition and policy selection | ACE boundary / web composition root | Existing `apps/web`; no learner inference in M6 |

The Pixi module may inspect node ids and generic render data, but may not import
`@chemrealm/sci` or `@chemrealm/world`, parse `Ka`/pH to make decisions, or
resolve `geometryRef` from mutable content.

## Scientific design

M6 adds no scientific model. Liquid height comes from the M5 frame-owned
`VolumeProfileSnapshot` and upstream `h(V)` result. Indicator tint, when
available, comes from the tagged optical observation already placed in
`RenderState`; an optical refusal produces no invented chemical tint. Glass,
chrome, neutral background and non-chemical material tokens are renderer
materials, not chemistry conclusions.

The default production composition remains the source-bounded optical refusal
at its existing temperature. M6 must show that refusal textually and must not
replace it with a pink/orange swatch.

## World/event design

No WorldState, DomainEvent or persisted schema changes are required. The
renderer is mounted after the existing production composition has replayed its
committed log and built a `ScientificFrame`. Animation time, if introduced for
subtle presentation later in M6, is renderer-local and excluded from event
history and hashes. This round starts with a deterministic static frame.

## Representation design

### Asset package

The first package contains original vector master geometry, preview/reference
art, deterministic state layers, a manifest, source record, license record and
QA instructions. The manifest declares:

- asset identity resolved from the central version manifest;
- `coordinateUnit: "mm"`;
- fixed orthographic view and dimensions;
- parts, ports, interaction regions and capabilities;
- volumetric status and the existing profile identity;
- accessibility label and visual-family identity.

The active version is read from `contracts/version-manifest.json` through the
generated schema manifest. It is not repeated as a new manually maintained
production constant in renderer code.

### Renderer

PixiJS v8 is an adapter below `RenderState`. It creates an asynchronous
application, fits a fixed logical scene to its host, draws the original
apparatus layers and keeps text/readouts in the DOM companion surface. The
renderer uses one light direction, glass tint, highlight side and stroke family
for the asset family. Runtime text, graduations, liquid height and meniscus are
drawn from render data rather than baked into the master.

### Surface separation

M6 exposes a presentation/inspection composition only. It does not collapse the
future Catalog Drawer, Property Editor, Entity Inspector and World Inspector
into a single permanent side rail. The existing DOM inspection panel remains a
read-only audit surface, while the canvas is world-dominant.

## Learning design

No ACE state or learning evidence is added. The visual slice supports future
prediction/operation/observation cycles by making apparatus state and readouts
legible, but M6 does not claim that viewing or dragging teaches a concept.

## Privacy/compliance

The renderer bundles all code and vector assets. It adds no network, identity,
storage, telemetry, cloud or third-party font/texture behavior. Existing
artifact and browser network gates remain mandatory. The surface may be used by
minors but does not collect learner data.

## API/schema changes

- Add one representation asset-version field to the central version manifest;
  generated version output remains the only code distribution of that value.
- Add typed M6 apparatus manifest data and a `toTitrationRenderState(...)`
  helper that extends the existing generic scene with apparatus nodes.
- Add a `@chemrealm/render/pixi` subpath exposing a mount/update/destroy adapter
  that accepts `RenderState` only.
- Add no World/Event/Scientific persisted schema or migration.

## Failure modes

- A Pixi initialization failure shows a visible DOM error while retaining the
  inspection surface; it never substitutes a chemistry result.
- A malformed asset manifest fails validation before an executable profile or
  scene is built.
- A missing optical tint remains a tagged refusal; the renderer uses no
  indicator endpoint fallback.
- A mismatched RenderState node or asset id is ignored or rejected explicitly,
  never interpreted as a chemistry instruction.
- A narrow viewport keeps the logical scene fitted and keeps DOM readouts in
  document flow; it does not depend on canvas pixels for essential information.
- Any future interaction must emit a World command at the composition boundary;
  a pointer event must not mutate the renderer's copy of truth.

## Test plan

1. Asset manifest tests verify units, dimensions, parts, ports, capabilities,
   original-package metadata and the existing profile identity.
2. Render-state tests verify the apparatus nodes are derived from the same
   `ObservableModel` and preserve the existing pH/optical refusal semantics.
3. Pixi browser tests verify the canvas mounts from built output, uses the
   expected logical aspect, keeps the DOM readouts, and introduces no external
   request.
4. Named viewport tests cover 1440×900, 1280×720, 1024×768 and 768×1024. The
   first round records deterministic captures; owner visual review remains a
   separate gate.
5. A renderer-boundary static/depcruise check proves the Pixi adapter imports
   `RenderState`/schema-facing render data, not Sci or World.
6. Existing M4/M5, native, optical and privacy tests remain required.

## Acceptance criteria

| Criterion | Binary requirement | Evidence |
|---|---|---|
| M6-ASSET | The first apparatus family has a semantic manifest, master, source and license records | asset manifest tests + package review |
| M6-GEOMETRY | Burette/flask/stand/beaker use one orthographic mm-based family and the flask uses the frozen profile-derived height | render-state tests + visual review |
| M6-RENDER | Pixi mounts from built output and consumes `RenderState` only | browser test + dependency check |
| M6-STATE | Canvas and DOM inspection expose the same frame identity and optical refusal/result | composition/browser assertions |
| M6-RESPONSIVE | All four named viewports remain usable and no essential readout is canvas-only | viewport browser tests + captures |
| M6-PRIVACY | Built page emits no third-party request and loads no external asset | network test + artifact scan |
| M6-PERF | Static apparatus render has no unbounded per-frame work; scripted capture records a performance sample | browser/performance evidence |
| M6-S3 | Owner accepts originality, visual consistency, geometry, accessibility and captures | `docs/visual/review-m6.md`; not claimed by this spec |

## Rollout/migration

No persisted migration. The new asset version is centrally distributed and
render assets are bundled. If future profile/asset geometry changes alter the
meaning of an existing world, the existing profile-hash/version rules require
an explicit schema/migration decision before release.

## Open questions

- The exact Pixi visual baseline and owner-approved token values remain open
  until the first rendered captures are reviewed; this is an intentional visual
  decision, not an implementation gap.
- M7 will decide how semantic hit regions become commands and how pointer
  previews acquire hysteresis; M6 does not pre-commit that event model.
