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
| [0004](0004-units-and-quantity-representation.md) | Units and quantity representation | Proposed | M1, M3, M5 |
| [0005](0005-local-first-persistence.md) | Local-first persistence and export | Proposed | M8 |
| [0006](0006-renderer-and-observable-architecture.md) | Renderer and observable architecture | Proposed | M5, M6, M7 |
| [0007](0007-deterministic-numeric-and-replay-policy.md) | Deterministic numeric and replay policy | Proposed | M2, M4, M8 |

## Conventions

- One decision per ADR. If a decision splits, split the ADR.
- The `## Context` section must state what is true *today*, not what we hope
  will be true. An ADR written against a fictional present is useless later.
- `## Reversibility` is mandatory and must be honest. "Hard to reverse" is a
  reason to be careful, not a reason to avoid deciding.
- An ADR that contradicts `GOAL.md` requires an owner amendment to `GOAL.md`
  first. None of these do; the traceability is noted per ADR.
