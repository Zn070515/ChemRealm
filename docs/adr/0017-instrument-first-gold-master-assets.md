# ADR-0017 — Instrument-First Gold Master Assets

- **Status:** Candidate — M6 S2 implementation; owner visual acceptance is open
- **Date:** 2026-09-15
- **Decision owners:** Project owner; Representation Engine maintainers
- **Scope:** Source-backed instrument marking, manually authored Gold Masters,
  and deterministic master-to-LOD compilation

## Context

The first M6 apparatus assets were generic SVG constructions. They could be
structurally consistent while still showing the wrong instrument family,
marking direction, calibration convention, or physical proportions. A
simulation product cannot treat a plausible silhouette as an accepted
laboratory instrument.

The replacement work is informed by the public NOBOOK catalogue and the
Zhejiang high-school laboratory context, but those references are product and
curriculum research. ChemRealm must not copy third-party pixels or turn a
catalogue mention into an unsupported measurement claim. Direct product and
standard references are recorded per master in the instrument reference
register and sidecars.

## Decision

The Representation Engine owns the instrument marking contract, manual master
packages, and the compiler that derives bounded LOD files. The World Runtime
continues to own frozen serializable `VolumeProfileSnapshot` truth and its
content-hash validation. Scientific Reality owns chemistry and does not gain
apparatus drawing logic.

Each first-wave master is a source-backed package with:

- a manually authored `master.svg`;
- a measurement sheet in physical millimetres;
- a source record with claim scope and datum classification;
- a review sheet that keeps owner visual approval open;
- generated `scene`, `preview`, and `thumbnail` LODs derived from the master.

Instrument markings are typed by instrument family. A burette records its
top-zero/downward reading convention and marking surface; an approximate
contained-volume vessel records upward marks and its non-analytical status; a
flask with no cited graduations does not receive invented marks. Acid and
alkali burettes remain distinct identities even when a future family shares
some geometry.

The compiler is compilation-only. It may select declared layers and produce
approved LOD simplifications, but it does not draw generic silhouettes,
invent graduation ladders, or infer a marking from capacity. Every generated
file retains the master identity, physical envelope, semantic layers, and
central version metadata.

Current first-wave status is **Gold Master candidate**, not M6 S3. Structural
contract, instrument-semantic, package-completeness, and render-geometry
audits are non-substitutable. Owner review of full-size and thumbnail captures
on dark-neutral and light-neutral backgrounds is required before visual
acceptance. Path count is diagnostic only.

The strong-acid phenolphthalein orange case remains documented as a future
optical-observation/model-coverage case. This asset decision does not
implement or imply that colour behavior.

## Source and approximation policy

Every datum is classified as `source`, `derived`, `interpolated`, or
`pedagogicalApproximation`. A normalized value never replaces the source
literal. Missing source precision, pressure, tolerance, or calibration class
remains missing. A pedagogical approximation is allowed only when its scope is
visible in the source record and it is not promoted to metrology evidence.

## Consequences

Positive consequences:

- visual assets carry instrument semantics instead of generic decoration;
- historical worlds can preserve serializable geometry/profile identity;
- LOD output is reproducible without reintroducing a drawing generator;
- catalogue breadth can grow independently from visual approval status;
- future detachable tubes, stoppers, ports, and connectors have explicit
  identity surfaces without making pointer gestures world truth.

Costs and limits:

- four manually authored masters are slower than a generic generator;
- package audits cannot prove visual taste, realism, or owner approval;
- many catalogue sizes remain planned/reference-only until separately authored
  and reviewed;
- this ADR does not authorize M6 S3, M7 interaction, or M8 persistence work.

## Verification

```text
node tools/create_gold_master_assets.mjs
pnpm verify:m6-gold-master
pnpm verify:m6-master-packages
pnpm verify:m6-instruments
pnpm verify:m6-render-geometry
pnpm typecheck:tests
pnpm exec vitest run packages/render/src/assets/instrument-marking.test.ts packages/render/src/assets/gold-master.test.ts
```

These commands prove package and contract invariants only. They do not replace
the required owner visual review or the final committed-baseline attestation.

## Reversibility

The compiler can be replaced while preserving the package contract. A future
asset pipeline may use another authoring format or raster/vector backend only
if it preserves source-backed instrument semantics, content-addressed frozen
identity, explicit approximation, LOD provenance, and the separate owner
visual gate.
