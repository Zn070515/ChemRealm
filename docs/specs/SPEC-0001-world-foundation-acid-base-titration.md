# SPEC-0001 — World Foundation & Acid-Base Titration

- **Status:** S1 — Specified (draft for owner acceptance)
- **Date:** 2026-09-11
- **Owner:** Project owner
- **Supersedes:** nothing (first spec)
- **Related ADRs:** 0001, 0002, 0003, 0004, 0005, 0006, 0007 (all `Proposed`, all load-bearing here)
- **Related evidence:** `spikes/solver-validation/`, `docs/research/scientific-solver-landscape.md`
- **Plan:** `docs/plans/PLAN-0001-world-foundation-acid-base-titration.md`

---

## Context

ChemRealm is a new repository. It contains `GOAL.md`, `CLAUDE.md`, and
`AGENTS.md`, and no source code. There is no version control history, no package
manager configuration, and no prior schema to remain compatible with.

`GOAL.md` §17 names acid-base titration as the first serious vertical slice and
states its purpose explicitly: it exists to validate the architecture, not merely
to deliver a chemistry demo. The slice must eventually prove apparatus world
state, event-driven liquid transfer, local replay/undo, acid-base calculation,
weak-acid behaviour, pH and indicator observables, a live pH-volume curve,
final-quality glassware, world branching, macro/micro/symbolic inspection, at
least one guided ACE interaction, local persistence, and exportable diagnostics.

Two facts shape everything below.

**First, the scientific core is cheap here, if we do not over-build it.** An
investigation completed on 2026-09-11 (`docs/research/scientific-solver-landscape.md`)
and a spike (`spikes/solver-validation/`) established that the exact equilibrium
solve for a monoprotic acid plus strong base is a single scalar root-find on the
charge balance. A ~120-line implementation reproduces an independent closed form
to better than 0.0001 pH, reproduces IUPAC-traceable acetate buffer standards to
within 0.012 pH, and conserves charge to 6.9e-18 mol/L. The heavy general-purpose
speciation packages are not required for this domain, and two candidate libraries
(`iapws`, and `pyEQL` which pulls it in) are GPL-3 contamination to be avoided.

**Second, the runtime architecture is expensive, and this slice is where it gets
decided.** Event sourcing, deterministic replay, branch isolation, observables
that do not leak into the renderer, and provenance that cannot be lost — none of
these are features that can be added later without rewriting whatever exists.
`GOAL.md` §5.4 says a counterfactual branch should be a first-class world
operation, not a special-case feature. That sentence is the reason this spec is
mostly about the World Runtime rather than about chemistry.

## Goal

Measurable outcomes for the slice:

1. A chemical world exists as an append-only event log, from which state is
   reconstructed deterministically and verifiably.
2. A learner can titrate HCl and CH₃COOH with NaOH in that world, see a live
   pH-volume curve, see indicator colour, and read the burette.
3. Two branches from one fork point, differing by one condition, can be compared
   side by side without the parent being affected.
4. Every scientific number in the world is traceable to a named model, a version,
   a validity range, and a reference case.
5. The renderer cannot influence chemistry, proven by a build-time rule and not
   by discipline.
6. The product is honest about what it does not model, in the UI and not only in
   the docs.

## Non-goals

Explicitly out of scope for this slice. Each is a real thing the product will
eventually need; none is a thing this slice should quietly grow into.

- **Polyprotic and multi-equilibria chemistry.** H₃PO₄, H₂CO₃, complexation,
  precipitation, redox. `GOAL.md` §17 names Al(III)–OH⁻ and Fe(III)–SCN as the
  *next* stress cases, after this one. They are not in this slice.
- **Kinetics and non-equilibrium behaviour.** Reaction rates, mixing dynamics,
  diffusion. The slice assumes instantaneous equilibrium, stated as an
  assumption rather than hidden.
- **Temperature variation.** Fixed at 25.0 °C. Not "settable and ignored".
- **A Python service on the production path.** Owner decision, 2026-09-11:
  TypeScript solves at runtime; Python produces oracle values at test time only.
- **Account systems, cloud sync, analytics, AI tutor, forums, uploads.**
  `GOAL.md` §18 non-goals and §20 amendment triggers.
- **More than two indicators and two analytes.** The point is the architecture,
  not content breadth (`GOAL.md` §19).
- **Molecules, crystals, orbital views.** A later slice.
- **Mobile native apps.**

## User experience

### Entry conditions

A learner opens the titration scenario. The world is created from a scenario
definition in `content/`. The flask contains a known volume of a known analyte at
a known concentration; the burette is filled with a known titrant. Nothing has
been delivered yet.

### Happy path

1. The learner sees the flask, the burette, and an empty pH-volume plot.
2. The learner sets a delivery volume and commits it.
3. The pH changes, the liquid level rises, the curve gains a point, the readouts
   update, and — if the indicator is present and the pH crosses its transition —
   the solution colour changes.
4. The learner repeats. The curve takes shape: the shallow buffer plateau for the
   weak acid, the steep rise, the equivalence break.
5. The learner inspects. A micro view shows the species composition; a symbolic
   view shows the equilibrium expressions with the current numbers substituted.
6. The learner forks at any earlier point, changes one thing, and compares the
   two curves.

### Alternate paths

- **Predict-then-observe.** When the ACE scaffold is on, the learner records a
  prediction before committing a delivery. See §Learning design.
- **Fork and compare.** Any committed point can be a fork point.
- **Undo.** The learner can step back through committed deliveries.

### Empty and loading states

- Before any delivery, the plot shows axes and a single point at the initial pH
  rather than an empty box.
- Before the world loads from IndexedDB, a determinate progress state. No spinner
  over a blank canvas.

### Error states

Every one of these is visible to the learner, never silent:

| Condition | Behaviour |
|---|---|
| Model out of domain (T ≠ 25 °C, I > 0.5 mol/L, unmodelled species) | The affected quantity is shown as unavailable with the reason. The world does not produce a number. |
| Solver not converged | Reported as a defect-class error with the residual. Must be unreachable for valid inputs; if reachable, it is a P0 bug. |
| Invalid action (deliver more than the burette holds) | Rejected before commit, with a reason. No event is emitted. |
| Storage full | Warned before the failing write. Existing worlds are never corrupted. |
| Older app, newer data | Refused with a clear message. Never partially migrated. |

### Interaction semantics

- A delivery is committed as a **discrete step**, not a continuous stream. This
  is the concentration of the design: a titration curve is a sequence of
  equilibrium states, and each committed delivery is one event. Dragging a
  slider to choose the volume produces no events until commit.
- Undo and redo move a cursor over the log. They do not delete events.
- Forking is an explicit action with a visible confirmation of the fork point.

### What the learner sees

The apparatus, readouts, the curve, and the two inspection views. No chemistry
jargon is required to operate it. Nothing in the interface claims more precision
than the model has (§Scientific design).

## Architecture

### Core ownership

| Responsibility | Owning core | Must not |
|---|---|---|
| Equilibrium computation, species state, model validity | **Scientific Reality Core** (`packages/sci`) | decide colours, show hints, or know about vessels-as-UI |
| World state, events, reducers, replay, branch, persistence | **World Runtime** (`packages/world`) | embed teaching policy, contain chemistry equations, or know scenario pedagogy |
| Observable model, render state, drawing, charts | **Representation Engine** (`packages/render`) | decide chemistry, or import `packages/sci` |
| Evidence, learner-state hypotheses, intervention choice | **ACE** (`packages/ace`) | mutate chemistry, call the solver on the learner's behalf, or write into the world event log |
| Composition of the four | `apps/web` | absorb logic belonging to any core |

`apps/web` is the only place the cores meet. Import direction is machine-checked
(`ADR-0001` rule 2, `ADR-0006`).

### Data flow

```
UserIntent (transient)
   │            apps/web translates
   ▼
Command ──validate against WorldState──► rejected (no event) | accepted
   │
   ▼
DomainEvent ──appended──► event log ──fold──► WorldState
                                                │
                                                │  (chemistry recomputed by the reducer
                                                │   through the SolverAdapter)
                                                ▼
                                       ScientificState
                                                │
                                                ▼
                                       ObservableModel          packages/render/observable
                                                │
                                                ▼
                                       RenderState              packages/render/state
                                                │
                                                ▼
                                       PixiJS Renderer          packages/render/pixi

ACE reads WorldState + its own evidence store. It writes only to its own store.
```

### Interface summary (exact contracts in §API/schema)

- `SolverAdapter.solve(request) → SolveResult` — a result envelope, never a bare number (`ADR-0003`).
- `reduce(state, event) → state` — pure, deterministic, no clock, no RNG (`ADR-0002`).
- `toObservable(scientificState) → ObservableModel` — pure, no DOM (`ADR-0006`).
- `toRenderState(observableModel) → RenderState` — pure, no PixiJS.

## Scientific design

### Species and phases

Aqueous single phase, dilute, closed system. Species represented in v0:

`H₂O`, `H⁺`, `OH⁻`, `HA` (generic monoprotic acid), `A⁻`, `Na⁺`, `Cl⁻`, plus the
indicator species when an indicator is present (`HIn`, `In⁻`) — but see the
indicator approximation below, which is labelled.

### Governing model

The exact equilibrium system, **not an approximation**:

```
charge balance:    [Na⁺] + [H⁺] = [OH⁻] + [A⁻] + [Cl⁻]
mass balance:      C_A = [HA] + [A⁻]
dissociation:      Ka = γ_H[H⁺]·γ_A[A⁻] / (γ_HA[HA])
water:             Kw = γ_H[H⁺]·γ_OH[OH⁻]
```

Reducing to a single equation in `[H⁺]` for the monoprotic case:

```
f([H⁺]) = C_B + [H⁺] − Kw/[H⁺] − C_A·Ka/(Ka + [H⁺]) = 0
```

`f` is strictly increasing, so the root is unique and a bracketed method
converges unconditionally from a fixed bracket. v0 uses bisection, which requires
no initial guess, cannot fail to converge inside the physical bracket, and uses
only exactly-specified IEEE-754 operations (`ADR-0007`).

**Why not Henderson–Hasselbalch.** It is not merely less accurate; it is
measurably wrong inside the range where it is commonly taught. At 1e-6 M acetic
acid, HH gives pH 5.37 and the exact solve gives 6.02 — a 0.65 pH error
(`spikes/solver-validation`, finding F5). A pedagogical view may *display* the
HH shortcut and say so. The scientific state never comes from it.

### Activity model

Concentration-only chemistry gives pH 4.7449 for the 0.1 M acetate buffer; the
accepted value is 4.644. The gap is the ion activity coefficient. **An activity
model is mandatory, not an enhancement.**

v0 uses the **Davies equation**:

```
log₁₀γᵢ = −A·zᵢ²·( √I/(1+√I) − 0.3·I ),   A = 0.5085 at 25 °C in water
```

Demonstrated agreement with IUPAC-traceable buffer standards: 0.006 pH at 0.1 M,
0.012 pH at 0.01 M. Davies is a general-purpose model; the IUPAC values use the
Bates–Guggenheim convention with ion-specific size parameters, which is the
source of the residual.

### Validity domain and refusal

The solver **must refuse** rather than extrapolate. In scope:

| Constraint | Supported | On violation |
|---|---|---|
| Temperature | 298.15 K exactly | `MODEL_OUT_OF_DOMAIN` |
| Ionic strength | ≤ 0.5 mol/L | `MODEL_OUT_OF_DOMAIN` |
| Acid | monoprotic, strong (HCl) or weak (CH₃COOH) | `MODEL_OUT_OF_DOMAIN` |
| Base | strong monoprotic (NaOH) | `MODEL_OUT_OF_DOMAIN` |
| Solvent | water | `MODEL_OUT_OF_DOMAIN` |
| Phase | single aqueous liquid | `MODEL_OUT_OF_DOMAIN` |
| Concentration | ≥ 1e-9 mol/L and ≤ 0.5 mol/L total analyte | `MODEL_OUT_OF_DOMAIN` |
| Pressure | 1 atm assumed; not a model variable | documented assumption |

`MODEL_OUT_OF_DOMAIN` is a normal return value, not an exception (`ADR-0003`).
The UI shows the affected quantity as unavailable with the reason. **It never
shows a number computed outside the domain.**

### Stated assumptions

1. **Closed system.** No atmospheric CO₂ absorption. This is chemically
   significant: real NaOH solutions carbonate over time, and the
   carbonate/bicarbonate equilibrium is outside this model. Stated in the UI's
   model-inspection view, because it is also a genuine teaching point.
2. **Instantaneous equilibrium.** No kinetics.
3. **Ideal mixing on transfer.** Delivered volume mixes completely and
   immediately; total volume is additive.
4. **Volume additivity.** `V_total = ΣV`. Volume contraction on mixing is not
   modelled; the error is small at these concentrations and is stated.
5. **Constant pressure.** 1 atm; no pressure dependence.
6. **The indicator is modelled as monoprotic** even where it is not (see below).

### Indicator model — empirical, labelled, and range-limited

Colour is an *empirical observable*, not a first-principles calculation.
Phenolphthalein's pink is not derivable from the equilibrium model at this
fidelity. Per `GOAL.md` §12 it must therefore be labelled `empirical`, never
`calculated`.

The model:

```
[In⁻]/[HIn] = Ka_in / [H⁺]        (a ratio — one division, no logarithm, per ADR-0007)
```

The ratio drives a declared colour mixing between the acid-form and base-form
colours, with a stated transition interval. There is **no `if pH > 8.2 then pink`
branch anywhere** (`GOAL.md` §5.3, `CLAUDE.md` §8.1).

| Indicator | Acid form | Base form | Transition interval (25 °C) | `pKa_in` |
|---|---|---|---|---|
| Phenolphthalein | colourless | pink | 8.2 – 10.0 | ≈ 9.4 |
| Methyl orange | red | yellow | 3.1 – 4.4 | ≈ 3.4 |

**Provenance status: textbook/standard values, primary source to be pinned at M4.**
These numbers enter the solver configuration and therefore replay identity
(`ADR-0007` §8), so they must be traced to a citable source before M4's gate
closes. They are marked here as provisional.

**Labelled approximation.** Phenolphthalein is genuinely diprotic (`H₂In`,
`HIn⁻`, `In²⁻`). v0 models it as monoprotic using the dominant transition. This
is an explicit, localized approximation with a stated range: it is adequate for
the 8.2–10.0 teacher-taught interval and is **not** valid for reasoning about the
second transition above pH ~12. The micro/symbolic inspection view says so.

### Unit conventions

Canonical internal units per `ADR-0004`: mol, L, mol/L, K, kPa, s. Serialized
forms carry `{value, unit}`. `Ka` and `Kw` are stored as values, never as pKa
from which a power would have to be computed (`ADR-0007` §1).

### Constants and provenance

| Constant | v0 value | Source status |
|---|---|---|
| `Kw` (25 °C) | 1.0e-14 | Standard; primary source to be pinned at M4 |
| `Ka`(CH₃COOH) | 1.8001e-5 (pKa 4.7447) | Derived from Ka = 1.8e-5. **See open question 1.** |
| HCl | treated as fully dissociated | Model choice, not a constant |
| NaOH | treated as fully dissociated | Model choice, not a constant |
| Davies `A` (25 °C) | 0.5085 | Standard; primary source to be pinned at M4 |
| Indicator `Ka_in` | see table | **Provisional**, see above |

All enter the genesis event's solver configuration and are hashed into replay
identity.

### Expected precision and tolerance

**Established by the spike:**

| Regime | Demonstrated agreement | Stated tolerance |
|---|---|---|
| Strong acid / strong base (non-stoichiometric) | <0.0001 pH vs independent closed form | ±0.005 pH |
| Buffer region, 0.1 M and 0.01 M | 0.006 and 0.012 pH vs IUPAC | ±0.02 pH |
| Dilute strong acid (1e-8 M) | 0.0005 pH vs closed form | ±0.005 pH |

**Stated model tolerance for v0: ±0.02 pH.**

**Explicit gap.** The weak-acid **equivalence region** was NOT independently
validated by the spike. The spike's equivalence check compared the numerical
solve against a textbook closed form and found agreement to 0.0001 pH — but that
validates the *solver*, not the *closed form's* assumptions. There is no
independent reference for this region yet. **This is a real gap, it is where the
pedagogically interesting chemistry lives, and it is closed at M4 by the PHREEQC
oracle and not by another hand-derived formula.**

**Caveat on the oracle comparison (AC-S6).** PHREEQC ships curated log K
databases whose values differ from ours — for example, `pKa` for acetic acid
varies between databases and between textbook printings (see Open question 1).
An oracle comparison therefore compares *two models*, not the solver against
truth, and a systematic offset may legitimately reflect the constant choice
rather than an error.

M4 must therefore:

1. align the oracle's constants to the solver's where the database permits, and
   document every constant it could not align;
2. **report a systematic offset as a finding, never tune it away by adjusting
   our constants to match the oracle.** Adjusting our physics to agree with a
   database is the "make the test pass" failure `AGENTS.md` §16 prohibits;
3. treat a *non-systematic* (shape) disagreement — a divergence that appears only
   in one region of the curve — as a genuine defect requiring investigation
   before M4 closes.

**Display consequence.** The UI shows at most **2 decimal places** of pH, derived
from the ±0.02 tolerance. Showing more would be the exact "precise-looking
numbers" failure `GOAL.md` §5.2 prohibits.

### Reference cases

Independently reproducible, no UI required. Full expected values in
`spikes/solver-validation/README.md`.

| ID | Input | Expected | Source | Tol |
|---|---|---|---|---|
| REF-1 | 0.1 M HOAc + 0.1 M NaOAc, 25 °C | pH 4.644 | IUPAC-traceable (GOST 8.134-98) | ±0.02 |
| REF-2 | 0.01 M HOAc + 0.01 M NaOAc, 25 °C | pH 4.713 | same | ±0.02 |
| REF-3 | 0.1 M HCl, 0.0 / 0.5 / 0.9 eq NaOH | 1.0000 / 1.4771 / 2.2788 | Independent closed form | ±0.005 |
| REF-4 | 0.1 M HCl, 1.0 eq NaOH | pH 7.0000 | Full charge balance | ±0.0005 |
| REF-5 | 0.1 M HCl, 1.1 / 1.5 eq NaOH | 11.6778 / 12.3010 | Independent closed form | ±0.005 |
| REF-6 | 1e-8 M HCl | pH 6.9788 | Independent closed form | ±0.005 |
| REF-7 | 0.1 M HOAc, 1.0 eq NaOH | pH 8.7219 | Textbook closed form `7+½(pKa+logC)` | ±0.03 |
| REF-8 | Charge conservation across a sweep | max \|imbalance\| < 1e-15 mol/L | Invariant | — |

**Rule: reference values are never generated by the code under test.** This rule
is not theoretical — the spike's first run produced two wrong reference values
from sloppy hand-computation, and they were caught only because the references
came from an independent route (finding F7).

### Verification routes

1. **Independent closed form** — for the strong acid/base regimes.
2. **Published standards** — IUPAC-traceable buffer values.
3. **PHREEQC oracle** — test-time only, run as its own CLI in batch mode with
   `phreeqc.dat`. Provides independent multi-component validation and is the
   designated closing mechanism for the equivalence-region gap.
   **Fallback if PHREEQC proves infeasible to install:** the equivalence-region
   gap stays open, downgrades to a weaker oracle (literature anchors only), and
   the tolerance table above is annotated accordingly. It does not get quietly
   dropped.
4. **Invariants** — charge balance, element balance (`Na`, `Cl`, and acid-group
   totals), mass balance, phase consistency, computed on every reference case.

## World/event design

### WorldState

```
WorldState {
  schemaVersion: 1
  worldId: WorldId
  lineage: { parentWorldId: WorldId | null, forkSequence: number, forkStateHash: Hash }
  sequence: number                 // present cursor; not hashed
  solverConfig: { id, version, parameters }
  vessels: Vessel[]
  apparatus: Apparatus[]
  attachments: Attachment[]
  chemistry: { byVessel: Record<VesselId, ScientificState> }
}
```

`Vessel { id, kind, capacity: Litre, contents: { materialId, amount: Mol, phase }[], geometryRef, position }`

`Apparatus { id, kind, position, state }` — a burette's `state` carries
`initialVolume: Litre`; its reading is **derived**, not stored.

`Attachment { childId, parentId, portId }`

### Explicit design decision: observable state is NOT persisted

Observable state (colours, liquid levels, curve points) is a pure function of
`scientific state + observable model version`. Persisting it would create a
second source of truth and would drag the observable model's version into replay
identity, which is not needed.

**Consequence, stated plainly:** if the observable model changes, historical
screenshots change. That is correct. Observables are a projection, not history.
Visual regression baselines are versioned alongside the observable model for
exactly this reason.

### Explicit design decision: chemistry is recomputed, not stored in events

The reducer calls the `SolverAdapter` on each `TransferCommitted`. Events carry
the *action* (`volume transferred`), not the *result* (`resulting pH`).

Rationale: `state = fold(events)` is the honest event-sourcing position. If the
event stored the answer, replay would merely re-read it and would no longer
verify the solver. Recomputation means a solver regression surfaces as a replay
mismatch instead of being masked.

Consequence, stated plainly: **replay requires the same solver version.** A world
created under `acidbase-exact@1.0.0` is not replayable under
`acidbase-exact@1.1.0`. The runtime must:

- refuse to replay under a mismatched solver, rather than producing a different
  hash; and
- offer an explicitly-labelled **re-solve**, which produces a *new* world with a
  new lineage, and is never presented as a replay.

A cached scientific result may be stored for display performance. It is marked
as a cache, is never the source of truth, and deleting every cache must not
change any computed result. This is tested (AC-R5).

### Time semantics

Sequence number is the sole ordering authority. Wall-clock timestamps exist only
as event `meta`, and are excluded from state hashes and replay identity
(`ADR-0002`, `ADR-0007` §6). There is no physical-time simulation: equilibria are
instantaneous, so world time is logical.

### Events (v0)

All events carry `{ seq, type, payload, schemaVersion, meta? }`.

| Event | Payload | Notes |
|---|---|---|
| `WorldCreated` | `{ scenarioRef, solverConfig, seed: null }` | Genesis. Carries solver identity — it is part of replay identity. |
| `ApparatusPlaced` | `{ apparatusId, kind, position }` | Emitted on drop, never during drag. |
| `ApparatusAttached` | `{ childId, parentId, portId }` | e.g. burette clamped above flask. |
| `MaterialCharged` | `{ vesselId, materialId, amount: {value,unit} }` | Initial contents. |
| `TransferCommitted` | `{ fromVesselId, toVesselId, volume: {value,unit}, mechanism }` | The chemically load-bearing event. |
| `WorldBranched` | `{ parentWorldId, forkSequence }` | Recorded in the **child** log. |

**Not events, deliberately:** `pointermove`, `dragframe`, hover, scroll, camera,
animation ticks, live slider position during a drag. `AGENTS.md` §11 and
`CLAUDE.md` §9.

**`BuretteReadingChanged` — rejected.** The reading is derived:
`reading = initialVolume − Σ delivered`. A separate event would be a second
source of truth for one quantity, which is the most reliable way to make replay
diverge.

**`TransferStarted` — deferred, not rejected.** With instantaneous equilibrium a
transfer has no duration in world time, so the event would carry no semantic
content. It becomes real when kinetics arrive.

### Reducer

- Pure. No `Date.now()`, no `Math.random()`, no unordered iteration.
- Quantizes all scientific output before it enters state (`ADR-0007` §4).
- Rejects events whose `seq` is not `state.sequence + 1`. Replay is strictly
  sequential.

### Replay, undo/redo, branch

- **Replay:** from genesis, fold the log. Defined over quantized state
  (`ADR-0007` §5). Requirement: same quantized state hash at every committed
  boundary.
- **Undo/redo:** a cursor move over the log, not a mutation. Undo affects only
  the current branch.
- **Branch:** `worldId` + lineage. The parent log is immutable and never appended
  to by a child. The fork point hands the child a frozen state; the child's
  reduction path allocates rather than mutates. Verified structurally by hashing
  the parent after child mutations (AC-R4), not by convention.
- **Comparison:** two branches are compared by aligning on **cumulative titrant
  volume**, not on step index. Two branches may reach the same volume in a
  different number of steps, and the pedagogically meaningful comparison is at
  equal volume.
- **Snapshots:** every 50 events and always at fork points. A cache, not truth —
  deleting all snapshots must not change any result (AC-R5).

### Persistence and export

IndexedDB only, per `ADR-0005`. Stores: `worlds`, `events`, `snapshots`,
`learnerEvidence`, `aceState`, `contentCache`. No server write path exists.

Export bundle: self-describing, versioned, carries `solverConfig` and
`schemaVersion`, contains no identifiers, and states explicitly whether learner
evidence is included.

## Representation design

### Layering

Per `ADR-0006`. `ObservableModel` is pure TypeScript with no DOM and no PixiJS.
`packages/render` must not import `packages/sci`, enforced by a build-time
dependency rule.

### Layer assignment for this slice

| Element | Layer |
|---|---|
| Glassware geometry, stroke, highlights | Renderer |
| Liquid level | Observable model (volume + vessel geometry) |
| Liquid fill geometry | Renderer |
| Indicator colour | Observable model (empirical model, provenance attached) |
| pH readout value | Observable model; formatted by renderer to 2 dp |
| Burette reading | Observable model (derived) |
| Curve points | Observable model (takes the *state sequence*, not one state) |
| Axes, gridlines, labels, tooltips | Renderer |
| Species composition (micro view) | Observable model |
| Equilibrium expressions (symbolic view) | Observable model |
| Bubbles / precipitate / flame | **Not in v0** |

### Macro / micro / symbolic

- **Macro:** the apparatus view. Apparatus, liquid, colour, burette, readouts, curve.
- **Micro:** v0 is a **species-composition view — a labelled abundance
  representation — not a molecular animation.** This is deliberate. An animated
  particle view would imply dynamics, collisions, and structure that the
  equilibrium model does not contain, which `GOAL.md` §12 forbids presenting as
  science. It is also a genuinely contested pedagogical question (open
  question 3).
- **Symbolic:** the equilibrium expressions actually used, with the current
  numeric substitutions, and an explicit indication of which terms were
  neglected. For the buffer region it can also *display* the Henderson–Hasselbalch
  shortcut **labelled as a shortcut**, with the exact solve alongside it. This
  turns the model's honest behaviour into a teaching asset rather than hiding it.

### Assets

Governed by `docs/visual/apparatus-standard.md`. Assets are authored at M6 against
that standard. **No placeholder art ships**, because nothing ships in this round
and M6 is a gate rather than a task.

Scene convention: orthographic, fixed camera, one world unit = one millilitre of
liquid volume. **Every volumetric asset must publish its interior volume profile**,
because `ObservableModel` computes liquid level from volume. Assets that cannot
publish one are marked `non_volumetric` and accept approximate liquid level.

### Performance targets

| Target | Value | Evidence |
|---|---|---|
| Apparatus scene frame rate | 60 fps at `desktop-primary` | Frame-time capture over a 30 s scripted interaction |
| Delivery commit → updated curve | < 100 ms | Playwright timing |
| Single equilibrium solve | < 5 ms | Unit benchmark (bisection is ~110 iterations of a cheap function; expected ≪1 ms) |
| Replay of 500 events | < 2 s | Benchmark at M8 |

## Learning design

ACE is a control loop, not a hint bank (`GOAL.md` §6.4). This slice implements
one interaction, chosen to prove the architecture rather than to demonstrate
breadth.

### Intended learner capability

**Predicting the *direction and approximate magnitude* of a pH change from a
small titrant addition, and distinguishing the buffer region from the
near-equivalence region.**

This is the capability the weak-acid curve is actually about, and it is the one
where the naive model (`more base ⇒ more neutral`) fails in an instructive way.

### Evidence events

Written to the ACE store, never to the world log:

```
PredictionRecorded { targetSequence, predictedDirection, predictedPh?, confidence: 1|2|3, cumulativeVolume }
PredictionResolved { actualPh, signedError, classification }
InspectionOpened   { view: "micro"|"symbolic", targetSequence }
```

Low-information signals are **not** evidence: sandbox dragging, repeated
deliveries without prediction, aesthetic exploration, accidental clicks
(`GOAL.md` §8). A learner who plays freely generates no learner inference.

### What must not be inferred

A wrong prediction has **at least five** plausible explanations:

1. applying Henderson–Hasselbalch outside its validity range;
2. conflating equivalence with "neutralization to pH 7";
3. misjudging dilution from the added volume;
4. an arithmetic slip;
5. low engagement or a guess.

**ACE must not choose among these from one observation.** It maintains a set of
hypotheses with uncertainty and narrows only with repeated, varied evidence. It
must not label a learner with a trait (`GOAL.md` §8, `AGENTS.md` §12).

### Intervention policy (v0 — deliberately minimal)

Ordered by escalation. **None of them reveals the answer.**

1. **Do nothing.** Always the default. One wrong prediction is not actionable.
2. **Offer a representation switch.** Surface the micro composition view at the
   problem point. This is *noticing* support, not answer-giving.
3. **Offer a contrasting case.** Fork the world and show the same volume added
   in the buffer region versus near equivalence. Difference is the teacher.
4. **Escalate only if the learner asks, or after two consecutive predictions
   with the same *signed* error** — the specific trigger for hypothesis 1 or 2.

Never: state the correct pH; state the misconception; auto-fill a prediction.

### Scaffold fading and challenge mode

- The prediction prompt is presented on the first 5 deliveries.
- After 3 consecutive predictions within tolerance, it becomes an optional
  toggle, defaulting off.
- **Challenge mode disables prediction prompts, hints, and contrast offers
  entirely.** ACE still records evidence but never intervenes. Challenge mode
  must remain fully usable — the product is a simulation, not a course.

### ACE boundaries

ACE reads `WorldState` and the event log. It writes only to its own store. It
must not mutate chemistry (`AGENTS.md` §2), must not call the solver to compute
an answer for the learner, and must not write into the world event log.

**How interventions reach the screen without coupling ACE to the renderer.**
Intervention 2 (representation switch) and intervention 3 (contrasting case)
both require the UI to change. The obvious implementation — ACE importing the
rendering package and opening a panel — would couple two cores
(`GOAL.md` §6) and is forbidden by the dependency rules in `ADR-0001`.

Instead, ACE emits a plain-data value:

```
InterventionIntent =
  | { kind: "none" }
  | { kind: "suggest-inspection", view: "micro" | "symbolic", targetSequence }
  | { kind: "suggest-contrast", forkSequence, volumeA, volumeB }
```

`apps/web` decides how to present it, and may decline. ACE proposes; the
application disposes. This keeps ACE free of any UI dependency, makes every
intervention testable as data (`AC-A5` asserts the challenge-mode intent stream
is empty), and gives the app a single place to enforce that no intervention ever
reveals an answer.

## Privacy/compliance

### Data classification

| Class | Contents |
|---|---|
| **Browser-local** | World state; event log; snapshots; learner evidence; ACE state; content cache. All in IndexedDB. |
| **Server-request** | **Static assets only** — HTML, JS, CSS, images, content JSON. **No API routes exist in v0.** No user data is transmitted. |
| **Explicitly exportable** | World bundle; event log; learner-evidence bundle; rendered screenshots. All user-initiated. |
| **Never collected** | Names; email; phone; school; class; student id; precise geolocation; IP-derived identity; device fingerprints; cross-session identifiers; any server-side learner profile; any third-party analytics of any kind. |

### Network boundary

v0 deploys as **static files only**. There is no backend, no database, no
session, and no upload endpoint. `GOAL.md` §5.5's local-first policy is therefore
enforced by architecture rather than by policy discipline.

**Verified, not asserted:** AC-P2 requires a network inspection during a full
scripted session showing that no request carries learner data.

**All resources are self-hosted. No third-party CDN, font service, or analytics
script may be loaded at runtime.** This is required for three separate reasons,
and the coincidence is worth noting because it means one rule satisfies all of
them:

1. **Privacy.** A font or script loaded from a third party transmits the user's
   IP and referrer to that third party on every page load, silently. That would
   contradict `GOAL.md` §5.5 while every local-first claim in this spec remained
   technically true.
2. **China deployment.** Google Fonts and several common CDNs are unreachable
   from mainland China. A page depending on them degrades or hangs for the
   primary user.
3. **Supply chain.** A runtime-fetched script is code the project does not
   review and cannot pin.

Licenses for any bundled asset must still be recorded per `CLAUDE.md` §13.

**Honest disclosure:** the static host will log request IPs at the infrastructure
level. That is the host's logging, outside the application's control, and must be
disclosed in the user-facing privacy note rather than described as "no data
collected".

### Minors

The target users are Chinese high-school students, many of them minors. The
design avoids personal information processing entirely: no accounts, no
identity, no uploads, no third-party embeds, no advertising technology, no
behavioural tracking. There is no consent problem because there is no collection.

**Any change to this — an account, a sync feature, any telemetry — changes the
regulatory and ethical profile and requires an owner amendment to `GOAL.md` §20
before implementation.** No analytics SDK is to be added, and no "analytics
later" placeholder may silently collect in the meantime (`CLAUDE.md` §12).

## API/schema changes

All contracts live in `packages/schema` and are authored once in TypeScript with
zod; JSON Schema is emitted for the Python oracle (`ADR-0001` rule 1).

### Public contracts introduced

| Contract | Kind | Versioned |
|---|---|---|
| `WorldState`, `Vessel`, `Apparatus`, `Attachment` | Persisted | yes, `schemaVersion: 1` |
| The six v0 events | Persisted | yes |
| `Command` union | Runtime | yes |
| `SolveRequest`, `SolveResult`, `ScientificState`, `Provenance` | Runtime | yes |
| `ObservableModel`, `RenderState` | Runtime | observable model is versioned (affects baselines) |
| Export bundle `chemrealm.export` v1 | Persisted, exchanged | yes |
| Content/scenario definition | Content | yes |
| `PredictionRecorded`, `PredictionResolved`, `InspectionOpened` | ACE-local, persisted | yes |

### Quantity representation

Every serialized quantity is `{ value, unit }` (`ADR-0004`). A missing unit is a
validation error, never a default. Unknown units are rejected.

### Content format

Content files **declare** scenarios; they do not implement chemistry
(`AGENTS.md` §10). A content file may specify initial vessels, materials,
available apparatus, model requirements, representation defaults, and optional
learning goals. It may not contain an equilibrium calculation.

**Unknown species, unknown units, or unmet model requirements are hard errors,
not silent fallbacks.** A content file that cannot be satisfied fails loudly
(`CLAUDE.md` §4.11).

## Failure modes

Enumerated with the detection that makes each one non-silent.

| # | Failure | Detection |
|---|---|---|
| 1 | Scientifically plausible but numerically wrong (HH used outside range) | REF-1..REF-8; adversarial cases REF-6, and the 1e-6 M HH divergence test |
| 2 | Converged solve with an invalid model (Davies at I = 1.0) | Domain check *before* solve; `MODEL_OUT_OF_DOMAIN` test at I = 0.6 |
| 3 | Replay diverges across engines | Quantized state hash (`ADR-0007`); engine-matrix test |
| 4 | Branch mutates the parent | Parent hash after child mutation (AC-R4) |
| 5 | Observable looks correct for the wrong reason (hard-coded colour) | Dependency rule + observable-model tests asserting derived properties |
| 6 | Renderer decides chemistry | Build failure on forbidden import |
| 7 | Learner evidence is ambiguous and ACE infers a false trait | ACE test asserting ≥2 hypotheses retained after one wrong prediction (AC-A3) |
| 8 | Local-only data accidentally uploads | Network inspection (AC-P2) |
| 9 | Content file silently falls back to defaults | Content validation raises; no default path exists |
| 10 | Indicator colour wrong at high pH (monoprotic approximation) | Stated validity range; out-of-range flag; test above pH 12 |
| 11 | Quantization tie flips a hash across engines | Documented residual risk (`ADR-0007` §4); surfaces as a loud hash mismatch |
| 12 | A snapshot is treated as truth | Replay with snapshots deleted (AC-R5) |
| 13 | Solver version drift silently applied to an old world | Replay refuses mismatched solver; re-solve is separately labelled (AC-R6) |
| 14 | Burette reading drifts from vessel state | Reading is derived; test asserts `reading == initial − Σ delivered` |
| 15 | Volume unit confusion (mL/L, factor 1000) | Branded types (`ADR-0004`) make it a compile error; round-trip property test |

## Test plan

Mapped one-to-one to acceptance criteria. Nothing below is "add tests later".

| Type | Coverage |
|---|---|
| Unit — scientific | REF-1..REF-8; invariants; domain refusal; adversarial cases |
| Property | Charge/element/mass conservation over randomized valid inputs; unit round-trip |
| Oracle | PHREEQC CLI comparison over a swept titration; disagreement reported, not averaged |
| Unit — runtime | Every reducer; event schema validation; quantization |
| Integration | Command → validate → event → reduce → state, for each v0 command |
| Replay | Full-log replay hash at every boundary; snapshot-deleted replay |
| Branch | Parent-immutability hash; comparison alignment by cumulative volume |
| Persistence | IndexedDB round-trip; export/import round-trip; migration harness (no-op v1→v1) |
| Visual | Deterministic fixture world; screenshots at 4 named viewports; baseline diff |
| Browser | Playwright core flow: deliver → observe → undo → fork → compare |
| ACE | Evidence event emitted; ≥2 hypotheses retained; fading triggers; challenge mode has no intervention |
| Privacy | Network inspection over a full scripted session; IndexedDB inspection |
| Performance | Frame time; commit latency; solve benchmark; 500-event replay |
| Accessibility | Contrast on readouts; colour not the sole information channel |

## Acceptance criteria

Binary and verifiable. Every criterion maps to an evidence method.

### Scientific

| ID | Criterion | Evidence |
|---|---|---|
| AC-S1 | REF-1..REF-5, REF-7, REF-8 pass within stated tolerances | `pytest tools/oracle`, `vitest packages/sci` |
| AC-S2 | Charge balance residual < 1e-15 mol/L across the reference sweep | invariant test output |
| AC-S3 | Na, Cl, and acid-group element totals conserved across a 100-transfer sequence | conservation test + state dump |
| AC-S4 | Inputs outside the validity domain return `MODEL_OUT_OF_DOMAIN` and produce no number | domain test matrix |
| AC-S5 | The 1e-6 M acetic acid case matches the exact solve, and the HH divergence is reproduced | adversarial test |
| AC-S6 | The PHREEQC oracle agrees with the runtime solver within ±0.02 pH over the swept curve, **including the equivalence region** | oracle comparison report; see the constants caveat below |
| AC-S7 | `Ka`, `Kw`, Davies `A`, and indicator constants are traced to citable sources in `docs/research/` | provenance review; **currently open — see Open questions** |

### Runtime

| ID | Criterion | Evidence |
|---|---|---|
| AC-R1 | Replaying the serialized log produces the same quantized state hash at every committed boundary | replay test |
| AC-R2 | Replay is byte-identical on a second run in the same engine | repeat-run test |
| AC-R3 | Replaying the same log under a perturbed arithmetic path yields the same quantized hash | quantization test (`ADR-0007` open question 1) |
| AC-R4 | After arbitrary child-branch operations, the parent's state hash is unchanged | branch-isolation test |
| AC-R5 | Deleting all snapshots and replaying yields identical results | snapshot-independence test |
| AC-R6 | Replay under a mismatched solver version is refused; re-solve is offered and labelled as a new world | solver-identity test |
| AC-R7 | 500-event replay completes in < 2 s | benchmark |
| AC-R8 | World export → import round-trips to an identical state hash | persistence test |

### Representation

| ID | Criterion | Evidence |
|---|---|---|
| AC-V1 | `packages/render` has no import path to `packages/sci`; the build fails if one is added | dependency-rule test (deliberate violation fixture) |
| AC-V2 | Indicator colour is continuous in the computed ratio, with no threshold branch | observable-model unit test |
| AC-V3 | No hard-coded chemical colour literal exists in the render path | lint / grep-based test fixture |
| AC-V4 | Liquid level is computed from volume and the vessel's published volume profile | observable-model test against a fixture |
| AC-V5 | Screenshots at all four named viewports match the approved baseline | visual regression + owner review |
| AC-V6 | pH is displayed to at most 2 decimal places | DOM assertion in Playwright |

### ACE

| ID | Criterion | Evidence |
|---|---|---|
| AC-A1 | `PredictionRecorded` and `PredictionResolved` are emitted on prediction flows | ACE event test |
| AC-A2 | No ACE state is ever written to the world event log | store-boundary test |
| AC-A3 | After one wrong prediction, ≥2 learner hypotheses remain with non-zero uncertainty | ACE model test |
| AC-A4 | Scaffold fades after 3 consecutive in-tolerance predictions | ACE state test |
| AC-A5 | In challenge mode, no intervention of any kind is emitted, and the flow remains usable | Playwright challenge-mode flow |

### Privacy

| ID | Criterion | Evidence |
|---|---|---|
| AC-P1 | No server API route exists in the v0 build | build artifact inspection |
| AC-P2 | A full scripted session issues no request carrying learner data | network inspection log |
| AC-P3 | IndexedDB contains no identifier, name, or contact field | storage inspection |
| AC-P4 | Export produces a bundle with no identifier field, and states whether learner evidence is included | export schema test |
| AC-P5 | A full page load issues no request to a third-party origin | network inspection; no external font, CDN, or script in the built HTML |

### Content, performance, accessibility

| ID | Criterion | Evidence |
|---|---|---|
| AC-C1 | A scenario is defined entirely in a content file with no chemistry logic | content schema test + review |
| AC-C2 | A content file referencing an unknown species or unit fails loudly, with no default | negative content test |
| AC-F1 | Apparatus scene holds 60 fps at `desktop-primary` | frame-time capture |
| AC-F2 | Commit → updated curve < 100 ms | Playwright timing |
| AC-X1 | Readouts meet WCAG AA contrast | automated contrast check |
| AC-X2 | No scientific information is carried by colour alone | design review + DOM assertion that a numeric readout accompanies colour |

## Rollout/migration

- `schemaVersion` begins at `1`. There is no prior format, so there is no
  migration to perform — but **the migration harness is built now** with a no-op
  `1 → 1` migration, so the mechanism exists and is tested before it is needed.
- Export format `chemrealm.export` begins at `formatVersion: 1`.
- **Forward migration must be explicit and tested.** No automatic best-effort
  migration.
- **Migration failure is loud and non-destructive.** An unmigratable world is
  reported and left untouched. Silent reset is a P0 defect.
- **Downgrade is detected and refused** with a clear message.
- Rollback for v0 is a delete of IndexedDB, which destroys user work — so the
  user is warned, and export is offered as the durable path.

## Open questions

Only questions that genuinely need the owner.

1. **Which acetic acid `Ka` is authoritative?** `Ka = 1.8e-5` implies pKa 4.7447;
   textbooks commonly print 4.75 or 4.76. This value enters replay identity and
   appears in the symbolic view, so it cannot be changed casually. **Recommendation:
   pin `Ka = 1.8001e-5` (pKa 4.7447) as derived from the commonly cited 1.8e-5,
   with the source recorded; note the textbook discrepancy in the symbolic view
   rather than hiding it.**
2. **Is ±0.02 pH an acceptable accuracy claim for the first release?** It is what
   the activity model delivers against IUPAC buffers. A tighter claim would
   require SIT or Pitzer activity models and a larger constant database, which is
   beyond this slice.
3. **Micro view: honest composition, or engaging animation?** A particle view is
   more engaging and is what comparable products do, but it would imply
   dynamics and structure the equilibrium model does not contain. This is a
   pedagogical-ethics decision, not an engineering one. **Recommendation:
   composition view for v0**, with animation revisited only when a model that
   actually supports motion (kinetics) exists.
4. **Should the symbolic view show the Henderson–Hasselbalch shortcut at all?**
   It is what the student is taught, and showing it labelled alongside the exact
   solve is unusually good teaching. Showing it unlabelled would be misinformation.
   **Recommendation: show it, labelled, with the exact solve adjacent.**

## What this spec does not claim

This spec is at **S1 — Specified**. No code exists. No acceptance criterion has
been evaluated. The `±0.02` tolerance is established by an isolated spike for the
buffer and strong-acid regimes only, and **the weak-acid equivalence region
remains independently unvalidated**. Nothing here should be read as a claim that
acid-base titration works.
