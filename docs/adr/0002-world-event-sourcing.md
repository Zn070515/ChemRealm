# ADR-0002: World event sourcing and branch model

- **Status:** **Accepted** — owner, 2026-09-11 (baseline `8310c685`)
- **Deferred decisions:** see the ADR's own `## Open questions` / `## Open decisions`;
  acceptance covers the decision, not the deferred sub-questions.
- **Date:** 2026-09-11
- **Deciders:** Project owner
- **Related:** `GOAL.md` §5.4, §6.2; `CLAUDE.md` §9; `AGENTS.md` §11; `SPEC-0001`
- **Blocks:** `PLAN-0001` M1, M2, M8

## Context

`GOAL.md` §5.4 requires the World Runtime to support deterministic replay,
undo/redo, time travel, branch/fork, compare, reproducible bug reports, local
persistence, and export/import. It also states:

> A counterfactual branch should be a first-class world operation, not a
> special-case feature.

That sentence is the forcing constraint. It rules out treating "compare two
titrations" as a UI feature layered over a mutable world with an undo stack.

The short-term use is concrete and pedagogical: a student predicts what happens
if they add 5 mL instead of 1 mL near the equivalence point. ChemRealm should
answer by forking the world at the decision point, applying the alternative, and
showing both curves — with the parent world untouched.

## Decision

**An append-only event log is the source of truth. World state is a fold over
that log. Branches are log suffixes sharing an immutable prefix.**

### Command / event separation

```
UserIntent      (transient: "user dragged the burette", "user clicked Deliver")
    ↓  intent → command translation (app layer; may be discarded)
Command         (a validated request: DeliverTitrant{ vesselId, volume })
    ↓  validation against current WorldState (may be REJECTED)
DomainEvent     (an accepted, meaningful fact: TitrantDelivered{ ... })
    ↓  reducer (pure, deterministic)
WorldState'     (next state + new state hash)
```

A command that fails validation emits **no** event. Rejection is a returned
result, not a log entry. This keeps the log a record of what happened, never of
what was attempted.

### What is and is not a domain event

Persisted domain events represent meaningful chemical/experimental transitions.
Explicitly **not** domain events: `pointermove`, `dragframe`, hover, scroll,
camera pan, animation ticks, and transient probe readouts during a drag
(`CLAUDE.md` §9, `AGENTS.md` §11).

The test: *if this event were deleted and re-created identically, would the
chemical world be different?* If no, it is a UI event.

Initial event set (`SPEC-0001` owns the full schema):

| Event | Meaning |
|---|---|
| `WorldCreated` | Genesis. Carries a self-contained `scenarioSnapshot` + content hash, the **resolved** solver config, schema version, seed. |
| `ApparatusPlaced` | Apparatus enters the world at a position. Emitted on drop, not during drag. |
| `ApparatusAttached` | A relationship forms: burette clamped above flask, probe in vessel. |
| `MaterialCharged` | Initial contents of a vessel (the "before you start" state). |
| `TransferCommitted` | A volume moved from one vessel to another. The chemically load-bearing event. |
| `WorldBranched` | A child world is created from a fork point. Recorded in the *child* log. |

Two designed-out candidates are worth recording because they are the obvious
first guesses:

- **`BuretteReadingChanged` — rejected as a domain event.** The reading is
  *derived*: `currentScaleReading = initialScaleReading + Σ delivered volume`;
  contained volume is `initialContainedVolume − Σ delivered volume`. Storing either
  reading as an
  event would create a second source of truth for the same quantity, which is
  exactly how replays diverge. The burette's liquid level is vessel state;
  the reading is a projection of it.
- **`TransferStarted` — deferred, not rejected.** With instantaneous equilibrium
  (no kinetics in v0) a transfer has no duration in world time. It becomes a real
  event only when kinetics or rate-limited mixing arrive. Adding it now would
  create an event with no semantic content.

### Time

Sequence number is the sole ordering authority. Wall-clock timestamps are
recorded as **metadata** and are excluded from state hashes and replay identity.
A world is never ordered by, or compared using, wall-clock time.

There is no physical-time simulation in v0: acid-base equilibria are treated as
instantaneous. World time is logical (sequence position). This is stated as an
explicit model assumption, not an accident.

### Replay

Replay equality is defined over the **quantized replay-identity projection**
(`ADR-0007` §§3–5), not raw doubles:

> Replaying a serialized event log from the same genesis world, the same schema
> version, and the same solver configuration produces the same `replayHash` at
> every committed event boundary.

The runtime fold retains the paired arithmetic result of a transfer: one
quantized delta is applied to both vessels and neither post-transfer vessel is
rounded independently. `replayHash` quantizes the explicit independent-state
projection, while a snapshot cache preserves the exact fold representation so
using a cache cannot change the returned state. This is the accepted Strategy A
from `ADR-0007`, not a second conservation policy.

**What the canonical state is** (revised 2026-09-11, rounds 2–3): the
**independent** quantities only —

- material `amount`s (mol) — conserved solutes;
- `waterMass` (kg) — conserved solvent;
- **`liquidVolume` (L)** — operational physical state, updated by transfer and
  entering `replayHash`, because it drives liquid level, the burette reading,
  `c(H⁺)`, and the size of the next transfer (finding P1-A);
- the **`scenarioSnapshot`** carried by genesis, so the log is self-contained
  and never re-reads `content/`;
- world structure.

Species concentrations, activities, and ionic strength are **derived** and are
never quantized independently. Quantizing derived quantities separately
accumulates conservation drift; the spike measured `4.0e-12` for that approach
against `1.4e-15` for quantizing independent amounts (`spikes/numeric-policy`).

Contents live in **exactly one place** — `canonical.byVessel[vesselId]`.
`Vessel` is structure only and carries no `contents` field (finding P1-B).

A second hash, `scienceHash`, covers the derived science and exists to detect a
solver regression — since the reducer **recomputes** chemistry rather than
replaying stored answers.

Replay equivalence is *conditional on solver identity*. A world solved by
solver `acidbase-monoprotic-davies@1.0.0` is not replay-equivalent under
`phreeqc-adapter@2.1.0`, and the runtime must refuse to silently substitute one.
The solver identity is part of the genesis event and therefore part of the log.

**What happens when that solver version no longer ships** is a separate question
the original model of this ADR left open; it is answered by `ADR-0008`'s three
availability tiers.

### Identity is event-sourced too

**Added 2026-09-11 (round 5, finding P1-2).** This ADR's governing claim is that
the event log is the source of truth and `WorldState` is a fold over it. That
was not true: `WorldState` carries `worldId` and `lineage`, and neither
`WorldCreated` nor `WorldBranched` carried them, so

```
WorldState ≠ fold(events)
```

`worldId` was unreconstructable even for a root world. For a flattened child
export it was worse — replaying a genesis-to-tip log could not tell that the
final identity had changed from root to child.

| Field | Written by |
|---|---|
| `worldId` | `WorldCreated` |
| `childWorldId`, `parentWorldId`, `forkSequence`, `forkStateHash` | `WorldBranched` |

**Rule: identity is generated once, when the event is created, and frozen in the
log. Replay reads it; it never regenerates it.** Random generation is therefore
not a source of nondeterminism — the value is an input to the fold, not a
product of it. `SPEC-0001` AC-R19 asserts this by replaying a flattened child log
and comparing the reconstructed identity and lineage against the live world's.

### Snapshots

- A snapshot is taken every `N` committed events (initial `N = 50`) and **always
  at a fork point**.
- A snapshot stores: full serialized `WorldState`, its semantic replay `stateHash`,
  an exact checksum of that serialized state payload, the sequence number,
  schema version, solver configuration, the snapshot `worldId`, the genesis
  `contentHash`, and an exact hash of the event-log prefix through the snapshot
  sequence. Replay accepts a snapshot only when all of those bindings match the
  current log; a snapshot from another world or with an exact-payload mutation
  is ignored.
- Snapshots are a **cache, not truth**. Deleting every snapshot must not change
  any computed result; it only makes replay slower. This is a testable invariant
  and is in `SPEC-0001`'s acceptance criteria.

### Branch model

A branch is identified by `worldId` plus a `LineageRef`:

```
worldId        stable identity of this branch
lineage        { parentWorldId | null, forkSequence, forkStateHash }
```

Rules:

- The parent's event log is **immutable** and never appended to by a child.
- A child stores its own events from `forkSequence + 1` onward.
- Forking is O(1) in memory: the child shares the parent's frozen prefix and
  records only the divergence point.
- **Parent state must not be mutated by a child.** Enforced structurally:
  the fork point hands the child a frozen (deeply immutable / structurally
  shared) state, and the child's reducer path allocates rather than mutates.
  This is verified by a test that hashes the parent after child mutations
  (`SPEC-0001` AC-R4), not merely by convention.
- Comparison of two branches is defined as: align by sequence number or by a
  named logical landmark, then diff the quantized scientific state. Comparing a
  step-indexed titration curve against another step-indexed curve is the primary
  case; aligning by added titrant volume is the pedagogically meaningful one and
  is what the UI uses.

### Undo/redo

Not a mutation. Undo moves the world's *present pointer* to an earlier sequence;
redo moves it forward. Both are views over the same immutable log. Undo after a
fork affects only the current branch.

## Alternatives considered

**Mutable `WorldState` with a command pattern and an undo stack.** Rejected.
Cannot express branch/compare without effectively rebuilding an event log, and
undo-stack semantics do not survive the "fork from any past state" requirement in
`GOAL.md` §5.4.

**Store full state snapshots at every step; no event log.** Rejected. Comparison
of *why* two branches differ becomes impossible, bug reports are not
reproducible, and storage grows with step count × state size rather than
actually shrinking.

**CRDT / operational transform.** Rejected as premature. There is one user and
one writer per world. Multi-writer collaboration is a non-goal (`GOAL.md` §18).

**Derive the burette reading as a stored event anyway, for UI convenience.**
Rejected. Two sources of truth for one quantity is the single most reliable way
to make replay diverge.

## Consequences

### Positive
- Time travel, undo/redo, branch, and compare come from one mechanism rather than
  four features.
- Reproducible bug reports are free: attach the event log.
- The log is a natural, high-information record for ACE evidence, which could
  not be reconstructed from a mutable current-state object.

### Negative
- Memory and storage grow with interaction count. Mitigated by snapshots and a
  compaction policy (M8), but it is real.
- Reducer discipline is a hard requirement: no `Date.now()`, no `Math.random()`,
  no iteration over unordered collections, no floating-point accumulation order
  changes. This needs an enforced convention and review attention.
- Every new event type is a schema change with a version implication.

### Neutral
- Rejection returns a result rather than logging. Slightly more plumbing in the
  command layer; much cleaner log semantics.

## Reversibility

**Hard.** This is format-defining: the persisted world format, the export format,
and the meaning of a state hash all follow from it. Changing the model later
means migrating every saved world. That is why it is an ADR and not a comment.

The mitigation is not "we could change our minds" but "the export format is
self-describing and versioned from day one" (`ADR-0005`), so a future migration
is at least mechanically possible.

## Open questions

1. Snapshot interval `N = 50` is a guess. It should be tuned against a measured
   replay-time budget at M8, and the number recorded here updated then.
2. Nested branch persistence and compaction are deferred to M8. M2 resolves
   the v0 representation as an immutable shared prefix plus an owned suffix;
   only the portability/export boundary materializes a flattened log.
