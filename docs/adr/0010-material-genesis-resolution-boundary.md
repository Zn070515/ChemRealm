# ADR-0010: Material genesis composition-basis boundary

- **Status:** **Accepted** — M1 Final Closure. Owner, 2026-09-11.
- **Date:** 2026-09-11
- **Deciders:** Project owner review pending
- **Related:** `SPEC-0001` revision 9, `ADR-0003`, `ADR-0004`, `PLAN-0001`
- **Enables:** M2 genesis/reducer implementation within the v0 boundary

## Context

`MaterialDefinition` describes a solution recipe that must become a frozen
`MaterialSnapshot` before the event log is created. A single-solute conversion
from molality to molarity can use

```
c = mρ / (1 + mM)
```

but that formula is explicitly a **single-solute** relation. The content schema
can otherwise express multiple molality solutes and mixtures of molarity- and
molality-basis solutes, even though no current Scientific Reality Core resolver
exists to resolve their shared solution-mass denominator.

Allowing that wider shape would make a valid-looking scenario dependent on an
unsafe resolver implementation. Putting the conversion arithmetic into
`packages/schema` would violate the four-core boundary: schema owns contracts,
while the Scientific Reality Core owns chemistry.

## Decision

For v0, `MaterialDefinition.solutes` is structurally restricted to either:

- zero or more molarity-basis solutes; or
- zero or one molality-basis solute.

Mixed molarity/molality materials and materials with more than one molality
solute are rejected by the schema itself. The same restriction is emitted into
JSON Schema, so TypeScript and Python reject the same invalid content.

The restriction may be removed only after the Scientific Reality Core owns a
joint resolver and supplies scientific evidence. For density `ρ`, molarity-basis
concentrations `c_j`, molality-basis values `m_i`, and molar masses `M`, that
resolver must use:

```
W = (ρ − Σ_j c_j M_j) / (1 + Σ_i m_i M_i)   // kg water per L solution
n_i = m_i W                                // molality-basis amount per L
n_j = c_j                                  // molarity-basis amount per L
```

It must also define positivity/out-of-domain behavior, reference cases,
component conservation, and provenance for every source input before the schema
is widened.

## Alternatives considered

**Implement the joint formula in `packages/schema`.** Rejected. The schema
package is a shared contract leaf and must not become a hidden chemistry engine.

**Keep the wider schema and trust the future resolver.** Rejected. A schema must
not express a state that the current resolver cannot prove correct; otherwise
M2 can persist scientifically ambiguous genesis data.

**Reject all multi-solute materials.** Rejected for v0. Multiple molarity solutes
already have an unambiguous amount-per-volume interpretation and are needed for
future electrolyte/buffer content without changing the contract shape.

## Consequences

- M1 has a truthful, machine-enforced domain boundary.
- M2 can build a reducer against self-consistent genesis snapshots without
  inventing chemistry in the World Runtime.
- A future joint resolver is a deliberate contract expansion and must update
  this ADR, the SPEC, the resolver tests, and the generated artifacts together.
- Buffer and mixed electrolyte content using multiple molality inputs is delayed
  until the Scientific Reality Core evidence exists.

## Reversibility

Moderate. Widening the content union is a schema change and therefore requires a
contract versioning/migration decision before persisted worlds can contain the
new form. The current restriction is backward-compatible with existing v0
content.

## Open questions

None for the v0 boundary. Owner acceptance is recorded as part of M1 S3, so M2
is authorized within this boundary. The scientific joint resolver remains a
future stage decision, not an implicit implementation task.
