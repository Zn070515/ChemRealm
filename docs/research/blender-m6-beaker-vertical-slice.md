# Blender M6 beaker vertical slice

Status: **S2 spike / candidate evidence only**. This document records the
first Blender-backed experiment; it does not accept an asset, change M6 S3, or
define an MCP platform.

## Contract alignment

The governing inputs are:

- [`GOAL.md`](../../GOAL.md), especially the single scientific truth layer,
  format-neutral but package-strict visual pipeline, local-first operation,
  and the prohibition on prototype art entering the release path;
- [`apparatus-standard.md`](../visual/apparatus-standard.md), for millimetre
  coordinates, orthographic experiment/measurement views, dark/light review,
  named viewports, LOD identity, and visual review boundaries;
- [`m6-art-direction.md`](../visual/m6-art-direction.md), for the NOBOOK-level
  clarity benchmark, original artwork requirement, restrained glass treatment,
  and asset-specific rather than batch-generated silhouettes;
- [`ADR-0018`](../adr/0018-hybrid-apparatus-asset-pipeline.md), for the hybrid
  package: editable source, authored visual body, structured runtime layers,
  semantic manifest, provenance, exports, and hashes;
- the active M6 hybrid specification, for the four first-wave LOD roles,
  dynamic/runtime separation, and the rule that a visual package does not own
  chemistry or world truth;
- the current M6 evidence packet, which keeps the existing procedural SVG
  family rejected and requires owner visual review before any Gold Master
  claim.

## Existing ChemRealm truth consumed

The job reads, rather than redefines:

1. `packages/render/src/assets/gold-master-construction.json` for the
   `beaker-250ml` identity, nominal capacity, physical envelope, family
   anatomy, marking semantics, and source claims;
2. `assets/apparatus/masters/beaker-250ml/measurement-sheet.json` for the
   existing source/derived/approximate landmark record;
3. `assets/apparatus/masters/beaker-250ml/source-record.md` for cited source
   scope and the explicit `approximate-contained` marking boundary;
4. the rejected legacy SVG at
   `assets/apparatus/masters/beaker-250ml/master.svg` for A/B comparison only;
5. the central version manifest through the generated Blender toolchain
   record.

The current beaker record does **not** expose a frozen
`VolumeProfileSnapshot`. This vertical slice therefore does not generate one,
does not infer `V(h)` or `h(V)`, and does not claim a volumetric measurement
contract. The existing 25–200 mL marks remain approximate contained-volume
visual marks.

## What Blender may generate

Blender is an M6 authoring/rendering/validation backend for this slice. It may
generate:

- an editable `.blend` source;
- asset-specific mesh, rim, base, spout, markings, highlights, and glass
  material layers;
- orthographic review cameras and controlled lights;
- light-neutral, dark-neutral, thumbnail, close-up, and transparent exports;
- structured QA reports, render metadata, source hashes, and output hashes.

The source is intentionally asset-specific. It is not a generic beaker-family
generator and it does not automatically create later capacities.

## What Blender must not own

Blender must not decide or mutate:

- chemical identity, amount, composition, pH, activity, indicator spectrum,
  optical path, or chemical colour;
- World Runtime events, replay state, branch state, or persistence truth;
- the authoritative `VolumeProfileSnapshot`, capacity, `V(h)`, or `h(V)`;
- ObservableModel policy or learning/ACE decisions.

If a future frozen profile is supplied, Blender may validate its identity and
consume it for visual geometry. It must not synthesize or replace it.

## First-round success standard

The slice is a successful **candidate experiment** only when all of the
following are reproducibly available:

- the Blender source rebuilds from the job without MCP or GUI state;
- the source uses the central Blender 5.2.2/build identity;
- named semantic parts, millimetre scale, physical envelope, camera mode,
  materials, and dependencies pass structured QA;
- the render matrix contains front light/dark, thumbnail light/dark, rim and
  spout close-ups, and an alpha export;
- output metadata records settings and hashes without treating an image hash
  as cross-platform scientific truth;
- a same-size, same-background A/B sheet compares the candidate with the
  rejected SVG;
- the result is visibly more than a procedural icon: silhouette, wall/rim,
  spout, glass depth cues, markings, dark/light readability, and thumbnail
  identity can be reviewed by the owner.

## First-round failure standard

The slice fails if any of these occur:

- the job depends on MCP, a live GUI, an untracked manual edit, or an
  unresolved external file;
- the asset invents capacity/profile/chemistry truth;
- the physical envelope, semantic IDs, units, or camera contract diverges;
- a required render, background, alpha, close-up, or thumbnail is missing;
- the visual still reads as the rejected procedural icon, has uncontrolled
  edges/bleed, or is not legible on both neutral backgrounds;
- QA relies on Python `assert`, self-reported hashes, or unstructured logs;
- the result is described as Gold Master, M6 S3, or NOBOOK-equivalent without
  owner visual review.

## Evidence boundary

The source `.blend`, render metadata, QA JSON, A/B sheet, and clean rebuild
command are prototype evidence for the Blender backend decision. They do not
prove:

- M6 S3;
- family-wide visual consistency;
- browser/runtime integration;
- final `V(h)` / `h(V)` correctness;
- optical or indicator correctness;
- cross-GPU pixel identity;
- that Blender is worth wrapping in MCP.

After this slice, the next decision is explicitly one of: reject Blender;
retain it for manual authoring; retain scripts without MCP; or design a
ChemRealm-owned MCP/addon boundary. No option is assumed in advance.

## GPU review decision

This machine has the pinned RTX 4090 OptiX backend, so GPU is the preferred
interactive/review path. The job records the actual backend in render
metadata; CPU remains an explicit fallback rather than the default master
backend. Repeated OptiX renders show only sparse low-amplitude transparent
edge differences, while CPU/OptiX comparison shows that backend pixels are not
an identity contract. Geometry, semantic IDs, configuration, QA, and source
hashes remain the portable evidence. This is why GPU is used for the candidate
render matrix without claiming cross-device bit identity.
