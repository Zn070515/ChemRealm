# CLAUDE.md

> Audience: Claude Code / Claude-style coding agents working in this repository  
> Priority: Operational agent rules  
> Must be read together with `GOAL.md`, relevant ADRs, specs, and local package instructions.

# 1. Prime Directive

Do not optimize for “finishing the ticket.”

Optimize for producing a stage result that is:

- scientifically defensible;
- architecturally consistent;
- reproducible;
- testable;
- visually reviewable when applicable;
- privacy-safe;
- explicitly accepted against written criteria.

If a shortcut makes the demo look complete while bypassing the project model, it is usually the wrong shortcut.

# 2. Required Reading Before Non-Trivial Work

Before writing a non-trivial spec, plan, or implementation:

1. Read `GOAL.md`.
2. Read this file.
3. Read `AGENTS.md`.
4. Read the nearest relevant package/module README.
5. Read relevant ADRs in `docs/adr/`.
6. Search for existing schemas, adapters, events, models, tests, and content before inventing new ones.
7. Identify which of the four core systems are affected:
   - Scientific Reality Core;
   - World Runtime;
   - Representation Engine;
   - ACE.
8. Identify whether privacy/compliance behavior changes.
9. Identify whether the change modifies a public schema, event, saved-world format, scientific data contract, or content format.

Do not begin from the issue title alone.

# 3. Spec-First Rule

Any substantial feature, cross-package change, scientific-model change, schema migration, renderer subsystem, ACE behavior, or persistent-format change MUST start with a written spec.

A task is “substantial” if any of the following is true:

- affects more than one package;
- introduces a new world/event/schema concept;
- adds or changes scientific calculation;
- changes rendering architecture;
- changes persisted data;
- changes privacy behavior;
- changes learning evidence or ACE behavior;
- introduces a new external dependency of consequence;
- cannot be fully reviewed from a small patch.

Small bug fixes may use a compact plan, but still require explicit acceptance criteria.

# 4. What Every Spec Must Answer

A spec is incomplete unless it answers the sections below.

## 4.1 Problem

- What user or system problem exists?
- What evidence shows it is a real problem?
- Why does it belong in this project?
- Which project principle in `GOAL.md` does it serve?

## 4.2 Scope

- In scope.
- Explicitly out of scope.
- Deferred work.
- Assumptions.
- Dependencies.

Avoid “while we are here” scope expansion.

## 4.3 User-visible behavior

Describe:

- entry conditions;
- happy path;
- important alternate paths;
- error states;
- empty/loading states where relevant;
- expected interaction semantics;
- what the learner/teacher actually sees.

## 4.4 Core ownership

State which core owns each responsibility.

Never put scientific truth in the renderer.  
Never put pedagogy into the World Runtime.  
Never put persistence-specific hacks into scientific models.

## 4.5 Scientific model

If chemistry is affected, specify:

- species/phases represented;
- governing model;
- solver/library/database;
- activity/thermodynamic model where relevant;
- units;
- assumptions;
- validity range;
- fallback behavior;
- model selection rule;
- expected precision/tolerance;
- provenance;
- independent validation source.

If the science cannot yet be modeled correctly, say so.

Do NOT hide an unknown behind a hard-coded answer.

## 4.6 World and event model

If runtime behavior is affected, specify:

- state introduced or changed;
- commands/actions;
- emitted events;
- reducer/state transition;
- timing semantics;
- deterministic replay expectations;
- undo/redo behavior;
- branch/fork behavior;
- serialization impact;
- backward compatibility.

## 4.7 Observable and rendering model

If visual behavior is affected, specify:

- scientific input;
- observable transformation;
- visual state;
- assets;
- animation behavior;
- interaction targets;
- viewport behavior;
- performance target;
- visual baseline evidence.

Do not specify a visual effect without defining what state drives it.

## 4.8 Learning/ACE behavior

If guided learning is affected, specify:

- intended learner capability;
- evidence to observe;
- alternative learner-state hypotheses;
- intervention policy;
- scaffold/fading behavior;
- transfer check;
- failure/ambiguity handling.

Do not infer permanent learner traits from sparse behavior.

## 4.9 Privacy and compliance

State:

- what data is generated;
- what remains local;
- what, if anything, is transmitted;
- retention;
- user-triggered exports;
- whether minors are affected;
- whether the product role changes toward accounts, UGC, tutoring, commerce, or public publishing.

A spec that says “no privacy impact” without checking event/log behavior is insufficient.

## 4.10 Testing and validation

List exact evidence needed for acceptance:

- unit tests;
- integration tests;
- scientific reference cases;
- property/invariant tests;
- replay determinism tests;
- migration tests;
- visual regression screenshots;
- browser tests;
- performance measurements;
- accessibility checks;
- manual review cases.

Each acceptance criterion MUST have a corresponding verification method.

## 4.11 Failure modes

Enumerate likely ways the feature can be wrong.

Examples:

- scientifically plausible but numerically wrong;
- solver converges with invalid model;
- event replay diverges;
- branch mutates parent state;
- observable output looks correct for wrong reason;
- renderer hard-codes chemistry;
- learner evidence is ambiguous;
- local-only data accidentally uploads;
- content file silently falls back to defaults.

## 4.12 Rollback/migration

For public schema/persisted changes:

- migration path;
- compatibility;
- rollback;
- versioning;
- failure recovery.

# 5. Plan-Writing Standard

A plan MUST be executable by another competent agent without rediscovering the architecture.

Every plan step must include:

1. **Purpose** — why this step exists.
2. **Files/modules** — expected touch points.
3. **Contract change** — schemas/interfaces/events changed.
4. **Implementation action** — concrete work.
5. **Tests/evidence** — what proves the step worked.
6. **Stop condition** — what must be true before moving on.

Bad plan:

> Implement titration support.

Good plan:

> Add `LiquidTransferCommitted` to `world-schema`; update reducer to preserve element totals across source/target vessels; add deterministic replay test with 100 serialized transfers; verify parent branch snapshot remains unchanged after fork; no renderer change in this step.

# 6. Plan Ordering

Prefer this order:

1. contracts/schema;
2. validation fixtures;
3. core implementation;
4. adapter/integration;
5. observable model;
6. renderer/UX;
7. ACE behavior;
8. persistence/migration;
9. end-to-end verification;
10. docs/ADR.

When possible, create the failing reference/acceptance test before implementation.

# 7. No Hidden Completion

Never mark a stage complete if it contains undisclosed:

- TODO paths required by the spec;
- fake data;
- placeholder scientific constants;
- deterministic-looking random outputs;
- disabled tests;
- skipped validation;
- mocked production behavior;
- unreviewed license issues;
- visual placeholders presented as final assets.

Temporary scaffolding is allowed only if:

- it is explicit;
- isolated;
- tracked;
- excluded from stage acceptance.

# 8. Scientific Coding Rules

## 8.1 Never encode exam answers as chemistry

Prohibited pattern:

```python
if reagent_a == "FeCl3" and reagent_b == "KSCN":
    color = "blood_red"
```

unless this is explicitly an empirical observable rule behind a documented model interface.

Prefer:

`world state -> scientific species state -> observable model -> rendered color`

## 8.2 Units are mandatory

Scientific quantities MUST use explicit units at boundaries.

Do not rely on comments such as “temperature is K”.

## 8.3 Conservation checks

Where applicable, test:

- element conservation;
- charge conservation;
- mass conservation;
- valid phase totals.

## 8.4 Model-domain checks

A converged solver is not automatically a valid answer.

Validation MUST consider:

- whether the selected scientific model is valid for the state;
- whether required parameters are available;
- whether extrapolation occurred.

## 8.5 Reference cases

Important chemistry MUST have reference cases with provenance.

A reference case should be reproducible independently of the UI.

# 9. World Runtime Rules

- Events must be semantically meaningful.
- Do not store every pointer movement as a domain event.
- Distinguish UI/transient events from persistent world events.
- Reducers should be deterministic unless nondeterminism is explicitly modeled and seeded.
- Branches must not mutate ancestor states.
- Serialized worlds/events require versioning.
- Replay failures are release blockers for affected features.

# 10. Representation Rules

- Renderer does not decide chemistry.
- Observable models must be separately testable.
- Visual behavior must be driven by state.
- Final-path assets require visual review evidence.
- Avoid one-off CSS/Canvas hacks that bypass the renderer architecture.
- Use final visual standards early for representative apparatus, not only at the end.

# 11. ACE Rules

ACE is not an answer generator.

It should preferentially help the learner:

- notice;
- model;
- predict;
- compare;
- test;
- revise;
- transfer;
- become independent.

Do not maximize immediate correctness at the cost of independent reasoning.

Do not over-scaffold strong learners.

Do not assume one error proves one misconception.

# 12. Privacy Rules

Default assumption:

> local unless explicitly designed otherwise.

Before adding telemetry, logging, crash upload, analytics, or server-side learner state, answer:

- what exact value does this data provide?
- can the same goal be achieved locally?
- is the data necessary?
- what does it imply for minors?
- how is consent/retention handled?

No “analytics later” placeholders that silently collect now.

# 13. Third-Party Dependency Rule

Before adding a consequential dependency:

- confirm license;
- confirm maintenance status;
- confirm browser/runtime compatibility;
- isolate behind an adapter when domain-critical;
- document replacement strategy;
- update third-party notices when required.

Scientific solvers and cheminformatics libraries SHOULD be adapter-isolated.

# 14. Stage Acceptance Protocol

A stage is accepted only when all applicable checks below are complete.

## 14.1 Contract acceptance

- schemas reviewed;
- public types versioned as needed;
- no unexplained cross-core coupling;
- backwards compatibility addressed.

## 14.2 Scientific acceptance

- reference cases pass;
- invariants pass;
- model validity checked;
- provenance recorded;
- tolerances justified;
- no silent fallback to scientifically invalid output.

## 14.3 Runtime acceptance

- deterministic replay passes where required;
- undo/redo passes;
- branch isolation passes;
- persistence round-trip passes;
- no event-order race known in accepted flows.

## 14.4 Visual acceptance

- final screenshots captured;
- defined viewports checked;
- visual baseline reviewed;
- no prototype assets in release path;
- visual state matches scientific/observable state.

## 14.5 Interaction acceptance

- Playwright or equivalent core flow passes;
- keyboard/pointer behavior reviewed where relevant;
- invalid action behavior tested;
- obvious dead ends removed.

## 14.6 ACE acceptance

- intended evidence event is actually observable;
- at least one ambiguity/false-inference case tested;
- support can be reduced/faded where designed;
- challenge mode remains usable without forced pedagogy.

## 14.7 Privacy acceptance

- network inspection confirms local-only claims;
- no unexpected identifiers;
- exports are user-triggered;
- no new server retention without explicit spec approval.

## 14.8 Regression acceptance

- full required test suite green;
- no skipped tests added without written justification;
- performance baseline not materially regressed;
- docs/ADRs updated.

# 15. Evidence Packet Required at Stage Completion

When presenting a stage as complete, provide a compact evidence packet.

Minimum format:

## What changed
Short factual summary.

## Acceptance matrix
For every spec criterion:

- criterion;
- pass/fail;
- evidence location.

## Tests
Exact commands and results.

## Scientific evidence
Reference cases, tolerances, solver/model versions.

## Visual evidence
Screenshots/video paths when applicable.

## Runtime evidence
Replay/branch/persistence proof when applicable.

## Known limitations
Explicit list.

## Diff summary
Major files and contracts changed.

Do NOT say “done” without this packet for a substantial stage.

# 16. Strict Failure Policy

The stage FAILS if any critical acceptance criterion fails.

Do not average failures into a “mostly done” score.

Critical blockers include:

- known scientifically wrong output in accepted domain;
- invalid conservation behavior;
- nondeterministic replay where determinism is required;
- branch state corruption;
- privacy behavior contradicting the spec;
- final UI relying on placeholder visuals;
- tests passing only because assertions were weakened;
- undocumented hard-coded chemistry;
- output produced from an out-of-domain model without warning.

# 17. How to Handle Disagreement Between Demo and Model

If the UI “looks right” but the scientific/reference test fails:

> The feature is wrong.

If the scientific state is right but the visual output is wrong:

> The feature is not complete.

If the learner gets the right answer but ACE evidence suggests the route is unsupported:

> Do not claim learning success.

# 18. Definition of Done for a Substantial Feature

A feature is done only when:

- the spec is current;
- implementation matches the spec;
- acceptance evidence exists;
- tests pass;
- scientific claims are validated;
- visuals are reviewed where applicable;
- privacy claims are verified;
- limitations are documented;
- related docs/ADRs are updated;
- no hidden critical TODO remains.

# 19. Agent Behavior

When uncertain:

- inspect the repository;
- inspect reference docs;
- run tests;
- build a minimal reproduction;
- state uncertainty explicitly.

Do not:

- invent API behavior;
- invent scientific constants;
- invent file formats;
- silently broaden scope;
- weaken tests to make CI green;
- replace a hard problem with a fake approximation without saying so.

# 20. Final Review Question

Before asking for owner acceptance, answer this:

> If another agent continues from this exact commit six months later, can they determine what is scientifically true, what is intentionally approximate, what was verified, what remains uncertain, and why the architecture looks this way?

If the answer is no, the stage is not ready.

# 21. Version Control Workflow

## 21.1 Push is pre-authorized

The owner has pre-authorized committing and pushing to `origin/main` in this
repository. Agents **do not ask for confirmation** before pushing a completed
unit of work, and do not wait to be asked.

This standing authorization covers `git add`, `git commit`, and `git push` to
`main` on the existing `origin` remote. It does **not** cover force-pushing,
rewriting published history, changing the remote, or deleting branches — those
still require explicit owner instruction for the specific action.

## 21.2 Commit in small units

Prefer several small, coherent commits over one large one. A unit is a single
logical change that can be reviewed, reverted, or bisected independently.

This is not stylistic. **The commit history is part of this project's evidence
trail**: it is how a later reader determines which finding each change addressed,
when a criterion was satisfied, and what was true at a given commit (§20). A
26-file commit cannot be reviewed, reverted, or bisected, and it makes the
history useless as evidence precisely when it is needed most.

Commit at boundaries such as:

- a contract/schema change together with its tests;
- one finding's remediation, with the finding identifier in the message;
- a spike together with its README;
- one ADR, once its decision is settled.

Do not batch unrelated changes into one commit merely because they happened in
the same working session.

## 21.3 Commit messages carry the reasoning

State *why*, not only *what*. Reference finding identifiers, spec sections, and
ADR numbers. The message is what makes a change reviewable six months later.

A commit may honestly say "WIP" or "partial"; it must not imply completion that
was not demonstrated (§7).

## 21.4 Never bypass the guardrails

Do not use `--no-verify`, `--no-gpg-sign`, or skip hooks to get a commit or push
through. If a hook fails, fix the underlying cause.

## 21.5 Environment notes

### Python: one project, one environment, one command set

Expected environment: **`.venv/` at the repository root**. It is gitignored, so
**a fresh clone does not have it** — create it rather than assuming it exists:

```bash
uv venv --seed --python 3.12 .venv      # only if .venv is absent
uv sync                                 # once pyproject.toml exists (M0)
```

**The canonical commands.** Use these exact strings; they also appear in
`README.md`, `PLAN-0001`, and CI. They are platform-neutral on purpose — the
Windows-only `py` launcher does not exist on the GitHub Actions Ubuntu runner,
so anything containing `py` would fail CI on its first run.

```bash
uv sync                                            # create/refresh .venv
uv run pytest                                      # oracle tests
uv run python tools/check_acceptance_coverage.py   # acceptance coverage
uv pip install <package>                           # add a dependency
```

**Never use the bare `python` / `py` on PATH for project work.** On this machine
it resolves to a global install (3.10–3.13 are all present) and would put
project dependencies somewhere shared. **Install nothing into a global
environment** — everything this project needs goes into `.venv`.

One Python project, at the root: `pyproject.toml` and `.venv` both live at the
repository root; `tools/oracle/` holds source and tests, not its own project
file. `PLAN-0001` M0 creates the root `pyproject.toml`.

The scripts under `tools/` and `spikes/` are standard-library-only today and run
under `.venv` unchanged, so `.venv\Scripts\python.exe tools\...` also works
before M0 lands — but prefer the canonical commands above so the docs and CI
never drift apart.

### Git

Local git config for this repository carries an HTTP proxy (a local VPN
endpoint) and a GitHub noreply commit email. Both are set with `--local` scope,
so they apply only here and require no per-command flags. Do not move them to
global config, and do not commit a real personal email address.
