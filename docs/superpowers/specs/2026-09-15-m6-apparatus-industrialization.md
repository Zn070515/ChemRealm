# M6 器材资产工业化与浙江实验覆盖设计

**Status:** Historical design record; not an active implementation authority.
It does not claim M6 S3.
**Lifecycle:** Historical design record; superseded as active M6 asset
materialization authority by the hybrid apparatus asset-pipeline specification.

**Authority:** `GOAL.md`, `SPEC-0001`, ADR-0006, ADR-0013,
`docs/visual/apparatus-standard.md`, the existing M6 design, and the cited
research record. `docs/research/m6-zhejiang-apparatus-and-visual-target.md` is
research input, not a substitute for the canonical contracts.

## Context

The existing M6 page proves the World → Science → Observable → RenderState →
Pixi path, and the first implementation now has a bounded typed catalog. A
separate visual audit nevertheless found that technical package evidence is
not equivalent to a professional apparatus system. The stricter production
requirements—family construction rules, visibly distinct specifications,
state/interaction completeness and owner visual review—are defined in
[`docs/visual/m6-art-direction.md`](../../visual/m6-art-direction.md) and the
M6 visual-system remediation specification. This document records the original
technical slice; it does not override the stricter visual gate.

The change is a Representation Engine change. It must improve visible fidelity
without moving chemistry into render, adding world events for pointer noise, or
using NOBOOK art as source material.

## Goal

1. Replace the crude first visual with an original, coherent, high-detail
   vector/2.5D titration family whose glass, metal, scale, liquid, meniscus,
   clamps, stopcock, labels and shadows remain legible at all M6 viewports.
2. Establish a typed, centrally versioned apparatus catalog with multiple
   physically named specifications for each common vessel family.
3. Represent detachable glass/rubber connection parts and compatible ports as
   data, so M7 can later turn them into world commands without redesigning the
   asset contract.
4. Preserve all previous invariants: one version source, RenderState-only Pixi
   drawing, profile/content identity, no chemistry in renderer, no external
   assets/network, and honest S2 evidence.

## Non-goals

- No new equilibrium, optics, density, or reaction model.
- No persisted World/Event schema or migration in this round.
- No pointer drag, snap, connect, detach, delivery, undo, or learner evidence.
- No claim that the catalog is a complete NOBOOK replacement or a complete
  Zhejiang exam bank.
- No copying, tracing, importing, or runtime fetching of NOBOOK/vendor assets.
- No fake manufacturer precision: approximate visual dimensions remain labelled.
- Strong-acid phenolphthalein orange remains documented/refusal-only according to
  the existing optical contract; this visual round does not implement it.

## User experience

The current committed titration world presents as a real laboratory setup rather
than four outline icons. The burette has a readable graduated tube, liquid column,
meniscus, stopcock and tip; the stand has base, rod, boss head, clamp jaws and
fasteners; the flask has mouth, wall thickness, shoulder, base ring and liquid;
the beaker has lip, spout, graduations and thick base. Labels and numeric readouts
remain DOM-accessible, with the canvas as a synchronized visual projection.

The catalog itself is a reusable data package in M6, not yet a catalog drawer.
It contains variants such as 25/50/100 mL burettes, 100/250/500 mL conical
flasks, 100/250/500/1000 mL beakers, and 50/100/250/500 mL volumetric flasks.
Connectors and stoppers are separate assets with ports and detach capability.

## Architecture and ownership

| Concern | Owner | Rule |
|---|---|---|
| Chemistry, liquid amount, optical observation | Scientific Reality Core | unchanged; renderer never infers it |
| Committed contents/topology/history | World Runtime | unchanged; no pointer noise events |
| Catalog, geometry, profiles, parts, ports, visual layers | Representation Engine | serializable, source-labelled, centrally versioned |
| Page composition and later commands | Web composition / ACE boundary | M6 remains read-only |

The production path remains:

```text
committed WorldState
  → ScientificFrame
  → ObservableModel
  → RenderState
  → Pixi vector layers + DOM companion
```

`VolumeProfileSnapshot` remains the only source for level geometry. A catalog
specification does not create a scientific volume. A detachable port proposes a
future connection; it does not mutate WorldState in M6.

## Scientific design

There is no scientific model change. All liquid heights, burette values, indicator
optics, pH convention, species and symbolic content still arrive through the
existing frame/observable contracts. Material colors in the renderer are glass,
metal, ceramic, rubber and neutral liquid presentation tokens. A chemical tint is
accepted only when present in an admitted `OpticalObservation`; refusal remains
visible and never gets a palette fallback.

## World/event design

No persisted or event schema changes are required. Catalog and asset package data
are representation resources. M7 may later define connect/detach commands, but
M6 only exposes stable port IDs, compatibility kinds, hit regions and detachable
part metadata. No animation clock or pointer coordinate enters a world hash.

## Representation design

### Catalog contract

Every specification has:

```text
familyId / specificationId / displayName
kind / material / sourceClass / claimScope
dimensionsMm / capacityMl / graduation
  parts[] (each part declares `detachable`) / ports[] / stateVariants[]
provenance[] / visualFamily / coordinateUnit
```

Port compatibility is directional and explicit. A `fluid-outlet` must not be
silently attached to a support contact; a detachable tube records its nominal
inner/outer diameter when known, otherwise marks the dimension as approximate.
The runtime catalog is deep-frozen and validates unique IDs, positive dimensions,
capacity/graduation consistency, and that every declared detachable part and port
is resolvable.

### Visual master

The revised master is an original SVG asset sheet/scene with reusable layered
groups and explicit layer ordering, not a screenshot or generated bitmap. Its
semantic bounds remain millimetre-based, while its review artboard explicitly
uses logical scene units. Runtime values (readings,
liquid level, optical result) remain RenderState-driven. SVG is a reviewable asset
record; Pixi's deterministic vector drawing is the runtime adapter, so the two
must share the same geometry vocabulary and must not become competing chemistry
truth sources.

### Multi-specification strategy

The catalog keeps family identity separate from specification identity. Capacity
and dimensions are not labels only: they define scale class, visible proportions,
graduation density and compatible accessory size. The first page uses the existing
100 mL world-compatible titration fixture; the catalog also includes the more
common 25 mL and 50 mL burette variants and the vessel families needed by Zhejiang
solution-preparation, separation and titration contexts.

## Learning design

M6 has no ACE changes. The richer apparatus is intended to make observation,
prediction and later operation possible, but viewing a polished illustration is
not learning evidence. Future learning tasks must use the same asset/world state,
not a parallel scripted scene.

## Privacy/compliance

No account, telemetry, network, cloud sync or external asset is added. Catalog
source URLs are static audit metadata and are never fetched by the browser.
The project remains free/non-commercial and safe for local-first use by minors.

## API/schema changes

- Add one `representation.apparatusCatalog` version in
  `contracts/version-manifest.json`; generated TypeScript remains the only active
  code distribution.
- Add `ApparatusCatalog` / `ApparatusSpecification` / `ApparatusPort` /
  `ApparatusPart` types in `packages/render/src/assets/`; detachable parts are
  selected from the single `parts[].detachable` source of truth.
- Record the master artboard separately from semantic millimetre bounds so a
  review/layout viewBox cannot be mistaken for physical dimensions.
- Extend the asset package manifest with catalog/version/layer metadata without
  changing World/Event/Scientific schemas.
- Keep the existing `TITRATION_BENCH_ASSET` public shape compatible; the richer
  catalog is additive.

## Failure modes

- A catalog with duplicate or unresolved IDs fails before rendering.
- A port with incompatible kind is rejected by validation rather than accepted by
  a permissive string comparison.
- A source marked approximate cannot be rendered as a standards-certified value.
- A missing optical observation remains a visible refusal; the richer glass/liquid
  art cannot manufacture a chemical color.
- If Pixi fails, DOM inspection remains available.
- A future caller cannot turn a detachable metadata entry into an event by merely
  dragging it; M7 must define the command boundary explicitly.

## Test plan

1. Write failing catalog tests first: family/spec multiplicity, port compatibility,
   detachable part coverage, deep freeze, source-class constraints and central
   version identity.
2. Add package tests for the checked-in catalog manifest/master/source/license/QA,
   including no external SVG references and no active version literals.
3. Expand RenderState tests to expose catalog/spec/layer identity without raw
   ScientificState or WorldState leakage.
4. Add Pixi renderer tests for scale/gradient/geometry-layer metadata and preserve
   the renderer boundary guard.
5. Run existing M4/M5/world/replay/profile/optical/quantity/version checks.
6. Capture all four named viewports and inspect them in two self-review rounds:
   first for contract/regression issues, second for geometry/readability/originality.

## Acceptance criteria

| Criterion | Binary requirement | Evidence |
|---|---|---|
| M6-CATALOG | Catalog has ≥3 burette, ≥3 flask, ≥4 beaker, ≥4 volumetric-flask and ≥4 cylinder specs | catalog test + JSON manifest |
| M6-DETACH | Straight/bent/U/T/Y tube, rubber tube, one/two/three-hole stopper and compatible ports are declared | catalog compatibility tests |
| M6-PROVENANCE | Every spec has a source class and source record; approximations are labelled | manifest/source review + tests |
| M6-MASTER | Master contains detailed glass, metal, scale, stopcock, mouth, base and connection layers, with no external href/src | asset QA test + visual review |
| M6-RENDER | Runtime drawing still consumes RenderState only and remains chemistry-blind | depcruise/renderer guard + tests |
| M6-STATE | Dynamic liquid, meniscus, readings and optical refusal remain derived from current observable output | RenderState/browser tests |
| M6-VIEWPORT | All four named viewports keep apparatus and DOM state legible | candidate captures + browser assertions |
| M6-PRIVACY | No new request or external asset is introduced | artifact/network checks |
| M6-S2 | Code/content and targeted tests pass; visual owner review remains explicit | M6 evidence packet |

## Rollout/migration

No persisted migration. The catalog version is centrally distributed. If a future
asset/profile change changes the meaning of a persisted world, it must use the
existing profile/content hash and schema migration process; a visual refresh must
not silently reinterpret historical geometry.

## Open questions

- Which catalog families receive M7 command semantics first: tubing assembly,
  liquid transfer, or measurement setup? This is intentionally not decided by
  M6 art work.
- Owner visual review may request a token/geometry iteration after captures; that
  is not a scientific contract change.
