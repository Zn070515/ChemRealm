# ADR-0013 — Replayable geometry and bound scientific frames

**Status:** Proposed — required for M5 S3 review  
**Date:** 2026-09-13  
**Scope:** World Runtime, Scientific Core, Representation Engine

## Context

Liquid level is derived from vessel geometry, while taught pH is derived from
scientific hydrogen-ion amount and the committed solution volume. A mutable
`geometryRef` or a second `liquidVolume` argument would allow a later content
revision or composition wiring mistake to change the visible meaning of an old
world without changing its event log.

The same risk applies to symbolic expressions and pH-volume curves: a DTO may
carry identity-shaped strings while its payload came from a different state.

## Decision

1. Authored vessels declare a serializable piecewise-linear volume profile.
   Resolution canonicalizes its knots, ranges, tolerance, and provenance, then
   computes a content hash over the profile payload excluding the hash field.
2. Persisted `ScenarioSnapshot.vessels[]` stores that `VolumeProfileSnapshot`.
   World Runtime validates the profile hash and requires its maximum volume to
   equal vessel capacity. `geometryRef` remains a visual/content lookup, never
   the source of replay geometry.
3. Persisted World/Event schema version 4 added this requirement. The current
   persisted World/Event schema is version 5; its explicit v4→v5 optical
   admission preserves records without inventing optical data. A v3→v4
   migration without an explicit profile resolver returns `NO_PATH`; the
   migration never invents geometry from a string reference. A Runtime-owned
   genesis boundary rebuilds the derived `contentHash` after migration.
4. `ScientificFrame` is created by the Scientific Core composition factory and
   freezes the source replay-equivalence hash, world sequence, liquid volume,
   and volume-profile hash alongside the deep-frozen scientific state and
   projection. Observable consumes the frame-owned volume and verifies the
   profile hash; it accepts no duplicate volume input. Observable receives the
   matching serializable `VolumeProfileSnapshot` and reconstructs its runtime
   adapter internally, so a caller cannot replace frozen geometry with a
   function-valued object that merely claims the same hash. The schema-owned
   parser recomputes the hash over the hash-excluded payload before restoring
   executable geometry, so a matching hash label cannot authorize changed
   knots, ranges, or provenance.
5. `sourceStateHash` means the quantized World Runtime replay-equivalence
   identity. Exact snapshot-cache integrity remains the separate
   `exactStateHash`; neither name is reused for the other purpose.
6. Hydrogen-ion presentation policies are discriminated by convention. Curve
   points preserve their own source hash and sequence and share one model
   identity. Scientific expressions use schema version 2 and are emitted by a
   Scientific Core producer tagged `scientific-core`; render validates and
   re-presents them without authoring chemistry.

## Consequences

- Old worlds with only a geometry reference need an explicit, reviewable asset
  resolver before they can be loaded into schema v4; loading them into current
  schema v5 also crosses the explicit v4→v5 optical admission boundary.
- A frame cannot be combined with a second volume or a differently hashed
  profile without a boundary error.
- A structurally valid profile cannot be used until its content reproduces its
  declared profile hash.
- Function-valued geometry remains an internal runtime adapter convenience
  reconstructed from serializable data; it is not an Observable input seam.
- Full browser composition and final apparatus visual review remain M5/M6
  work. This ADR does not claim either stage is complete.

## Evidence required

- schema and migration tests for profile presence, hash mismatch, capacity
  mismatch, and resolver-required legacy records;
- frame tests for sequence/profile identity, physical-volume single source,
  deep immutability, and projection consistency;
- render tests for profile identity, policy discriminants, curve identities,
  and producer-tagged symbolic records;
- generated schema drift and full repository CI before M5 S3 review.
