# ADR-0011: Freeze scenario-specific scientific inputs at genesis

- **Status:** **Proposed** — M4 Chemical Identity Closure; owner review pending
- **Date:** 2026-09-12
- **Deciders:** Project owner
- **Related:** `SPEC-0001`, `ADR-0002`, `ADR-0003`, `ADR-0004`, `ADR-0007`
- **Blocks:** M4 S3 until the owner accepts the amendment and its evidence

## Context

Indicator equilibrium needs a scientific `Ka_in`, but the indicator selected by
a scenario is not a different global solver model. Putting every indicator
constant into `SolverConfig` would make one solver identity vary with teaching
presentation. Leaving it request-local is worse: a replay could silently read a
changed catalog or lose the value entirely.

The v1 `ScenarioSnapshot` had no place for a resolved indicator definition, so
the old contract could not prove that a later `SolveRequest` used the same
scientific input as the original world.

## Decision candidate

Use the scenario-specific path:

```text
authored Scenario.indicators
        ↓ resolve and attach source-data provenance
WorldCreated.payload.scenarioSnapshot.indicators
        ↓ contentHash / immutable genesis truth
SolveRequest.indicators
```

Each resolved snapshot datum is:

```text
{
  indicatorId,
  kaIn: { value, unit: "1" },
  provenance: DataProvenance
}
```

`kaIn` is canonical and positive. The snapshot owns the frozen value; the
composition layer copies it into a request and must not consult mutable
content during replay. `SolverConfig` continues to contain global model
parameters, including the explicit v0 `waterActivity: 1` convention, but not
scenario indicator constants.

The persisted world/event schema is version 3. Migration `1 → 2` adds
`indicators: []` to legacy records that have no block; migration `2 → 3`
canonicalizes the persisted requirement temperature to Kelvin. Neither step
invents a missing indicator constant. A pre-v2 world whose indicator existed
only in an unpersisted request cannot be represented as having preserved that
input and must not receive a false replay guarantee. The authored `Scenario`
shape is a separate version 3 contract and has its own migration namespace;
removing the ignored `fullyDissociated` field changes authoring validation and
has no automatic v2→v3 rewrite.

Because adding the explicit block changes the snapshot bytes, the World Runtime
migration boundary rebuilds the derived `WorldCreated.payload.contentHash`
before the migrated event is parsed or replayed. The legacy checksum is never
copied over the changed snapshot.

The same checksum rule applies to the persisted v2→v3 temperature
canonicalization: a legacy `{ value: 25, unit: "degC" }` snapshot is migrated
to `{ value: 298.15, unit: "K" }`, then receives a newly computed content hash.

## Alternatives considered

**Put `Ka_in` in `SolverConfig`.** Rejected for this closure: the indicator is a
scenario input, not a change to the solver's model identity.

**Keep `Ka_in` request-local and reload it from content.** Rejected. Mutable
content is outside the genesis event log and would violate self-contained
replay.

**Make snapshot indicators optional.** Rejected for v2 records. An absent block
would make it impossible to distinguish “no indicator selected” from “the
scientific input was forgotten”. Empty selection is represented explicitly by
`indicators: []`.

## Consequences

- Indicator selection and constants participate in the genesis content hash.
- Source-data provenance follows each indicator datum.
- Global solver identity remains reusable across scenarios with different
  indicators.
- The schema artifact and Python consumer must be regenerated and tested with
  the versioned contract.
- Indicator catalog resolution and primary-source acceptance remain M4 evidence
  work; this ADR does not make provisional constants scientifically accepted.

## Acceptance evidence required

- schema tests reject missing provenance, non-canonical units, non-positive
  constants, and unknown indicator fields; runtime snapshot parsing rejects
  duplicate indicator identities;
- runtime parse/serialize round-trip preserves the frozen indicator block;
- changing an indicator value changes the genesis content hash;
- migration tests prove v1 records receive only an explicit empty list;
- a World Runtime migration test rebuilds the derived genesis content checksum
  and proves the migrated event can be loaded;
- request-building tests prove values come from the frozen snapshot rather than
  a mutable catalog.

## Open questions

Owner acceptance of this proposed amendment and the source/precision of each
indicator constant remain open until the M4 evidence packet is complete.
