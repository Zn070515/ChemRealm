# Architecture Decision Records

ADRs record decisions that are cross-cutting, difficult to reverse,
scientifically consequential, format-defining, or dependency-defining
(`AGENTS.md` §19).

## Status vocabulary

| Status | Meaning |
|---|---|
| `Proposed` | Written and reviewable, but not yet binding. Implementation may not depend on it. |
| `Accepted` | Owner-approved. Implementation may depend on it and must comply. |
| `Superseded by ADR-XXXX` | Replaced. Kept for history; do not edit except to mark supersession. |
| `Rejected` | Considered and declined. Kept so the question is not re-litigated from scratch. |

All ADRs created in this round are **`Proposed`**. None becomes `Accepted` until
the owner accepts `SPEC-0001`, because each of them is a load-bearing assumption
of that spec. Treating them as already-accepted would be a false completion claim.

## Index

| ADR | Title | Status | Blocks |
|---|---|---|---|
| [0001](0001-repository-and-workspace-strategy.md) | Repository and workspace strategy | Proposed | M0 |
| [0002](0002-world-event-sourcing.md) | World event sourcing and branch model | Proposed | M1, M2, M8 |
| [0003](0003-scientific-solver-adapter-boundary.md) | Scientific solver adapter boundary | Proposed | M3, M4 |
| [0004](0004-units-and-quantity-representation.md) | Units and quantity representation | Proposed **(revised)** | M1, M3, M5 |
| [0005](0005-local-first-persistence.md) | Local-first persistence and export | Proposed | M8 |
| [0006](0006-renderer-and-observable-architecture.md) | Renderer and observable architecture | Proposed | M5, M6, M7 |
| [0007](0007-deterministic-numeric-and-replay-policy.md) | Deterministic numeric and replay policy | Proposed **(revised)** | M2, M4, M8 |
| [0008](0008-persisted-world-solver-compatibility.md) | Persisted-world solver compatibility | Proposed **(new)** | M8 |
| [0009](0009-ace-control-loop-architecture.md) | ACE control-loop architecture | Proposed **(new)** | M9 |

> **Revision note (2026-09-11, owner review remediation).** ADR-0004 and ADR-0007
> were rewritten rather than amended: the original ADR-0004 overstated what
> branded types guarantee, and the original ADR-0007 let a reproducibility
> constraint select the physical model. Both original texts are superseded in
> full. ADR-0008 and ADR-0009 are new, addressing solver-version compatibility
> and ACE architecture respectively.

## Supporting documents that are not ADRs

| Document | Role |
|---|---|
| [`docs/science/quantity-ontology.md`](../science/quantity-ontology.md) | Authoritative definition of every scientific quantity. Wins over ADR-0004 where they disagree. |
| [`docs/visual/apparatus-standard.md`](../visual/apparatus-standard.md) | Apparatus visual standard and the geometry contract. |
| [`docs/research/scientific-solver-landscape.md`](../research/scientific-solver-landscape.md) | Solver investigation and constant provenance. |

## Conventions

- One decision per ADR. If a decision splits, split the ADR.
- The `## Context` section must state what is true *today*, not what we hope
  will be true. An ADR written against a fictional present is useless later.
- `## Reversibility` is mandatory and must be honest. "Hard to reverse" is a
  reason to be careful, not a reason to avoid deciding.
- An ADR that contradicts `GOAL.md` requires an owner amendment to `GOAL.md`
  first. None of these do; the traceability is noted per ADR.
