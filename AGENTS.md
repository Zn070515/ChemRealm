# AGENTS.md

> Audience: Any coding/research agent working in this repository  
> Scope: Tool-agnostic collaboration contract  
> Hierarchy: `GOAL.md` defines project intent. This file defines cross-agent execution discipline. Agent-specific files may add stricter rules but may not weaken these rules.

# 1. Core Rule

Every agent must preserve three forms of integrity:

1. **Scientific integrity** — chemistry must not be faked for convenience.
2. **Architectural integrity** — responsibilities must remain in the correct core.
3. **Evidence integrity** — completion claims must be supported by reproducible evidence.

Speed is secondary to these three.

# 2. The Four-Core Boundary

Every substantial change must identify its owner:

- `Scientific Reality Core`
- `World Runtime`
- `Representation Engine`
- `ACE`

If a change appears to belong to several cores, define interfaces between them.

Do not solve cross-core problems by creating hidden coupling.

Examples:

- Renderer must not choose equilibrium direction.
- Scientific solver must not decide which hint to show.
- ACE must not mutate chemistry to make teaching easier.
- World Runtime must not know exam-specific pedagogy.

# 3. Before Writing a Spec or Plan

An agent MUST first answer:

1. What user/system problem are we solving?
2. Why is it in scope according to `GOAL.md`?
3. Which core(s) does it touch?
4. What existing implementation/contracts already exist?
5. What scientific assumptions are involved?
6. What persistent/event/schema changes are involved?
7. What user-visible behavior changes?
8. What privacy/compliance behavior changes?
9. What evidence will be required to accept the work?
10. What can explicitly remain out of scope?

If these are not known, repository investigation comes before planning.

# 4. Spec Template

Every substantial spec SHOULD contain the following headings.

## Context

What currently exists and why change is needed.

## Goal

A small number of measurable outcomes.

## Non-goals

Explicit exclusions.

## User experience

Observable behavior from the user's perspective.

## Architecture

Affected cores, ownership, interfaces, data flow.

## Scientific design

Models, assumptions, validity, provenance, tolerances, fallback.

## World/event design

State, events, replay, branching, persistence, compatibility.

## Representation design

Observable model, render state, assets, interaction, performance.

## Learning design

Capability target, evidence model, intervention, fading/transfer.

## Privacy/compliance

Data generation, locality, transmission, retention, minors, regulatory impact.

## API/schema changes

Exact contracts.

## Failure modes

How this can fail silently or dangerously.

## Test plan

Tests mapped to acceptance criteria.

## Acceptance criteria

Binary, verifiable statements.

## Rollout/migration

Versioning and compatibility.

## Open questions

Only genuine unresolved questions.  
Do not use this section to hide decisions required before implementation.

# 5. Acceptance Criteria Standard

Acceptance criteria must be:

- observable;
- binary where possible;
- testable;
- tied to evidence;
- independent of agent opinion.

Bad:

> Titration should feel realistic.

Better:

> For the reference HCl/NaOH case at 25 °C, computed pH values at defined titrant volumes stay within the specified tolerance of the accepted reference calculation; pH curve is generated from scientific state, not a pre-authored curve.

Bad:

> Replay works.

Better:

> Replaying the serialized event log from the same initial world and seed produces the same accepted world-state hash at every committed event boundary.

Bad:

> Visuals look good.

Better:

> Final screenshots at the required viewports pass owner visual review against the approved apparatus baseline and contain no prototype asset labels.

# 6. Plan Template

For every implementation step provide:

- step objective;
- files/packages;
- interfaces touched;
- implementation detail;
- tests to add/run;
- expected evidence;
- stop/go condition.

A plan is not a todo list.  
It is an ordered argument for how the stage becomes verifiably correct.

# 7. Stage Gates

Use the following default stage gates.

## S0 — Investigated

Exit criteria:

- repository/current behavior understood;
- relevant prior art/references identified;
- unknowns listed;
- no implementation claim.

## S1 — Specified

Exit criteria:

- spec complete;
- interfaces defined;
- acceptance criteria mapped to evidence;
- risks and non-goals explicit.

## S2 — Implemented

Exit criteria:

- code/content written;
- local targeted tests pass;
- no hidden production-critical stub;
- implementation matches current spec.

## S3 — Verified

Exit criteria:

- scientific/runtime/visual/privacy checks complete as applicable;
- end-to-end acceptance criteria pass;
- evidence packet assembled;
- regressions checked.

## S4 — Release-ready

Exit criteria:

- build reproducible;
- docs current;
- migrations/versioning resolved;
- known issues recorded;
- owner review complete for stage-sensitive changes.

An agent MUST NOT label S2 work as “finished” when S3 evidence is missing.

# 8. Mandatory Evidence by Change Type

## Scientific calculation

Must include:

- reference inputs/outputs;
- source/provenance;
- tolerance;
- model and database versions;
- conservation/invariant checks;
- out-of-domain behavior;
- at least one adversarial/boundary case.

## Event/runtime change

Must include:

- event schema test;
- reducer/state transition test;
- replay test;
- serialization round-trip;
- branch isolation if relevant;
- version compatibility if persisted.

## Rendering change

Must include:

- deterministic fixture world;
- screenshot(s);
- viewport coverage;
- visual-regression or manual baseline evidence;
- proof that visual state derives from approved observable state.

## ACE/learning change

Must include:

- learner capability being targeted;
- evidence events;
- at least two plausible learner-state interpretations;
- intended intervention;
- ambiguity/false-positive check;
- scaffold-removal or transfer check when applicable.

## Privacy-sensitive change

Must include:

- explicit data-flow diagram or description;
- network/storage inspection;
- retention behavior;
- local-vs-server boundary;
- user control/export behavior.

# 9. Scientific Red Lines

Never:

- encode exam-answer lookup tables as general chemistry;
- invent constants or equilibrium values;
- suppress solver failures;
- treat solver convergence as proof of model validity;
- use concentration where activity is required without an explicit approximation;
- present empirical visual behavior as first-principles science;
- hide an out-of-domain calculation behind UI polish;
- alter chemistry because a pedagogical answer is easier.

When simplification is necessary, it must be labeled and localized.

# 10. Content Red Lines

Do not duplicate logic inside individual worlds when it belongs in the engine.

Bad:

`worlds/titration-001.ts` contains a private acid-base solver.

Good:

World content declares state and requirements; shared scientific adapter solves the chemistry.

Content should describe scenarios, not reimplement platform logic.

# 11. Runtime Red Lines

Persistent world events should represent meaningful domain transitions.

Do not persist high-frequency pointer noise as world truth.

Transient UI gestures may be sampled locally for interaction behavior, but they are not automatically domain events or learning evidence.

Do not let branch/fork share mutable state.

# 12. Learning Red Lines

Do not:

- equate short-term correctness with understanding;
- label a learner permanently from one response;
- force advanced explanation onto novices;
- force novice scaffolds onto experts;
- reveal the answer when a smaller intervention can preserve reasoning;
- use sandbox play as high-confidence diagnostic evidence.

The preferred target is growing independence and transfer.

# 13. Privacy Red Lines

Current default:

- no account;
- no identity;
- no mandatory cloud;
- local learner state;
- local sandbox event stream.

Any feature that changes these assumptions requires explicit spec-level owner approval.

Telemetry is not “free.”

# 14. Visual Red Lines

Do not allow:

- prototype art to silently ship;
- inconsistent apparatus perspective/material style;
- chemistry-specific effects implemented as one-off UI hacks;
- layout that hides important experimental state;
- inaccessible interaction targets in core workflows.

The visual bar is part of correctness for a simulation product.

# 15. Review Checklist Before Coding

An agent should be able to say “yes” to all applicable items:

- I know the owning core.
- I know the current schema/interface.
- I know the scientific model and validity.
- I know the acceptance criteria.
- I know what evidence I must produce.
- I know the non-goals.
- I know whether persisted data changes.
- I know whether privacy changes.
- I know how failure will be surfaced.
- I know how another agent will reproduce my result.

If not, continue investigation/specification.

# 16. Review Checklist Before Declaring Completion

- Spec and implementation agree.
- All acceptance criteria are evaluated.
- Failing criteria are not hidden.
- Relevant tests are green.
- No tests were weakened to get green.
- Scientific reference evidence is attached.
- Replay/branch/persistence evidence is attached where relevant.
- Visual evidence is attached where relevant.
- Privacy/network behavior matches the spec.
- Known limitations are explicit.
- Docs/ADRs are current.
- Temporary scaffolding is either removed or explicitly excluded from acceptance.

# 17. Acceptance Matrix Format

Every substantial stage completion should include a matrix like:

| Criterion | Result | Evidence |
|---|---|---|
| Element conservation | PASS | `pytest ...` / fixture |
| Replay determinism | PASS | test path + state hash |
| Visual baseline | PASS | screenshot path |
| Out-of-domain warning | PASS | test case |
| Local-only event log | PASS | network/storage inspection |

If a critical row is FAIL, the stage is not accepted.

# 18. Severity of Findings

Use:

- **P0** — scientific corruption, privacy violation, data corruption, unsafe schema break, false completion claim.
- **P1** — major feature invalid, deterministic/replay failure, serious visual/runtime regression, incorrect accepted-domain result.
- **P2** — important but bounded defect or missing validation.
- **P3** — polish, maintainability, low-risk improvement.

P0/P1 findings block stage acceptance.

# 19. ADR Requirement

Create/update an ADR for decisions that are:

- cross-cutting;
- difficult to reverse;
- scientifically consequential;
- format/schema defining;
- privacy defining;
- dependency-strategy defining.

Examples:

- choosing event sourcing semantics;
- world file versioning;
- scientific solver adapter strategy;
- local-first learner-state storage;
- renderer architecture;
- unit/quantity library.

# 20. Agent Handoff

Before ending substantial work, leave the repository understandable.

A handoff should state:

- current stage gate;
- what is verified;
- what is not verified;
- next blocking decision;
- exact commands to reproduce tests;
- relevant artifacts/screenshots/reference cases;
- outstanding P0/P1/P2 findings.

Do not hand off with “should work.”

# 21. Round Integration Workflow

The default collaboration workflow for this repository is direct integration:

- At the start of each round, work directly in the current shared working tree.
  Do not create or switch to a Git worktree unless the user explicitly asks for
  one.
- At the end of each completed round, run the relevant verification commands,
  inspect the diff, then commit the round's changes and push the current branch
  to its configured upstream remote.
- Do not create a pull request. A normal push is the integration mechanism for
  this repository; do not force-push unless the user explicitly requests it.
- A failed verification, unresolved P0/P1 finding, or incomplete contract is
  not a completed round and must not be described as one. Report the blocker
  and preserve the evidence needed to continue in the same working tree.

# 22. Final Principle

The project's hardest failures will often look superficially successful:

- a beautiful but chemically wrong animation;
- a numerically converged but invalid model;
- a smart-looking hint based on a false learner inference;
- a replayable event stream that quietly violates conservation;
- a polished stage with no reproducible evidence.

Agents are expected to detect and reject these forms of false success.
