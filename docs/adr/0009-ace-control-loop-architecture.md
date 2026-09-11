# ADR-0009: ACE control-loop architecture

- **Status:** Proposed
- **Date:** 2026-09-11
- **Deciders:** Project owner
- **Related:** `GOAL.md` §6.4, §8, §17; `AGENTS.md` §12; `ADR-0001`; `SPEC-0001`
- **Addresses:** owner remediation finding **P2-2**
- **Blocks:** `PLAN-0001` M9

## Context

`SPEC-0001` described the v0 ACE interaction with concrete values woven into the
prose: prompt on the first 5 deliveries, fade after 3 consecutive in-tolerance
predictions, escalate after two same-signed errors, and a fixed set of five
misconception hypotheses.

Every one of those is a **tuning decision made without evidence**. Their specific
values are guesses. The problem is not that they are guesses — it is that writing
them into the architecture makes them load-bearing. Once "5" is a constant in the
control flow rather than a field in a policy object, changing it requires touching
the loop, and the loop acquires an implicit dependency on a number nobody has
validated.

There is a second risk, sharper than the first. `GOAL.md` §8 requires ACE to treat
learner state as uncertain and forbids confident labelling from sparse behaviour.
A control loop built directly around a fixed hypothesis list quietly asserts that
the list is complete — that a wrong prediction can only mean one of these five
things. That assertion has no evidential basis.

## Decision

**Four named abstractions carry the control loop. The v0 values are one
configuration of them, labelled experimental.**

```
EvidenceModel      interaction record -> EvidenceEvent | nothing
       |
BeliefUpdater      EvidenceEvent + prior belief -> posterior belief (with uncertainty)
       |
InterventionPolicy posterior belief + world context -> InterventionIntent
       |
FadingPolicy       evidence history -> scaffold level (full | optional | off)
```

### `EvidenceModel`

Decides **what counts as evidence**. Converts raw interaction records into
`EvidenceEvent`s, or discards them.

- The `GOAL.md` §8 distinction lives here and nowhere else: predictions,
  condition choices, confidence, explanations, transfer attempts are evidence;
  sandbox dragging, repeated deliveries without prediction, aesthetic
  exploration, and accidental clicks are not.
- It must be able to return **nothing**. A learner playing freely produces no
  learner inference, by construction rather than by a filter elsewhere.
- It never reads or writes world state.

### `BeliefUpdater`

Turns evidence into a belief over learner hypotheses, **carrying explicit
uncertainty**.

- The belief representation must be able to express *unknown* as a first-class
  state. If the type cannot represent "I have no idea which of several things
  happened", the honest answer after one wrong prediction cannot be stored, and
  the system will be forced to guess.
- It must not collapse to a point estimate. `GOAL.md` §8 — no permanent trait
  labelling from sparse behaviour.
- It is a pure function of `(prior belief, evidence)`; no clock, no randomness
  (`ADR-0007` §7).

### `InterventionPolicy`

Maps belief plus world context to a plain-data `InterventionIntent` (defined in
`SPEC-0001` §Learning design).

- Returns **data**, never a rendering action. `apps/web` interprets it and may
  decline. This is what keeps `ace → render` forbidden (`ADR-0001` rule 2).
- "Do nothing" is a first-class, always-available intent — the default, not an
  error case.
- **No reachable path constructs an intent that contains the correct answer.**
  This is asserted structurally in tests, not by review.

### `FadingPolicy`

Controls scaffold presence from evidence history. Separate from
`InterventionPolicy` because fading is a property of the *learner's trajectory*,
while intervention is a response to the *current* belief. Conflating them is what
makes scaffold logic impossible to tune independently.

### The v0 configuration

The concrete numbers — first 5 deliveries, 3 consecutive in-tolerance
predictions, escalation on two same-signed errors, and the specific hypothesis
set — become a single named object, `aceV0Policy`, with a comment stating that it
is an initial guess.

```
// Experimental configuration. Chosen by judgement, NOT validated by evidence.
// Replaceable without touching any interface above.
export const aceV0Policy: AcePolicy = { ... };
```

Changing it is a data change. Adding a hypothesis is a data change. Neither
touches the control loop.

## What this slice does and does not establish

**Does:** that the control loop exists, that its boundaries hold (ACE writes only
to its own store; ACE never calls the solver on the learner's behalf; ACE never
mutates chemistry; ACE never writes to the world event log), and that a learner
can complete the whole experiment with ACE entirely disabled.

**Does not, and must never be claimed to:** that any intervention improves
learning, that the hypothesis set is correct or complete, that the fading
schedule is appropriate, or that the evidence model identifies what it claims to.
`GOAL.md` §5.8 — a beautiful animation is not an educational success, and by the
same token a well-structured control loop is not evidence of pedagogy.

**No learning-science claim is made anywhere in this document, and none may be
inferred from the existence of these abstractions.**

## Alternatives considered

**Implement the v0 interaction directly, abstract later.** Rejected. "Later" is
after a tuning value is structural, which is the situation this ADR exists to
prevent. The abstractions are cheap; extracting them from working code is not.

**One monolithic `AceEngine` with internal phases.** Rejected. It is the same
code with worse boundaries: `EvidenceModel` is the only place the §8
evidence/noise rule can live, and `FadingPolicy` is the only thing that can be
tuned without touching intervention logic. Merging them guarantees that a change
to one is a change to all.

**Model learner state as a single misconception label.** Rejected outright.
`AGENTS.md` §12 and `GOAL.md` §8 both forbid labelling a learner from one
response, and a scalar label cannot represent the uncertainty the system actually
has.

**A Bayesian knowledge-tracing implementation now.** Rejected as premature and as
a false precision claim. It would look rigorous and would imply a validated
cognitive model the project does not have. The `BeliefUpdater` interface is
deliberately agnostic so a later, evidence-backed model can replace `aceV0`
without rewriting the loop.

## Consequences

### Positive
- Tuning values are data, so they can be changed — and, more importantly, so they
  can be *wrong* without the architecture being wrong.
- `EvidenceModel` is a single, testable place where the evidence/noise rule lives.
- The claim boundary is explicit: the slice validates the loop, not the pedagogy.
- The `InterventionIntent` boundary makes "no intervention in challenge mode"
  checkable as a data assertion rather than a UI inspection.

### Negative
- Four interfaces and a policy object for one interaction is more structure than
  the interaction itself needs today. That is deliberate: the structure is for
  the second, tenth, and fiftieth interaction.
- The belief representation must be built to express uncertainty from the start,
  which is more work than a scalar.

### Neutral
- Nothing here is user-visible.

## Reversibility

**Moderate.** The interfaces are cheap to keep and, unlike schema decisions, easy
to change while there is one implementation. The part that is expensive to
reverse is the *claim discipline*: once the project says "ACE is adaptive
learning", it is making a claim it cannot support. The data-not-control boundary
and the explicit non-claim are the load-bearing parts.

## Open questions

1. What is the right belief representation for v0 — a hypothesis set with weights,
   or intervals per hypothesis? **Leaning: weighted hypothesis set with an
   explicit `unknown` mass**, which is the minimum that can represent "I do not
   know which of these happened". Confirm at M9.
2. Should `FadingPolicy` be allowed to *un-fade* (restore scaffolding) when
   evidence reverses? **Leaning: yes** — fading that cannot reverse is not
   adaptive, and `GOAL.md` §7 treats model revision as a target capability.
   Confirm at M9.
3. Does `aceV0Policy` belong in `content/` (data-driven, per `GOAL.md` §11) rather
   than in source? **Leaning: source for v0**, moved to content when a second
   policy exists to justify the indirection.
