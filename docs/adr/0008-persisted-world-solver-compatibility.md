# ADR-0008: Persisted-world solver compatibility

- **Status:** Proposed
- **Date:** 2026-09-11
- **Deciders:** Project owner
- **Related:** `GOAL.md` §5.4, §9; `ADR-0002`; `ADR-0003`; `ADR-0005`; `ADR-0007`;
  `SPEC-0001`
- **Addresses:** owner remediation finding **P2-3**
- **Applies from:** `PLAN-0001` M8. **Nothing here is implemented now.**

## Context

`ADR-0002` and `ADR-0007` establish that solver identity — id, version, and
parameters — is part of replay identity, and that a world solved under
`acidbase-exact@1.0.0` must not be silently replayed under `@1.1.0`.

That is correct and it creates a problem the earlier documents did not answer.
**Local-first persistence (`ADR-0005`) means a world can live on a user's device
indefinitely.** The application updates; the scientific model improves; the old
solver version stops being shipped. What happens to a two-year-old saved titration?

The naive answers are all wrong:

- **Silently replay with the new solver.** The world's numbers change without the
  user knowing. This is the counterfactual-integrity failure `GOAL.md` §5.4
  exists to prevent, and it can even flip a conclusion a learner drew.
- **Refuse to open the world.** Data loss from the user's point of view, and it
  makes every model improvement a destructive event.
- **Keep every historical solver version forever.** Unbounded bundle growth and,
  worse, a growing matrix of code nobody exercises or maintains.

This ADR records a **strategy and a set of open decisions**, not a mechanism.
`PLAN-0001` M8 owns implementation.

## Decision

### 1. The original record is immutable and always preserved

The event log, the genesis `solverConfig`, the `schemaVersion`, and the original
`Provenance` records are stored verbatim and are **never rewritten by any
upgrade**. A newer application adds information; it does not edit history.

This is non-negotiable and is the whole basis of the rest of this ADR. Every
option below is safe *only* because the original is still there.

### 2. Three availability tiers, always labelled

When a world is opened, the runtime determines what it can honestly do and tells
the user which tier applies.

| Tier | Condition | Behaviour |
|---|---|---|
| **A — Exact replay** | The creating solver version is available | Full replay. `replayHash` must match. The world is exactly as it was. |
| **B — Re-solve** | Solver unavailable, but the model is supported | Re-derive the science with the current solver. Produce a **new derived state**, explicitly marked `re-solved`, keeping **both** provenance records. Never overwrites the original. |
| **C — Archive** | Neither possible | Open read-only. **What is guaranteed viewable: the event log, the canonical state, the world structure, both provenance records, and anything the user explicitly exported or explicitly cached.** What is *not* guaranteed: a previously rendered pH curve or species view, because derived science is never persisted as truth (`ADR-0007` §3). No new simulation. The UI states why. |

Rules that apply across all three:

- **Tier B is never presented as a replay.** It is a re-derivation. The user is
  told which model produced the numbers they are looking at.
- **Tier B never destroys Tier A.** If the original solver returns in a later
  version, exact replay is available again.
- **Tier C is not a failure state.** It is an honest one. A world that can be
  inspected and exported but not continued is far better than one that is
  silently altered or silently dropped.

### 3. Both provenance records survive

After a re-solve, the world carries:

```
originalProvenance : { solverId, solverVersion, parameters, solvedAt, schemaVersion }
currentProvenance  : { solverId, solverVersion, parameters, resolvedAt, reason }
```

Both are shown in the model-inspection view. `GOAL.md` §12 requires provenance;
a re-solve that replaced the original provenance would be a provenance failure
even if the numbers were closer to truth.

### 4. Differing numbers are surfaced, not hidden

When a re-solve produces observably different results, the UI reports it — "these
values were recomputed with model X; the original was model Y; the largest
difference is …" — rather than presenting the new curve as though it were always
the world's curve.

This is a `GOAL.md` §17 situation: if the visual output changed, the feature is
not complete; and if the learner's earlier conclusion is now contradicted, the
system must not silently decide which of the two they saw.

### 5. What the user can always do

- **Export** the world in its original form (`ADR-0005`), including the original
  event log and provenance. Export is the durable escape hatch and must remain
  possible in every tier.
- **See why** a tier applies, in plain language, with the solver identity named.

## Open decisions (owner input required before M8)

These are genuine product decisions, not engineering detail.

1. **Support window.** How many historical solver versions ship in a bundle?
   **Options:** (a) one — current only, so any model change immediately makes old
   worlds Tier B; (b) current plus the previous; (c) every version ever shipped.
   (a) keeps the bundle small and accepts frequent re-solve; (c) is unbounded.
   **Leaning: (b)** — one previous version covers the common "I saved this last
   term" case at bounded cost. Owner decision required.
2. **Version granularity.** Does a *parameter* change (a corrected `Ka`) count as
   a new solver version requiring Tier B, or is it a same-version correction?
   **Leaning: any change to a value in the genesis `solverConfig` is a new
   version**, because those values are hashed into replay identity. Correcting a
   constant without bumping the version would make two different worlds share a
   `replayHash` — the exact failure this design prevents.
3. **Re-solve timing.** Compute the Tier B result on open, or on demand when the
   user asks? **Leaning: on demand**, so opening an old world is fast and the
   user consents to the recomputation rather than discovering it.
4. **Notification before dropping a version.** Should users be warned while exact
   replay is still available, so they can export first? **Leaning: yes, but only
   in the model-inspection view**, not as a modal — this is a durable-state
   concern for a small minority of worlds, not a routine prompt.
5. **Are Tier B results persisted?** Persisting them costs storage and creates a
   third state to keep consistent; recomputing costs a solve per open.
   **Leaning: recompute, cache only in memory**, consistent with `ADR-0007` §5
   (derived science is never persisted as truth).

## Alternatives considered

**Store the derived science in the event log so replay never needs the solver.**
Rejected. It was already rejected in `ADR-0002` for a stronger reason — it would
mean replay merely re-reads answers instead of verifying the solver — and it
would not solve this problem either, since it makes the *stored* values the
source of truth and any correction to the physics permanently unreachable.

**Migrate old worlds to the new solver and update `replayHash` in place.**
Rejected. It destroys the ability to tell whether a divergence is a bug or a
migration, and it makes the hash no longer a property of the inputs.

**Bundle every historical solver version.** Rejected. Unbounded growth, and each
retained version is code that is never exercised, so it rots — a retained solver
that no longer runs is worse than an honest Tier C.

**Freeze the solver entirely and never improve it.** Rejected. It trades a real
capability (`GOAL.md` §5.2, model validity over fake precision) for a convenience.

## Consequences

### Positive
- Model improvement and old-world integrity stop being in tension: both can hold
  at once, because the original is never touched.
- Users can always open their data, and always know which model produced what
  they are looking at.
- The tier system degrades honestly instead of silently.

### Negative
- Three code paths where a naive design would have one, each needing tests.
- `Provenance` display becomes more complex: two records, and a difference report.
- Open decisions above must be settled before M8, and several are product
  judgements rather than technical ones.

### Neutral
- Nothing here changes the v0 slice, which ships exactly one solver version and
  therefore only ever experiences Tier A.

## Reversibility

**Moderate.** The tiers and the immutability rule are cheap to keep. The support
window is the reversible knob — widening it later is easy; narrowing it after
users depend on it is not. That asymmetry, not the technique, is why this
document exists before any code.

## What this ADR explicitly does not do

It does not implement anything, and it does not claim any of it is verified.
`PLAN-0001` M8 owns the implementation and the test that exercises each tier
with a deliberately unavailable solver version.
