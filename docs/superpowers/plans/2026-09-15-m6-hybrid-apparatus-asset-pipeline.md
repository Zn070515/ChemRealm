# M6 Hybrid Apparatus Asset Pipeline Implementation Plan

Status: S1 plan; no implementation completion claim.
Specification: docs/superpowers/specs/2026-09-15-m6-hybrid-apparatus-asset-pipeline.md
Current stage: M6 S2 visual NO-GO.

## Plan argument

The repository already has semantic and runtime contracts for scientific state,
world state, observable state, and frozen volume profiles. The remaining visual
problem is that the current asset batch was authored as a procedural SVG family
before a single apparatus passed visual review. The implementation must
therefore establish the package/admission boundary first, then produce one
independently art-directed Gold Master, then integrate its dynamic state, and
only then extend the family.

The plan deliberately keeps image authoring, semantic identity, dynamic
observation, and scientific/world truth separate. It does not make M6 depend on
M7 learning policy, and it does not introduce a new chemistry or persistence
model.

## Step 1 — Establish the hybrid package and authority boundary

### Objective

Make the hybrid source/body/runtime/semantic package the only current M6 asset
production contract and prevent historical SVG-only plans from being treated as
active instructions.

### Files/packages

- docs/superpowers/specs/2026-09-15-m6-hybrid-apparatus-asset-pipeline.md
- docs/adr/0018-hybrid-apparatus-asset-pipeline.md
- docs/visual/m6-art-direction.md
- docs/visual/apparatus-standard.md
- docs/research/agent-visual-asset-production.md
- docs/evidence/M6.md
- historical M6 spec/plan headers

### Interfaces touched

- asset package roles;
- visual master versus runtime exports;
- frozen volume-profile boundary;
- M6 evidence ownership.

### Implementation detail

1. Mark the new spec/ADR as the current M6 asset authority.
2. Mark SVG-only plans/specs as historical or superseded.
3. Explicitly reject a single bitmap as a complete package while allowing a
   high-resolution bitmap as the visual body.
4. Explicitly reject an SVG that only embeds a raster as a vector master.
5. Preserve VolumeProfileSnapshot as the only persisted geometry truth.

### Tests/evidence

- document consistency guard;
- M6 contract guard;
- diff review showing no scientific/world API mutation.

### Stop/go

- Go when exactly one current M6 visual package contract is referenced by all
  active M6 docs.
- Stop if any active plan still requires SVG as the only visual master.

## Step 2 — Freeze the first Gold Master brief and reference board

### Objective

Define a single 250 mL Griffin beaker target with an asset-specific silhouette,
physical references, visual layers, state list, and acceptance screenshots.

### Files/packages

- assets/apparatus/catalog/gold-master/griffin-beaker-250ml/
- docs/research/m6-instrument-reference-register.md
- docs/research/m6-zhejiang-apparatus-and-visual-target.md
- first asset source-record.md
- first asset qa/review.md

### Interfaces touched

- AssetManifest candidate;
- VolumeProfileSnapshot reference;
- semantic parts/ports/regions/capabilities;
- runtime export roles.

### Implementation detail

1. Use manufacturer and standard references to record nominal capacity,
   dimensions, spout, rim, markings, and acceptable visual approximation.
2. Record which visible features are authored visual evidence and which are
   semantic interaction regions.
3. Decide the authored layer stack for rear wall, liquid, contents, front wall,
   lip, highlights, and markings.
4. Record empty, representative filled, selected, and measurement states.
5. Record reference URLs, access date, license/use classification, and source
   hashes.

### Tests/evidence

- reference register review;
- manifest schema test;
- source/license completeness test;
- physical dimension/unit test.

### Stop/go

- Go only when the beaker brief is specific enough for an artist to produce one
  asset without inventing proportions from a generic function.
- Stop if a reference is not redistributable or if physical dimensions are
  presented with unsupported precision.

## Step 3 — Author the beaker source master and visual body

### Objective

Produce the first asset-specific, high-fidelity visual body and preserve a
reproducible source/export record.

### Files/packages

- assets/apparatus/catalog/gold-master/griffin-beaker-250ml/source/
- assets/apparatus/catalog/gold-master/griffin-beaker-250ml/master/
- assets/apparatus/catalog/gold-master/griffin-beaker-250ml/exports/
- assets/apparatus/catalog/gold-master/griffin-beaker-250ml/qa/

### Interfaces touched

- visual body export;
- optional structured masks;
- asset manifest hashes;
- static/runtime layer boundary.

### Implementation detail

1. Use a layered authoring source rather than a generic generator.
2. Draw the beaker silhouette, spout, rim, base, wall thickness, and
   graduations as asset-specific forms.
3. Render glass with separate front/rear/edge treatment; do not rely on one
   universal gradient preset.
4. Export a high-resolution transparent body and deliberate runtime sizes.
5. Keep liquid, meniscus, selection, measurement, and accessibility overlays
   separate.
6. Record tool/version/export settings and hashes.

### Tests/evidence

- package role and hash tests;
- embedded-raster-in-SVG negative test;
- native/reduced-size screenshot set;
- transparent-background and composed-scene review.

### Stop/go

- Go to integration only after owner visual review marks silhouette, proportion,
  glass, markings, and compositing PASS.
- Stop and revise the source master if the result is still recognizable as a
  procedural icon or if the body requires baked dynamic liquid.

## Step 4 — Build the runtime adapter from frozen package data

### Objective

Resolve the beaker package into deterministic runtime textures, masks, semantic
regions, and a frozen profile without accepting caller-supplied executable
geometry.

### Files/packages

- asset loader/registry package;
- packages/schema asset manifest/profile contracts;
- packages/render runtime asset adapter;
- beaker manifest.json, masks/, and states/.

### Interfaces touched

- VolumeProfileSnapshot;
- ScientificFrame;
- ObservableModel;
- runtime texture loader.

### Implementation detail

1. Verify package manifest and profile payload hashes.
2. Resolve the declared runtime format using deterministic fallback.
3. Construct executable interpolation only from verified snapshot data.
4. Bind liquid level and dynamic overlays to ScientificFrame.physical.
5. Expose semantic parts and hit regions without exposing chemistry logic.
6. Provide typed failure for missing, stale, or mismatched assets.

### Tests/evidence

- frame/profile identity mismatch tests;
- profile payload tampering test;
- missing texture/fallback tests;
- deterministic loader ordering test;
- state update test proving static body identity remains stable.

### Stop/go

- Go when a committed fixture can produce ObservableModel and RenderState from
  one bound frame with no second volume/profile input.
- Stop if any runtime path accepts a self-reported profile hash or mutable
  external geometry reference.

## Step 5 — Produce and review the remaining first-wave assets

### Objective

Extend the approved visual language to the 250 mL Erlenmeyer flask, 25 mL acid
burette, and 50 mL base burette without reverting to a one-function family
generator.

### Files/packages

- assets/apparatus/catalog/gold-master/erlenmeyer-flask-250ml/
- assets/apparatus/catalog/gold-master/burette-acid-25ml/
- assets/apparatus/catalog/gold-master/burette-base-50ml/
- corresponding reference/QA records

### Interfaces touched

- variant manifests;
- detachable part identity;
- stopcock/tube/connection regions;
- volume profiles and graduation metadata.

### Implementation detail

1. Reuse approved conventions only where they are visual conventions, not
   geometry shortcuts.
2. Draw each silhouette and hardware system independently.
3. Model burette detachable parts as addressable parts with connection
   capabilities.
4. Keep acid/base burette variants distinct in capacity, markings, stopcock/tube
   treatment, and teaching labels where physically justified.
5. Review all four assets together for perspective, scale, material, and
   interaction consistency.

### Tests/evidence

- per-asset package and source tests;
- parts/ports/capability consistency tests;
- detach/attach semantic fixtures;
- four-asset screenshot review at required viewports.

### Stop/go

- Go only when all four assets independently pass the visual and semantic
  review.
- Stop if a later asset is merely a recoloured or rescaled copy that loses
  correct apparatus proportions.

## Step 6 — Integrate one real product composition path

### Objective

Prove that a committed world can flow through the production composition boundary
to ObservableModel and a browser scene without hand-authored scientific or
visual state.

### Files/packages

- apps/web composition root;
- packages/world fixture/world loader;
- packages/sci frame/projection producer;
- packages/render scene adapter;
- browser fixture and screenshot evidence.

### Interfaces touched

- WorldState;
- ScientificFrame;
- ObservableModel;
- asset registry;
- browser scene.

### Implementation detail

1. Load a committed deterministic world fixture.
2. Resolve solver/scientific state using the existing M4 path.
3. Create one bound ScientificFrame containing source identity, physical volume,
   profile identity, and scientific projection.
4. Resolve the visual package from manifest/profile data.
5. Build ObservableModel and RenderState from that frame.
6. Render taught or scientific pH through an explicit policy, never both in one
   default view.
7. Render one indicator palette keyed by identity and a real liquid/meniscus
   state from the frame.

### Tests/evidence

- end-to-end browser fixture;
- DOM assertions for readouts and accessibility labels;
- screenshot evidence at required viewports;
- no network/storage regression;
- source identity and sequence consistency checks.

### Stop/go

- Go when the production path is exercised by browser evidence and no component
  accepts a second physical/scientific source.
- Stop if the browser fixture contains pre-authored curve, pH, liquid volume, or
  indicator colour values.

## Step 7 — Verify future backend portability

### Objective

Ensure the asset package and Observable contracts can later be consumed by Pixi,
WebGL, Canvas, WebAssembly, Rust, or C++ modules without moving domain truth
into the renderer.

### Files/packages

- asset loader boundary;
- renderer backend adapter interfaces;
- architecture/ADR evidence;
- optional WASM spike only if separately approved.

### Interfaces touched

- runtime texture/mask bundle;
- ObservableModel;
- backend render adapter.

### Implementation detail

1. Keep backend-neutral manifest, profile, frame, and Observable contracts.
2. Keep Rust/C++/WASM restricted to deterministic geometry, interpolation,
   image processing, or performance-sensitive rendering helpers.
3. Keep scientific constants, provenance, acceptance references, and policy in
   the existing TypeScript/Python evidence boundary unless a separate
   scientific-native-module ADR is accepted.
4. Require the same fixture outputs and hashes across JS and any native/WASM
   helper.

### Tests/evidence

- interface compile test;
- backend substitution fixture;
- deterministic output comparison;
- fallback to JS path;
- browser loading and privacy checks.

### Stop/go

- Go only if the optional backend is observationally equivalent for the tested
  contract and can fail back visibly.
- Stop if a backend adds a second source of chemistry truth or changes replay
  identity.

## Step 8 — Audit the package against the GOAL-complete product

### Objective

Before admitting a first Gold Master, prove that the package shape is useful
for the later complete Chemical World and is not merely a high-quality static
illustration format.

### Files/packages

- docs/superpowers/specs/2026-09-15-m6-hybrid-apparatus-asset-pipeline.md
- docs/research/from-nobook.md
- docs/research/agent-visual-asset-production.md
- docs/research/m6-instrument-reference-register.md
- GOAL.md
- future Representation Engine package/registry contracts

### Interfaces touched

- CatalogEntry versus asset package identity;
- WorldState and genesis-owned profile/export identity;
- ScientificFrame and ObservableModel;
- detachable parts, ports, capabilities, hit regions, and measurement regions;
- backend-neutral asset loading and future WASM/native adapters;
- ACE action/evidence observation boundary.

### Implementation detail

1. Map each public NOBOOK product surface that is relevant to ChemRealm:
   resource discovery, editor/setup, player/demo, inspector, operation,
   measurement, scene persistence, screenshot/export, and practice/report.
2. For each surface, identify the asset field or runtime boundary it consumes.
   If a surface needs a field that the package cannot provide without inventing
   chemistry or world state, stop and amend the package contract before
   producing more art.
3. Verify that the same package can serve multiple capacities and apparatus
   variants without implying that one generic silhouette or one bitmap is the
   source of truth.
4. Verify that detachable parts have stable identity and connection semantics,
   while attach/detach itself remains a command/event concern.
5. Verify that measurement consumes frozen profile/calibration metadata and
   frame-bound volume, rather than reading pixels or trusting a label.
6. Verify that player, inspector, ACE, and screenshot flows can consume the
   same ObservableModel/RenderState without creating mode-specific chemical
   state.
7. Verify that Pixi/Canvas/WebGL and a future Rust/C++/WASM helper can consume
   the same package and fixture identity. Do not add a native module merely to
   satisfy this audit.
8. Record which statements come from public NOBOOK documentation and which are
   ChemRealm design requirements or owner observations. Do not infer NOBOOK's
   internal solver, asset source format, or replay semantics.

### Tests/evidence

- GOAL-complete viability matrix in the active spec;
- public-source register with URL, access date, and claim boundary;
- package-to-surface identity matrix;
- negative review for second truth sources, mutable geometry references,
  mode-specific assets, missing detachable-part identity, and pixel-based
  measurement;
- backend substitution design review and, when implemented, fixture-equivalent
  output test.

### Stop/go

- Go when every future surface has a package/runtime owner and no row requires
  a hidden second source of chemistry, world, or geometry truth.
- Stop if the package is only useful for a screenshot, if a required surface
  needs a current external NOBOOK service, or if any later mode must fork the
  asset's scientific meaning.

## Self-review before implementation

- Owner core is Representation Engine with explicit World/Science boundaries.
- Existing frozen profile and frame contracts are reused rather than duplicated.
- The current rough SVG batch is rejected, not silently promoted.
- A single bitmap is allowed only as the visual body inside a complete package.
- Dynamic liquid/indicator/measurement state remains runtime-driven.
- NOBOOK is used as a public interaction/quality benchmark, not as copied art.
- Zhejiang standards and manufacturer dimensions are treated as references with
  provenance and uncertainty, not as invented exact pixels.
- Persistence, replay, privacy, and local-first behavior are explicitly covered.
- M6 can be implemented without waiting for M7 learning policy.
- Rust/C++/WASM remain optional backend optimizations, not a new domain core.
- The package has been checked against the future Catalog, editor, player,
  inspector, measurement, persistence, ACE, viewport, and backend surfaces.
- Public NOBOOK capability claims are separated from undocumented internal
  implementation claims.

## Verification commands

The implementation round must run the repository's current M6 and full checks,
including, as available:

    pnpm typecheck
    pnpm test
    pnpm verify:m6-contracts
    pnpm verify:m6-gold-master
    pnpm verify:m6-master-packages
    pnpm verify:m6-render-geometry
    pnpm verify:world
    pnpm lint

Browser, Python, PHREEQC, and acceptance commands remain required when the
composition or scientific/world boundary is touched.

## Handoff

Until the first beaker owner review passes, handoff must state:

- current gate: M6 S2 visual NO-GO;
- current rough SVG packages: rejected visual candidate / structural baseline;
- current spec and plan: this hybrid pipeline;
- verified: package/schema/profile/hash boundaries that already pass;
- not verified: Gold Master visual quality, four-asset consistency, production
  browser composition, and M6 S3;
- next stop/go decision: owner review of the 250 mL Griffin beaker.
