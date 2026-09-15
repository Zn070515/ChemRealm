# M6 Hybrid Apparatus Asset Pipeline Specification

Status: S1 specified; implementation and owner visual acceptance remain pending.
Authority: this document supersedes the SVG-only construction assumptions in the historical M6 asset rebuild documents. It does not by itself accept any visual asset.
Stage: M6 Representation Engine / visual asset production.
Current gate: M6 remains S2 visual NO-GO until the first Gold Master passes owner review.

## Context

The current apparatus package is structurally inspectable and has useful semantic
metadata, but its visual treatment is not yet close enough to the approved
quality target. The failure is not a missing SVG path or a missing gradient. The
current batch was generated from shared procedural construction rules before any
single apparatus had received an art-directed Gold Master review. It therefore
remains a rejected visual candidate and must not be promoted to M7 product art.

The project needs a production contract that preserves the useful parts of
structured runtime geometry while allowing an artist to make a high-fidelity,
asset-specific visual master. Source-format purity is not a product goal. Visual
fidelity, physical plausibility, deterministic runtime behavior, semantic
addressability, provenance, and reproducibility are the product goals.

The open visual benchmark is the interaction quality and apparatus organization
of NOBOOK, not a license to copy NOBOOK artwork, private implementation, or
proprietary content. Public NOBOOK material shows a coherent laboratory
environment with equipment libraries, setup/edit/player modes, zoom/pan,
selection, moving, rotating, connecting, taking, tilting, reading, and
experiment/report flows. ChemRealm must provide its own assets and its own
scientific/world contracts while meeting a comparable level of clarity and
operability.

## Goal

1. Define an admitted asset package that can contain an authored high-resolution
   visual body, structured geometry or masks where runtime behavior needs them,
   semantic apparatus parts/ports/regions/capabilities, and reproducible source
   records.
2. Produce one 250 mL Griffin beaker as the first visual Gold Master. Do not
   batch-produce the remaining apparatus until this asset passes owner review.
3. Support the first four visual gates as distinct, asset-specific designs:
   250 mL Griffin beaker, 250 mL Erlenmeyer flask, 25 mL acid burette, and 50 mL
   base burette.
4. Make the package usable by the future Representation Engine without forcing
   chemistry, world state, or interaction semantics into image files.
5. Keep later introduction of Pixi/WebGL, Canvas, WebAssembly, Rust, or C++
   possible without changing the scientific/world contracts or re-authoring the
   semantic apparatus identity.

## Non-goals

- This specification does not accept the current rough SVG batch.
- This specification does not require all visual pixels to be SVG.
- This specification does not freeze a final M6/M7 asset manifest TypeScript API.
- This specification does not define a new chemical model, equilibrium rule, or
  renderer-specific chemistry effect.
- This specification does not copy NOBOOK assets, screenshots, branding, or
  proprietary implementation.
- This specification does not require a particular commercial authoring tool.
- This specification does not make a raster image executable, measurable, or
  semantically self-describing.
- This specification does not implement the complete interactive titration
  workflow. That remains a later composition and interaction milestone.

## User experience

The learner should see an apparatus that is immediately recognizable by its
silhouette, proportions, mouth/rim, wall thickness, base or stopcock structure,
graduations, and material response. It must not look like a generic procedural
icon.

The learner should be able to distinguish:

- a 250 mL Griffin beaker from an Erlenmeyer flask;
- a 25 mL acid burette from a 50 mL base burette;
- the vessel body, rim, base, graduations, stopcock, delivery tube, and
  connection points;
- static apparatus appearance from dynamic liquid, meniscus, level, colour,
  motion, and interaction state.

The runtime must be able to show and manipulate a single apparatus without
requiring a re-rendered full bitmap for every liquid volume. The visual body may
be a high-resolution raster export; liquid, meniscus, clipping, selected state,
connection state, measurement guides, labels, and other stateful overlays must
remain runtime-addressable.

The default view must remain legible at the supported desktop and tablet
viewports. A close view may reveal authored glass layers and small structural
details; a reduced view may use a deliberate preview export, not an accidental
browser downscale that hides important semantics.

## Architecture

### Core ownership

| Concern | Owner | Rule |
|---|---|---|
| Apparatus identity, parts, ports, regions, capabilities | Representation Engine contract / schema | Must be serializable and stable |
| Physical vessel profile and volume-height relationship | World/Representation boundary | Must be resolved from a frozen profile snapshot |
| Liquid amount, composition, temperature, scientific state | Scientific Reality Core and World Runtime | Assets must not calculate or mutate these |
| Liquid, meniscus, level, colour observation inputs | Observable/Representation Engine | Must derive from bound frame and approved observation policy |
| Authoring source and visual pixels | Asset production workflow | Must carry source records and export identity |
| Lesson policy and intervention | ACE | Must not be embedded in asset pixels |

### Runtime data flow

The intended flow is:

    committed WorldState
      -> scientific solve / ScientificState
      -> bound ScientificFrame
      -> resolved VolumeProfileSnapshot
      -> ObservableModel
      -> scene/render backend

The asset package supplies visual and semantic resources to the last two
boundaries. It must not become an alternate source of WorldState or
ScientificState.

### Format policy

The pipeline is hybrid by design:

| Layer | Preferred admitted form | Why |
|---|---|---|
| Editable source master | Layered design document or a reproducible exported source bundle | Enables asset-specific art direction and revision |
| Static visual body | High-resolution RGBA PNG or lossless equivalent; WebP/AVIF derivatives may be generated | Preserves painterly glass, subtle edge light, and controlled texture |
| Structured geometry | SVG paths, masks, or a serializable geometry representation where addressability is needed | Supports clipping, hit regions, measurement, and deterministic state composition |
| Dynamic state | Pixi/Canvas/WebGL/DOM layers driven by ObservableModel | Prevents baking chemistry or interaction into pixels |
| Runtime delivery | WebP/AVIF/PNG fallback, texture atlas or separate textures | Matches browser and Pixi/Phaser loading capabilities |
| Semantic contract | JSON manifest validated by schema | Keeps identity independent of pixels and authoring tool |

An SVG containing only an embedded PNG is not an admitted vector master. It may
be a preview wrapper or reference artifact, but it cannot claim editable paths,
semantic layers, or geometry fidelity.

### Asset package

The package shape is:

    asset-id/
    ├─ source/
    │  ├─ master.design.*             # optional committed editable source
    │  └─ source-record.md            # tool, version, operator, source refs
    ├─ master/
    │  ├─ body@3x.png                # high-resolution authored visual body
    │  ├─ structure.svg              # optional authored structure/masks
    │  └─ layers/                    # optional exported layer artifacts
    ├─ exports/
    │  ├─ scene@2x.webp
    │  ├─ scene@1x.webp
    │  └─ fallback@1x.png
    ├─ masks/
    │  ├─ liquid-mask.svg            # only if dynamic clipping needs it
    │  ├─ meniscus-mask.svg          # only if separately addressed
    │  └─ hit-regions.json
    ├─ states/
    │  ├─ empty.json
    │  ├─ filled.json
    │  ├─ selected.json
    │  └─ connected.json
    ├─ manifest.json
    ├─ license.md
    └─ qa/
       ├─ source-hashes.json
       ├─ export-settings.json
       ├─ screenshots/
       └─ review.md

master/body@3x.png is a visual body, not a substitute for the semantic
manifest or dynamic state layers. The scale multiplier is an export scale, not
a physical measurement. Physical dimensions, capacity, graduation meaning,
ports, and profile identity remain explicit metadata.

### Layer model

Each asset must document the intended layer order. The minimum useful layers
are:

1. rear glass/wall and rear graduations;
2. rear liquid or liquid mask where applicable;
3. internal body/shoulder/neck geometry;
4. contents and meniscus;
5. front wall, rim, lip, and edge refraction;
6. hardware such as stopcock, tip, tube, clamp, or base;
7. front highlights and readable markings;
8. interaction overlays, selection, measurement, and accessibility labels.

The exact list is asset-specific. It is not a generic procedural template. A
layer may be raster, vector, or runtime-generated, but its role and ownership
must be recorded.

## Scientific design

This pipeline introduces no new chemistry. The following are mandatory:

- Image pixels never decide equilibrium direction, species amount, pH,
  indicator ratio, ionic strength, or validity.
- Liquid fill height is derived from the frozen volume profile and the bound
  frame's liquid volume.
- Indicator colour is an observable policy keyed by indicator identity and
  scientific ratio; it is not a hard-coded renderer shortcut.
- Visual glass tint, edge highlights, and artistic refraction are empirical
  visual treatments. They must not be presented as measured optical
  quantities.
- Any optical-observation model added later must state its wavelength,
  concentration/path-length assumptions, calibration, and approximation status.
- A strong-acid orange state for phenolphthalein is recorded as a future
  observation-state requirement, but is out of scope for this asset package
  slice until its scientific/empirical observation contract is accepted.

## World/event design

This asset pipeline must not add pointer noise or visual animation frames to the
authoritative event log.

The package may provide:

- stable part, port, region, and capability identifiers;
- a frozen serializable volume-profile snapshot;
- hit regions and interaction affordances;
- state-specific visual exports;
- runtime masks and measurement geometry.

It must not provide:

- a private chemistry solver;
- an alternate material inventory;
- an event sequence hidden in an animation;
- a mutable reference to an external geometry asset for a persisted world;
- a function object as the only representation of V(h) or h(V).

If a persisted world uses apparatus geometry, the genesis-owned
VolumeProfileSnapshot or an explicitly content-addressed immutable asset
record must be recoverable during replay. A mutable geometryRef alone is
insufficient.

## Representation design

### Gold Master sequence

The visual admission sequence is intentionally serial:

1. 250 mL Griffin beaker;
2. owner visual review and correction;
3. 250 mL Erlenmeyer flask;
4. owner visual review and correction;
5. 25 mL acid burette;
6. owner visual review and correction;
7. 50 mL base burette;
8. family-level consistency review.

Shared conventions may be reused only after the first asset has established
them. Silhouette, shoulder curve, rim, base, stopcock, tube, graduation
placement, and glass treatment may not be generated by one unreviewed function
for all capacities and apparatus kinds.

### Asset identity and variants

Every admitted asset has:

- assetId;
- visualFamily;
- variantId and nominal capacity;
- physical dimensions and unit basis;
- parts[], ports[], regions[], and capabilities[];
- profileId, profileVersion, and profileHash when volumetric;
- source and license records;
- export hashes and supported runtime formats;
- accessibility label and interaction notes.

The same kind of container must support independent variants when the physical
or teaching distinction matters. For example, 100 mL, 250 mL, and 500 mL
Erlenmeyer flasks are not required to share one silhouette function. A narrow
mouth, wide mouth, heavy-duty rim, marking spot, base proportion, graduation
pattern, or wall treatment may be variant-specific.

Detachable parts must be first-class package members or addressable parts:

- burette stopcock;
- flexible delivery tube;
- glass tip;
- rubber bulb or pinch/clip mechanism where the selected apparatus uses one;
- clamp/contact region;
- removable cap, funnel, or adapter when present.

### Runtime and performance

The Representation Engine must be able to load the static body once and update
dynamic layers without regenerating the authored master. Runtime loaders may use
Pixi Assets, spritesheets/atlases, WebGL textures, Canvas, or a future WASM
backend. The observable contract must not depend on the backend.

Required runtime properties:

- deterministic asset URL/hash resolution;
- explicit DPR/scale selection;
- WebP/AVIF/PNG fallback policy;
- no network fetch for local-first world data beyond declared asset loading;
- asset load failure is visible and typed, never silently replaced by a generic
  apparatus;
- reduced-size preview is an intentional export with its own QA screenshot;
- interactive hit regions remain usable at supported viewports.

## GOAL-complete viability review

This section answers a product question before implementation begins: can the
active package support the later GOAL-complete Chemical World, rather than only
produce a good-looking M6 picture?

The answer is yes, provided the package remains a resource bundle and not a
second world model. The following mapping is the required architectural
reading of the public NOBOOK surface and of ChemRealm's own GOAL:

| Future product surface | What the package must provide | Later owner | M6 conclusion |
|---|---|---|---|
| Catalog and resource discovery | stable identity, family, capacity/specification variants, thumbnail/export roles, searchable labels, source and license records | Representation Engine plus content tooling | Supported by the manifest; catalog/search implementation remains later |
| Setup/editor | parts, ports, regions, anchors, capabilities, detachable-part relations, placement bounds, and readable selected states | Representation Engine and World command boundary | Supported without putting commands in pixels |
| Player/demo | the same admitted asset resolved into a bound frame and a presentation policy | Observable/Representation Engine | Supported; player is not a second asset |
| Runtime inspector | semantic part identity, accessibility label, physical/profile identity, and frame-bound observable values | Observable plus Scientific/World projections | Supported; the asset does not invent values |
| Measurement | profile snapshot, calibration/marking metadata, meniscus and reading regions, deliberate scale exports, and a stated precision | World/Science boundary plus Observable | Supported; measurement remains an explicit contract, not image OCR |
| Save, reload, replay, and fork | content-addressed export/profile identity and recoverable genesis-owned data; no mutable geometryRef-only dependency | World Runtime and persistence | Supported by the package boundary; full import/export remains a later milestone |
| Process effects | addressable liquid, meniscus, gas, precipitate, heat, selection, connection, and failure layers where scientifically applicable | Scientific Reality plus Observable policy | Supported as inputs/layers; the asset never decides when an effect occurs |
| ACE and assessment | meaningful action targets, capability identifiers, evidence-friendly state labels, and stable visual identity | ACE | Supported as an observation surface; no learner inference is embedded |
| Desktop, tablet, and mobile | deliberate LOD/export roles, scale-independent semantic hit regions, responsive composition, and accessible alternatives | Representation Engine | Supported if each admitted asset passes viewport QA |
| 2D, WebGL, Pixi, Canvas, or future WASM | backend-neutral manifest, textures/masks, profile data, and ObservableModel; deterministic fallback | Representation Engine/backend adapters | Supported; a backend may optimize delivery but may not own truth |
| Rust/C++ scientific or geometry helpers | a versioned adapter boundary and fixture-equivalent outputs | Scientific/World or Representation owner according to the kernel | Possible later; requires a separate ADR for a scientific-native authority |

The public NOBOOK material supports the need for these surfaces, not the claim
that its internal implementation has the same boundaries. Its open-platform
documentation exposes separately configurable editor/player/toolbars/info
surfaces, scene JSON get/set, play/stop, and screenshot operations. Its public
student documentation also describes selecting, moving, rotating, connecting,
taking, tilting, reading, reporting, and practice/exam flows. These are product
capabilities to meet or exceed with original implementation, not permission to
copy NOBOOK assets or to infer an undocumented scientific engine.

The package is therefore viable for the future complete GOAL only under these
invariants:

1. CatalogEntry, asset package, WorldState, ScientificState, ObservableModel,
   and RenderState remain different layers.
2. A world persists an immutable profile/export identity, never a mutable
   reference to whatever asset happens to be current.
3. Commands and meaningful domain events own attach, detach, transfer, tilt,
   heating, and other world transitions; an animation or state PNG is never an
   event log.
4. A dynamic observation is derived from a bound ScientificFrame and approved
   policy. The package can expose a mask or palette slot, but cannot calculate
   chemistry or silently choose a teaching answer.
5. NOBOOK is not a runtime dependency. ChemRealm must run its local-first
   fixtures and admitted packages without an iframe, remote SDK, account, or
   external scene service.

This is an architectural feasibility result, not an implementation claim.
M6 still does not deliver the full Catalog, editor, player, ACE, process feed,
or end-to-end interactive titration. It makes those later surfaces possible
without replacing the package or changing the Scientific Reality contract.

### Visual quality bar

The first Gold Master must pass all of the following:

- silhouette/proportion review against manufacturer drawings/photos and standard
  laboratory references;
- front/back wall, rim, lip, base, shoulder, neck, and hardware readability;
- glass/material treatment review at native and reduced size;
- no generic placeholder labels, no procedural construction artifacts;
- no embedded-raster-in-SVG masquerading as structured vector art;
- transparent background and compositing review over the approved laboratory
  scene;
- state variants preserve the same apparatus identity;
- deterministic screenshot review at required viewports;
- semantic parts and hit regions align with the visible asset.

## Learning design

The asset is a medium for actions and observations, not a learning policy.

The package must make it possible for ACE to observe meaningful actions such as
selecting a port, attaching a tube, reading a graduation, tilting a vessel, or
choosing a delivery amount. It must not infer learner understanding from a
single successful drag or encode hint logic inside an asset.

The first Gold Master evidence is visual/representation evidence only. No claim
about learner competence, transfer, or intervention quality may be made from
asset screenshots.

## Privacy/compliance

The pipeline preserves current local-first defaults:

- no account is required to load an apparatus asset;
- no learner identity is embedded in an asset package;
- local worlds and event logs remain local unless a separately approved feature
  changes the boundary;
- source/license records must not include private learner data;
- downloaded or generated asset provenance must be explicit;
- third-party reference images are not redistributed unless their license
  permits it.

Public NOBOOK pages and screenshots are research references, not automatically
redistributable production inputs. The repository must record source URL, access
date, usage purpose, and whether the item is reference-only.

## API/schema changes

This specification is intentionally format-oriented and does not freeze the
future TypeScript API. The eventual schema must preserve these separations:

1. AssetManifest — stable semantic identity and package references.
2. VolumeProfileSnapshot — serializable geometry/profile truth with content
   hash and provenance.
3. RuntimeAssetBundle — resolved textures, masks, and hit regions.
4. ObservableModel — bound frame-derived visible state.
5. RenderState — backend-specific scene instructions.

The runtime must reject:

- a profile snapshot whose declared hash does not match its canonical payload;
- a missing required export or fallback;
- an asset package whose manifest identity differs from its source record;
- an executable geometry function supplied without a verified snapshot origin;
- a visual asset with no license/source record;
- a dynamic state that is not tied to the bound frame identity.

## Failure modes

| Failure | Required behavior |
|---|---|
| Only a single PNG is supplied | Admit as concept/reference only, not Gold Master |
| SVG is only a base64 PNG wrapper | Reject as vector master; retain only as reference if licensed |
| Source file cannot be reproduced | Require a source record and owner-approved frozen export; do not claim editable master |
| Profile payload/hash mismatch | Reject before executable geometry construction |
| Geometry asset is missing during replay | Fail visibly with typed asset/provenance error; never use current mutable content |
| Static body has no semantic parts | Reject Gold Master admission |
| Dynamic liquid is baked into the body | Reject for interactive use unless separately supplied with state contract |
| Asset variant uses wrong physical dimensions | Reject manifest/geometry validation |
| Unknown indicator palette | Reject or show explicit unavailable-observation state; never silently use phenolphthalein |
| Runtime texture fails | Show typed load failure and preserve world/scientific state |

## Test plan

### Contract and package tests

- manifest schema rejects missing identity, source, license, dimensions, or
  required package roles;
- package tests reject an SVG that contains only an embedded raster;
- source/export hashes are deterministic;
- every package part/port/region/capability identifier is unique;
- every detachable part has a declared parent and capability;
- every volumetric asset references a valid frozen profile snapshot;
- profile payload tampering is rejected before runtime interpolation;
- runtime bundle resolves declared formats in deterministic priority order.

### Runtime and representation tests

- deterministic fixture world -> ScientificFrame -> ObservableModel -> RenderState;
- body, liquid, meniscus, level, and hit regions derive from one frame identity;
- no second liquid volume or second geometry source is accepted at the Observable
  boundary;
- dynamic liquid state does not mutate the static body asset;
- state changes update masks/overlays without replacing semantic asset identity;
- missing asset and bad hash produce typed visible errors;
- full-transfer and near-boundary volume operations do not create negative
  inventory or overdraw due to floating-point accumulation;
- supported viewport screenshots contain no prototype labels and preserve
  apparatus readability;
- selected/connected/detached states remain visually and semantically aligned.

### Visual review evidence

For each Gold Master:

- source-record and license review;
- manufacturer/standard reference board;
- native-size and reduced-size screenshots;
- transparent-background and composed-scene screenshots;
- empty, representative filled, selected, connected, and detached states where
  applicable;
- owner review record with explicit PASS/FAIL for silhouette, proportion,
  material, markings, semantic alignment, and runtime behavior.

## Acceptance criteria

| Criterion | Binary requirement | Evidence |
|---|---|---|
| M6-HYBRID-1 | Package separates editable source, visual body, structured/runtime layers, semantic manifest, and QA records | Package inspection test |
| M6-HYBRID-2 | A single bitmap alone cannot be admitted as a Gold Master | Negative package test |
| M6-HYBRID-3 | SVG embedded-raster wrapper is not accepted as vector master | Negative package test |
| M6-HYBRID-4 | First 250 mL Griffin beaker has a reviewed asset-specific silhouette and layered visual treatment | Owner visual review + screenshots |
| M6-HYBRID-5 | Runtime dynamic state is separate from static visual body and derives from ObservableModel | Integration test |
| M6-HYBRID-6 | Profile payload is content-hash verified before executable geometry construction | Runtime negative test |
| M6-HYBRID-7 | Semantic parts/ports/regions/capabilities align with the visible asset | Manifest + screenshot review |
| M6-HYBRID-8 | Four first-wave apparatus packages do not depend on one unreviewed generic silhouette generator | Package/source review |
| M6-HYBRID-9 | Runtime supports deterministic format fallback and typed asset failure | Loader tests |
| M6-HYBRID-10 | Historical rough SVG batch is not used as M7 production art | Evidence and asset admission guard |
| M6-HYBRID-11 | No chemistry or learner-policy logic is embedded in an asset | Dependency/static review |
| M6-HYBRID-12 | Package can later be consumed by Pixi/WebGL/Canvas/WASM without changing world/science contracts | Boundary/type test and architecture review |
| M6-HYBRID-13 | A GOAL-complete viability review maps Catalog, editor, player, inspector, measurement, replay, ACE, viewport, detachable-part, and backend needs to this package without a second truth source | Architecture review + package/identity matrix |

M6 remains S2 until all applicable visual and composition evidence is complete.
M6-HYBRID-1 through M6-HYBRID-3 may pass structurally before owner visual
acceptance; they do not promote an asset to Gold Master.

## Rollout/migration

The existing rough SVG packages remain in the repository as rejected structural
baselines unless separately archived. They must be marked
rejected-visual-candidate and must not be referenced by M7 product fixtures.

No scientific or world schema migration is required for the package format
alone. If a persisted world stores a geometry/profile reference, the existing
genesis-owned profile snapshot and content-hash migration rules remain
mandatory. Introducing an executable runtime adapter must never weaken that
persisted truth.

The first implementation may ship only the 250 mL Griffin beaker package behind
an explicit development asset registry. The other three first-wave assets are
added only after the beaker visual review is PASS. Family expansion must add
independent variants and source records rather than cloning a single procedural
silhouette.

## Open questions

There are no unresolved decisions required before the first beaker asset brief
and source record. The following are implementation choices, not blockers:

- which editable authoring tool is used;
- whether the runtime uses separate textures or an atlas;
- whether the optional structured mask is SVG, Canvas path data, or another
  serializable geometry form;
- whether a future WASM renderer helper is written in Rust or C++.

These choices must preserve the package, provenance, identity, and Observable
boundaries above.

## References

- NOBOOK Open Platform: https://open.nobook.com/
- NOBOOK chemistry integration documentation:
  https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/
- NOBOOK public chemistry UI reference:
  https://nobook-doc-cdn.nobook.com/chem/NB%E5%8C%96%E5%AD%A6%E5%AE%9E%E9%AA%8C界面及相应功能特性说明.html
- Ministry of Education JY/T 0655-2025:
  https://www.moe.gov.cn/srcsite/A06/s3732/202507/W020250701322477393561.pdf
- DWK/PYREX 250 mL Griffin beaker:
  https://www.dwk.com/na/pyrex-beakers-low-form-griffin-with-spout-250-ml-100010d
- Thermo Fisher 250 mL Erlenmeyer flask:
  https://www.thermofisher.com/order/catalog/product/kr/en/FB501250
- Pixi Assets guide:
  https://pixijs.com/7.x/guides/components/assets
- Pixi texture guide:
  https://pixijs.com/7.x/guides/components/textures
- Phaser texture guide:
  https://docs.phaser.io/phaser/concepts/textures
