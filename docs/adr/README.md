# Architecture Decision Records

ADRs record decisions that are cross-cutting, difficult to reverse,
scientifically consequential, format-defining, or dependency-defining
(`AGENTS.md` §19).

## Status vocabulary

| Status | Meaning |
|---|---|
| `Proposed` | Written and reviewable, but not yet binding. Implementation may not depend on it. |
| `Accepted` | Owner-approved. Implementation may depend on it and must comply. |
| `Accepted; amendment proposed` | The baseline remains accepted; the named amendment is reviewable but not yet binding. |
| `Superseded by ADR-XXXX` | Replaced. Kept for history; do not edit except to mark supersession. |
| `Rejected` | Considered and declined. Kept so the question is not re-litigated from scratch. |

**All nine baseline ADRs were accepted by the owner on 2026-09-11**, at baseline
commit `8310c685`, together with `SPEC-0001` revision 6. The M1 Final Closure
amendments to ADR-0001 and ADR-0003, and new ADR-0010, were accepted by the owner
with M1 S3 at implementation commit `295908ec` (CI run `34611467104`). ADR-0003's
M3 owner decisions were accepted with M2 S3 at baseline `778fadbd` (CI run
`34677042056`). Acceptance covers each ADR's *decision*; any remaining open
question must be resolved before the milestone that names it.
ADR-0011 and ADR-0012 were accepted by the owner with M4 S3 at implementation
baseline `bb6a477d` (CI run `34747266204`).

If an accepted decision is later found to be wrong, the ADR is **superseded by a
new ADR**, not quietly edited.

## Index

| ADR | Title | Status | Blocks |
|---|---|---|---|
| [0001](0001-repository-and-workspace-strategy.md) | Repository and workspace strategy | **Accepted** (M1 amendment) | M0 |
| [0002](0002-world-event-sourcing.md) | World event sourcing and branch model | **Accepted** | M1, M2, M8 |
| [0003](0003-scientific-solver-adapter-boundary.md) | Scientific solver adapter boundary | **Accepted** (M1/M3 amendments) | M3, M4 |
| [0004](0004-units-and-quantity-representation.md) | Units and quantity representation | **Accepted** (revised) | M1, M3, M5 |
| [0005](0005-local-first-persistence.md) | Local-first persistence and export | **Accepted** | M8 |
| [0006](0006-renderer-and-observable-architecture.md) | Renderer and observable architecture | **Accepted** | M5, M6, M7 |
| [0007](0007-deterministic-numeric-and-replay-policy.md) | Deterministic numeric and replay policy | **Accepted** (revised) | M2, M4, M8 |
| [0008](0008-persisted-world-solver-compatibility.md) | Persisted-world solver compatibility | **Accepted** (new) | M8 |
| [0009](0009-ace-control-loop-architecture.md) | ACE control-loop architecture | **Accepted** (new) | M9 |
| [0010](0010-material-genesis-resolution-boundary.md) | Material genesis composition-basis boundary | **Accepted** (M1) | M2 |
| [0011](0011-scenario-scientific-input-freezing.md) | Scenario scientific-input freezing | **Accepted** (M4) | M4 |
| [0012](0012-m4-domain-and-constant-semantics.md) | M4 domain and equilibrium-constant semantics | **Accepted** (M4) | M4 |
| [0013](0013-replayable-geometry-and-scientific-frame.md) | Replayable geometry and bound scientific frames | **Proposed** | M5, M6 |
| [0014](0014-native-scientific-core-and-wasm-deployment.md) | Native Scientific Core and WebAssembly deployment | **Accepted** (architecture only; native supersession remains S2) | M4 backend gate, M5, M6 |
| [0015](0015-central-version-manifest.md) | Central version manifest and generated release metadata | **Accepted** (owner direction) | All versioned contracts |

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
