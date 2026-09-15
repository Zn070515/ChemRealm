# ADR-0018: Hybrid Apparatus Asset Pipeline

- Status: Candidate
- Date: 2026-09-15
- Decision owners: project owner and Representation Engine owner
- Scope: M6 apparatus visual assets and runtime delivery
- Supersedes: the SVG-only materialization assumption in ADR-0017; ADR-0017
  remains historical for the earlier M6 attempt

## Context

ChemRealm's first apparatus batch is structurally useful but visually below the
project's intended bar. It was produced by applying shared procedural SVG
construction rules to many apparatus before a single apparatus had passed
art-directed review.

The project needs both:

- authored visual quality, including asset-specific glass, silhouette,
  proportion, rim, hardware, and subtle material treatment; and
- structured runtime behavior, including semantic parts, masks, liquid levels,
  hit regions, measurement overlays, and deterministic state updates.

NOBOOK is a public quality and interaction benchmark. It does not provide a
license to copy its artwork or implementation. Browser runtimes also support
high-resolution raster textures and structured masks; SVG is not the only
appropriate representation.

## Decision

Adopt a hybrid package:

1. An editable layered source master or a reproducible source record.
2. A high-resolution authored visual body, normally RGBA PNG with WebP/AVIF
   runtime derivatives and PNG fallback.
3. Optional structured SVG/path/mask layers for dynamic clipping, hit regions,
   measurement, and geometry that must remain addressable.
4. A schema-validated semantic manifest for parts, ports, regions,
   capabilities, dimensions, profile identity, provenance, license, and
   export hashes.
5. Runtime Observable-driven layers for liquid, meniscus, indicator
   observation, selection, connection, measurement, and accessibility.

An SVG containing only an embedded raster is not a vector master. A standalone
PNG is not a complete Gold Master package. Both can be admitted only in their
declared package roles.

The current implementation order is one 250 mL Griffin beaker first, followed
by owner review, then the 250 mL Erlenmeyer flask, 25 mL acid burette, and
50 mL base burette. A single unreviewed generator must not define all variants.

## Consequences

### Positive

- Visual quality is no longer constrained by a source-format ideology.
- Raster can carry authored glass/material detail while masks remain
  deterministic and state-addressable.
- Runtime can load textures once and update dynamic layers cheaply.
- Semantic identity and physical profile remain independent of pixels.
- Pixi/WebGL/Canvas/WASM/native helpers can be introduced behind stable
  Observable and package boundaries.
- The old rough SVG package can remain useful as structural test data without
  being mistaken for production art.

### Costs

- Each asset needs source/export records and more than one artifact.
- Visual review becomes a real owner gate rather than a structural test only.
- Asset loading needs format fallback, hashes, and failure handling.
- Layer alignment between authored raster and runtime masks needs QA.
- Tool-specific source files may require a reproducible frozen export when the
  editable source cannot be committed.

## Invariants

- Assets never own chemistry, world truth, or ACE policy.
- Persisted volumetric truth remains a verified serializable profile snapshot.
- Observable state comes from a bound ScientificFrame.
- Dynamic layers cannot introduce a second liquid volume, profile, or indicator
  identity.
- Asset and profile hashes are content-address checks, not merely caller claims.
- Local-first/privacy defaults do not change.
- Native/WASM helpers may optimize an existing contract but may not create a
  second scientific source of truth.

## Rejected alternatives

### SVG-only visual master

Rejected because it encouraged procedural icon construction and made visual
quality subordinate to path generation. SVG remains useful for structured masks
and addressable geometry.

### Single bitmap as the complete asset

Rejected because it cannot by itself provide semantic parts, dynamic liquid
clipping, hit regions, provenance, or replayable profile data.

### One function for every apparatus variant

Rejected because capacity and apparatus differences affect silhouette,
proportion, hardware, graduations, and teaching affordances.

### Runtime caller-supplied executable profile

Rejected because a function with a matching self-reported hash can still
disagree with the persisted profile payload. Runtime geometry must be derived
from a verified snapshot.

## Evidence required

- package/admission negative tests;
- source/export/hash records;
- first-beaker visual review screenshots;
- runtime frame-to-Observable integration;
- profile hash authenticity tests;
- browser screenshots and viewport review;
- backend portability evidence if Pixi/WASM/native helpers are introduced.

## References

- M6 hybrid pipeline specification:
  docs/superpowers/specs/2026-09-15-m6-hybrid-apparatus-asset-pipeline.md
- M6 hybrid pipeline plan:
  docs/superpowers/plans/2026-09-15-m6-hybrid-apparatus-asset-pipeline.md
- NOBOOK Open Platform: https://open.nobook.com/
- Pixi Assets: https://pixijs.com/7.x/guides/components/assets
- Phaser textures: https://docs.phaser.io/phaser/concepts/textures

