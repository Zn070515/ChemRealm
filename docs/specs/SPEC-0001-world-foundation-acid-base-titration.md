# SPEC-0001 — World Foundation & Acid-Base Titration

- **Status:** S1 — Specified (revision 2, for owner re-review)
- **Date:** 2026-09-11 (revised after owner review remediation)
- **Owner:** Project owner
- **Supersedes:** revision 1 of this spec
- **Related ADRs:** 0001, 0002, 0003, 0004 (rev), 0005, 0006, 0007 (rev), 0008, 0009 — all `Proposed`, all load-bearing here
- **Related evidence:** `spikes/activity-equilibrium/` (scientific formulation),
  `spikes/numeric-policy/` (determinism + branded types),
  `spikes/solver-validation/` (SUPERSEDED — concentration-only formulation)
- **Supporting docs:** `docs/science/quantity-ontology.md` (authoritative quantity
  definitions), `docs/research/scientific-solver-landscape.md`,
  `docs/visual/apparatus-standard.md`
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
and two spikes established that the exact equilibrium solve for a monoprotic acid
plus strong base — with activity coefficients participating *inside* the
equilibrium constraints, on the molality basis — is a two-unknown root-find
solved by nested bisection. Roughly 150 lines reproduce analytic activity
relations to better than 1e-9 pH, reproduce IUPAC-traceable acetate buffer
standards to within 0.012 pH, and conserve charge to 1.4e-17 mol/kg
(`spikes/activity-equilibrium`, 18/18). The heavy general-purpose speciation
packages are not required for this domain, and two candidate libraries (`iapws`,
and `pyEQL` which pulls it in) are GPL-3 contamination to be avoided.

An earlier spike solved a **concentration-only** balance and applied activity
afterwards; it is superseded and must not be cited as evidence for the
formulation above.

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
| Model out of domain (T ≠ 25 °C, `I_m` > 0.5 mol/kg, unmodelled species) | The affected quantity is shown as unavailable with the reason. The world does not produce a number. |
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

### Governing model — activities participate IN the equilibrium

**Revised 2026-09-11 (owner review P1-1).** The previous version of this section
stated an activity-based mass-action model and then solved a concentration-only
residual, applying the Davies equation afterwards as a display correction. That
was not what it said it was. The formulation below is self-consistent: activity
coefficients are solved *with* the speciation, not after it.

Scale is **molality (mol/kg water)** throughout. See
`docs/science/quantity-ontology.md` for why, and `ADR-0004` for the types.

```
charge balance   m_Na + m_H = m_OH + m_A + m_Cl
mass balance     m_HA,tot  = m_HA + m_A
Ka               Ka = a_H·a_A / a_HA = γ_H·m_H·γ_A·m_A / (γ_HA·m_HA)
Kw               Kw = a_H·a_OH       = γ_H·m_H·γ_OH·m_OH
ionic strength   I  = 0.5 · Σ m_i z_i²
Davies           log₁₀γᵢ = −A·zᵢ²·( √I/(1+√I) − b·I )
                 A = 0.509 (mol/kg)^-½,  b = 0.3,  25 °C
neutral species  γ_HA = 1   (bounded approximation — see below)
```

`Ka` and `Kw` are **thermodynamic** constants on the molality basis and are
dimensionless, because `a_i = γ_i·(m_i/m°)` with `m° = 1 mol/kg`.

**Why this is a loop, not an equation.** Substituting the *conditional* constants

```
Kw_c = Kw / (γ_H·γ_OH)          Ka_c = Ka·γ_HA / (γ_H·γ_A)
```

into the charge balance gives exactly the familiar scalar form:

```
m_Na + m_H − Kw_c/m_H − m_A,tot·Ka_c/(Ka_c + m_H) = 0
```

The scalar structure was always right. **What was wrong is that `Kw_c` and `Ka_c`
depend on `I`, which depends on the speciation, which depends on them.** The
earlier formulation froze them as constants. v0 solves the two unknowns `(m_H, I)`
simultaneously, by nested bisection.

**Numerical structure** (derived and measured in `spikes/activity-equilibrium`):

- Bracketing uses the ideal (γ = 1) root and expands by factors of 3, 10, 100,
  1000, smallest first. A wide fixed bracket is *not* usable: far from the root,
  `m_OH = Kw_c/m_H` becomes enormous and the implied `I` leaves the Davies
  domain, so the residual cannot be evaluated at all.
- The outer residual was found **strictly increasing** in `m_H` on all seven
  regimes sampled. This is **numerically verified, not analytically proven**, and
  is stated as such.
- The inner ionic-strength loop is a damped fixed point. M4 replaces it with a
  bracketed inner solve so convergence is guaranteed rather than observed.

**M4 task:** replace the inner fixed point with a bracketed solve, and re-verify
monotonicity across a wider sweep including the domain boundary.

**Why not Henderson–Hasselbalch.** It is not merely less accurate; it is
measurably wrong inside the range where it is commonly taught. At 1e-6 M acetic
acid, HH gives pH 5.37 and the exact solve gives 6.02 — a 0.65 pH error. A
pedagogical view may *display* the HH shortcut and say so. The scientific state
never comes from it.

**Activity coefficients are mandatory, not an enhancement.** Concentration-only
chemistry gives 4.7449 for the 0.1 mol/kg acetate buffer against an accepted
4.644. The 0.10 pH gap *is* the activity coefficient.

Demonstrated agreement with IUPAC-traceable buffer standards with the full
self-consistent solve: **0.0061 pH at 0.1 mol/kg, 0.0112 pH at 0.01 mol/kg**
(tolerance ±0.02). The residual is the Davies model against the
Bates–Guggenheim convention with ion-specific size parameters.

**On `γ_HA = 1`.** Neglecting the Setchenow salting term for the neutral acid
would contribute roughly `+0.02` to `log10 γ_HA` at I = 0.1, moving the buffer
result from 4.6379 to 4.6579. Both lie inside the ±0.02 band. **Measured,
bounded, and recorded — not an unexamined default** (spike finding F6).

### Two hydrogen-ion numbers that must never be conflated

**This is the most consequential consequence of P1-1 for the product.**

| Quantity | Definition | Value for 0.1 M HCl | Used by |
|---|---|---|---|
| Taught quantity | `−lg c(H⁺)` | **0.9993** | high-school view |
| Thermodynamic pH | `pH = −log₁₀ a(H⁺)` (IUPAC) | **1.1064** | scientific view |

Charge balance forces `m_H = m_Cl` for a pure strong acid, so the activity
coefficient shifts the *activity* of the hydrogen ion by exactly
`−log10(γ_H) = +0.107` at I = 0.10. The familiar "pH of 0.1 M HCl is 1.0000" is a
statement about **concentration**, not about pH.

`GOAL.md` §5.1 permits a teaching view to prefer the school heuristic. It does
not permit falsifying the underlying state. Therefore:

- **v0 computes and stores both.** They are distinct types (`Ph` vs a taught
  quantity) and are never silently identified (`ADR-0004`).
- The taught view shows `−lg c(H⁺)`, **labelled as the textbook definition**.
- The scientific view shows `pH = −log₁₀ a(H⁺)` and the activity coefficient.
- The **difference is presented as a teaching asset**, not hidden — the gap
  between concentration and activity is exactly the kind of thing `GOAL.md` §1
  ("Visible") wants made inspectable, and it is a real step from high-school
  heuristics toward the model underneath.

**This is a product decision, not a technical one, and it is flagged for owner
confirmation in Open questions.**

### Validity domain and refusal

The solver **must refuse** rather than extrapolate. In scope:

| Constraint | Supported | On violation |
|---|---|---|
| Temperature | 298.15 K exactly | `MODEL_OUT_OF_DOMAIN` |
| Ionic strength (**molality basis**, `I_m`) | ≤ 0.5 mol/kg | `MODEL_OUT_OF_DOMAIN` |
| Acid | monoprotic, strong (HCl) or weak (CH₃COOH) | `MODEL_OUT_OF_DOMAIN` |
| Base | strong monoprotic (NaOH) | `MODEL_OUT_OF_DOMAIN` |
| Solvent | water | `MODEL_OUT_OF_DOMAIN` |
| Phase | single aqueous liquid | `MODEL_OUT_OF_DOMAIN` |
| Total solute | ≥ 1e-9 mol/kg and ≤ 0.5 mol/kg | `MODEL_OUT_OF_DOMAIN` |
| Species set | closed: `H₂O, H⁺, OH⁻, HA, A⁻, Na⁺, Cl⁻` (+ indicator) | `MODEL_OUT_OF_DOMAIN` |
| Pressure | 1 atm assumed; not a model variable | documented assumption |

Note the unit: `I_m` in **mol/kg**, not mol/L (`ADR-0004`). The two bases are
distinct types precisely so this cannot be confused silently. The domain check
runs **before** the solve on the input totals, **and** is re-checked on the
converged `I_m` — a solution that converges outside the activity model's range is
refused, not returned (`GOAL.md` §5.2).

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
   immediately.
4. **Volume additivity is a DISPLAY approximation only.** The mixture volume is
   estimated by volume additivity; volume contraction on mixing is not modelled.
   This affects the reported molarity, the burette-vessel level, and the liquid
   height — **never the thermodynamics**, which run on molality derived from
   conserved amounts and water mass (`docs/science/quantity-ontology.md`).
   Bounded and labelled; M4 measures the bound over the supported domain.
5. **Constant pressure.** 1 atm; no pressure dependence.
6. **The indicator is modelled as monoprotic** even where it is not (see below).
7. **Neutral-species activity is unity** (`γ_HA = 1`), neglecting the Setchenow
   term. Bounded at `+0.02` in `log10 γ` at I = 0.1; inside tolerance (F6).
8. **Water activity is unity** (`a_w = 1`). Standard dilute-solution convention;
   valid over the supported domain. Not valid at high solute concentration, which
   the domain check excludes.

### Indicator model — empirical, labelled, and range-limited

Colour is an *empirical observable*, not a first-principles calculation.
Phenolphthalein's pink is not derivable from the equilibrium model at this
fidelity. Per `GOAL.md` §12 it must therefore be labelled `empirical`, never
`calculated`.

The model, now activity-consistent (`P1-1`):

```
m_In⁻ / m_HIn = Ka_in · γ_HIn / (a_H · γ_In)
```

with `γ_HIn = 1` (neutral species) and `γ_In` from Davies at the solution's
`I_m`. Note that the ratio depends on the hydrogen-ion **activity**, not its
molality — which is the correct coupling and is why `P1-1` changed this line too.

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

The authoritative ontology is `docs/science/quantity-ontology.md`; the
representation rules are `ADR-0004`. For this slice:

| Quantity | Canonical unit |
|---|---|
| amount | mol |
| water mass | kg |
| volume | L |
| **geometry length** | **mm** |
| molality — **all thermodynamics** | mol/kg water |
| molarity — taught view, display, reagent labels | mol/L solution |
| ionic strength (molality basis) | mol/kg |
| activity, activity coefficient, mole fraction, pH | dimensionless |
| temperature / pressure / time | K / kPa / s |

Serialized forms carry `{value, unit}`; **a missing or unknown unit is a
validation error, never a default**. `Ka` and `Kw` are stored as thermodynamic
**dimensionless** values. Conditional constants are derived at the converged `I`
and are never stored as though they were thermodynamic.

### Constants and provenance

| Constant | v0 value | Basis | Source status |
|---|---|---|---|
| `Kw` (25 °C) | 1.0e-14 | molality, dimensionless | Standard; primary source to be pinned at M4 |
| `Ka`(CH₃COOH) | 1.8001e-5 (pKa 4.7447) | molality, dimensionless | Derived from Ka = 1.8e-5. **Open question 1.** |
| HCl | fully dissociated | model choice | Not a constant |
| NaOH | fully dissociated | model choice | Not a constant |
| Davies `A` (25 °C) | **0.509 (mol/kg)^-½** | **molality basis** | Standard; primary source to be pinned at M4 |
| Davies `b` | 0.3 kg/mol | molality basis | Empirical; primary source to be pinned at M4 |
| `γ_HA` (neutral) | 1.0 | molality basis | **Approximation**, bounded at +0.02 `log10 γ` at I=0.1 (F6) |
| `a_w` | 1.0 | convention | Valid over the supported domain only |
| Indicator `Ka_in` | see table | molality, dimensionless | **Provisional**, see above |

**`A` changed from 0.5085 to 0.509** because the basis changed from molarity to
molality. The two differ by 0.1 %, far below tolerance — but the change is
recorded because an undeclared basis change is exactly the class of silent error
this review was about.

All of the above enter the genesis event's `solverConfig` and are hashed into
replay identity (`ADR-0007` §8). A change to any of them is a new solver version
(`ADR-0008` open decision 2).

### Expected precision and tolerance

**Re-established against the self-consistent formulation** (2026-09-11). The
previous table was measured against the concentration-only solve and is
superseded. Reference values come from `spikes/activity-equilibrium`.

| Regime | Demonstrated agreement | Stated tolerance |
|---|---|---|
| Buffer region, 0.1 mol/kg and 0.01 mol/kg | 0.0061 and 0.0112 pH vs IUPAC | ±0.02 pH |
| Strong acid / base, excess regimes | <1e-9 pH vs analytic activity relation | ±0.005 pH |
| Half-equivalence vs `pKa + log10 γ_A` | 0.0005 pH | ±0.005 pH |
| Dilute strong acid (1e-8 mol/kg) | 0.0003 pH vs full balance | ±0.005 pH |
| Molality vs molarity scale choice | worst 0.00077 pH over the domain | (below tolerance) |

**Stated model tolerance for v0: ±0.02 pH.**

**Explicit gap (unchanged, and now more precisely stated).** The weak-acid
**equivalence region** still has no *independent* reference. The spike's
equivalence figures come from analytic relations and a textbook closed form —
both of which validate the solver's *arithmetic*, not the model's *assumptions*.
The gap is real, it is where the pedagogically interesting chemistry lives, and
it is closed at M4 by the PHREEQC oracle and **not** by another hand-derived
formula.

**Caveat on the oracle comparison (AC-S6).** PHREEQC ships curated log K
databases whose values differ from ours, and — the point that changed with P1-1 —
PHREEQC works in **molality**, so the comparison is now like-for-like on the
scale as well as the constants. An oracle comparison still compares *two models*,
not the solver against truth; a systematic offset may legitimately reflect the
constant choice rather than an error.

M4 must therefore:

1. align the oracle's constants **and its activity convention** to the solver's
   where the database permits, and document every constant it could not align;
2. **report a systematic offset as a finding, never tune it away by adjusting
   our constants to match the oracle.** Adjusting our physics to agree with a
   database is the "make the test pass" failure `AGENTS.md` §16 prohibits;
3. treat a *non-systematic* (shape) disagreement — a divergence appearing in only
   one region of the curve — as a genuine defect requiring investigation before
   M4 closes.

**Display consequence.** The UI shows at most **2 decimal places** of pH, derived
from the ±0.02 tolerance. The taught quantity `−lg c(H⁺)` and the thermodynamic
`pH` are displayed as **separately labelled** values and never interchangeably.

### Reference cases

Independently reproducible, no UI required. Full expected values and derivation
routes in `spikes/activity-equilibrium/README.md`.

| ID | Input | Expected | Source | Tol |
|---|---|---|---|---|
| REF-1 | 0.1 mol/kg HOAc + 0.1 mol/kg NaOAc, 25 °C | pH 4.644 | IUPAC-traceable (GOST 8.134-98) | ±0.02 |
| REF-2 | 0.01 mol/kg HOAc + 0.01 mol/kg NaOAc, 25 °C | pH 4.713 | same | ±0.02 |
| REF-3 | Strong acid/base, **acid** excess (f = 0.0, 0.5, 0.9) | `−log10(m_H) − log10(γ_H)` | analytic activity relation | ±1e-9 |
| REF-4 | Strong acid/base, **base** excess (f = 1.1, 1.5) | `14 + log10(m_OH) + log10(γ_OH)` | analytic activity relation | ±1e-9 |
| REF-5 | 0.1 M HCl, no base — **taught quantity** | `−lg c(H⁺)` = 1.0000 | definition of the taught quantity | ±0.01 |
| REF-6 | 0.1 M HCl, no base — **thermodynamic pH** | pH 1.1064 | `−log10 a(H⁺)` | ±0.02 |
| REF-7 | 1e-8 mol/kg HCl | pH 6.978 | Full balance incl. water | ±0.02 |
| REF-8 | Half-equivalence, 0.05 / 0.1 mol/kg | pH = `pKa + log10(γ_A)` | analytic activity identity | ±0.005 |
| REF-9 | Charge conservation across a sweep | max \|imbalance\| < 1e-14 mol/kg | Invariant | — |
| REF-10 | Molality vs molarity over the domain | max difference ≤ 0.001 pH | Measured bound (F5) | — |

**REF-5 and REF-6 are deliberately both present.** They are the two numbers that
look alike and are not, and having them side by side in the reference set is what
stops a future contributor from "fixing" one to match the other.

**REF-3 and REF-4 are analytic identities, not independent validation.** They
confirm the activity coupling is wired correctly (they caught a sign error in
this spike's own reference), but they cannot validate the model. Only REF-1,
REF-2, and the M4 oracle do that.

**Rule: reference values are never generated by the code under test.** This is
not theoretical. This spike's first run produced three wrong reference values,
and its *analytic* reference had the wrong ion in the base-excess branch
(finding F4). All were caught only because the references came from independent
routes (`AGENTS.md` §8).

### Verification routes

1. **Analytic relations** — charge balance fixes `m_H` in acid excess and `m_OH`
   in base excess, independently of activity. Verified to <1e-9 pH.
2. **Published standards** — IUPAC-traceable buffer values. The only route that
   validates the *activity model itself* rather than the arithmetic.
3. **PHREEQC oracle** — test-time only, driven as its own CLI in batch mode with
   `phreeqc.dat`, in molality. Designated closing mechanism for the
   equivalence-region gap.
   **Fallback if PHREEQC proves infeasible:** the gap stays open, the oracle
   downgrades to literature anchors only, and the tolerance table above is
   annotated accordingly. It does not get quietly dropped.
4. **Invariants** — charge balance, element balance (`Na`, `Cl`, acid-group
   totals), mass balance, phase consistency, on every reference case, **on the
   unquantized solver state** with the tolerances in `ADR-0007` §4.
5. **Numeric-policy checks** — that `detLog10`/`detExp10` meet their stated
   accuracy against arbitrary-precision references, and that conservation
   survives canonicalization (`spikes/numeric-policy`).
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
  canonical: { byVessel: Record<VesselId, CanonicalContents> }
}

CanonicalContents {
  waterMass: Kilogram                       // the conserved solvent quantity
  materials: { materialId, amount: Mol }[]  // the conserved solute quantities
}
```

`Vessel { id, kind, capacity: Litre, contents: CanonicalContents, geometryRef, position }`

`Apparatus { id, kind, position, state }` — a burette's `state` carries
`initialVolume: Litre`; its reading is **derived**, not stored.

`Attachment { childId, parentId, portId }`

### Three levels of state, never conflated

This is the fix for owner finding P1-2 and it is load-bearing (`ADR-0007` §3):

| Level | Contents | Quantized | Persisted | Purpose |
|---|---|---|---|---|
| **Solver state** | full speciation, unquantized float64 | no | no | conservation validation |
| **Canonical state** | `n_i` (mol), `m_w` (kg), world structure | yes | yes | defines replay equality |
| **Derived science** | molalities, activities, `γ`, `I_m`, `pH`, species | no | no | recomputed on demand |

Species, activities, and ionic strength are **derived and never quantized
independently**. The measured consequence (`spikes/numeric-policy`): quantizing
independent per-vessel quantities drifts `4.0e-12` over 100 transfers, while
quantizing the transfer amount once drifts `1.4e-15` — a ~3000× difference, and
the wrong choice is invisible in any single step.

Two hashes follow from the split:

- **`replayHash`** over the canonical state — defines replay equality and
  persistence identity.
- **`scienceHash`** over the derived science — a verification artifact that
  detects a solver regression, since derived values are recomputed rather than
  replayed.

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
(`ADR-0002`, `ADR-0007` §5). There is no physical-time simulation: equilibria are
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
- Quantizes **only canonical independent state** (amounts, water mass, and the
  transfer amount in the event payload). Derived species, activities, and ionic
  strength are never quantized independently (`ADR-0007` §3).
- Rejects events whose `seq` is not `state.sequence + 1`. Replay is strictly
  sequential.

### Replay, undo/redo, branch

- **Replay:** from genesis, fold the log. Defined over quantized state
  (`ADR-0007` §§5–6). Requirement: same `replayHash` at every committed boundary.
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

Scene convention: orthographic, fixed camera, **geometry coordinates in
millimetres (a length)**. **Every volumetric asset must publish `V(h)` and its
inverse `h(V)`**, because `ObservableModel` obtains liquid level by calling
`h(V)` — never by scaling a volume into a geometry axis. Assets that cannot
publish a profile are marked `non_volumetric` and accept approximate liquid
level. See `docs/visual/apparatus-standard.md` for the corrected contract
(finding P2-1).

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

### Architecture: four policy objects, not fixed control flow

**Revised 2026-09-11 (owner review P2-2).** The previous version of this section
wrote the v0 tuning values — 5 prompts, 3 correct, the escalation rule, the
hypothesis list — directly into the control flow. Those are **unvalidated
judgements**, and making them structural would mean that changing a guess
requires changing the architecture. Full rationale in `ADR-0009`.

The control loop is four named abstractions:

```
EvidenceModel      interaction record → EvidenceEvent | nothing
BeliefUpdater      evidence + prior belief → posterior belief (with uncertainty)
InterventionPolicy belief + world context → InterventionIntent
FadingPolicy       evidence history → scaffold level
```

Everything below is **one configuration** of them (`aceV0Policy`), labelled
experimental and replaceable without touching any interface.

### Intervention policy (v0 configuration — deliberately minimal)

Ordered by escalation. **None of them reveals the answer.**

1. **Do nothing.** Always the default, and a first-class intent. One wrong
   prediction is not actionable.
2. **Offer a representation switch.** Surface the micro composition view at the
   problem point. This is *noticing* support, not answer-giving.
3. **Offer a contrasting case.** Fork the world and show the same volume added
   in the buffer region versus near equivalence. Difference is the teacher.
4. **Escalate only if the learner asks, or after two consecutive predictions
   with the same *signed* error** — the specific trigger for hypothesis 1 or 2.

The escalation rule is **policy data, not code structure**. Never: state the
correct pH; state the misconception; auto-fill a prediction.

### Scaffold fading and challenge mode (v0 configuration)

- The prediction prompt is presented on the first 5 deliveries.
- After 3 consecutive predictions within tolerance, it becomes an optional
  toggle, defaulting off.
- **Challenge mode disables prediction prompts, hints, and contrast offers
  entirely.** ACE still records evidence but never intervenes. Challenge mode
  must remain fully usable — the product is a simulation, not a course.

`FadingPolicy` is a separate object from `InterventionPolicy`, because fading is
a property of the learner's trajectory while intervention responds to current
belief. Conflating them makes either impossible to tune independently
(`ADR-0009`).

### This slice does not claim educational efficacy

**What it establishes:** that the control loop exists, that its boundaries hold,
and that a learner can complete the whole experiment with ACE entirely disabled.

**What it does not establish, and what must never be claimed on its behalf:**
that any intervention improves learning; that the hypothesis set is correct or
complete; that the fading schedule is appropriate; that the evidence model
identifies what it claims to. `GOAL.md` §5.8 — watching an animation is not
understanding, and by the same token a well-structured control loop is not
pedagogy.

No learning-science claim is made anywhere in this spec, and none may be inferred
from the existence of these abstractions.

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
| 11 | Quantization tie flips a hash across engines | Documented residual risk (`ADR-0007` §3); surfaces as a loud hash mismatch, not a silent wrong answer |
| 12 | A snapshot is treated as truth | Replay with snapshots deleted (AC-R5) |
| 13 | Solver version drift silently applied to an old world | Replay refuses mismatched solver; re-solve is separately labelled (AC-R6) |
| 14 | Burette reading drifts from vessel state | Reading is derived; test asserts `reading == initial − Σ delivered` |
| 15 | Volume unit confusion (mL/L, factor 1000) | Branded types (`ADR-0004`) make it a compile error; round-trip property test |
| 16 | Activity applied **post-hoc** rather than inside the equilibrium — the defect this review found | The coupled solve is the only path; REF-3/REF-4 verify the coupling; a post-hoc implementation cannot reproduce both excess regimes |
| 17 | Molarity/molality or the two ionic-strength bases silently mixed | Distinct opaque types (AC-U2); static check (AC-S8) |
| 18 | Taught `−lg c(H⁺)` reported as thermodynamic pH, or vice versa | Distinct types (AC-S9); REF-5 and REF-6 sit side by side in the reference set |
| 19 | Cross-engine variation in a transcendental flips a hash | `detLog10`/`detExp10` replace the native calls (AC-S10); perturbed-path replay (AC-R3) |
| 20 | Derived quantities quantized independently, breaking conservation | AC-R9 design guard, which **requires the wrong strategy to fail** |
| 21 | An ACE tuning value becomes structural, so a guess cannot be corrected | AC-A7 replaces the whole policy object without touching the control loop |
| 22 | An old world silently re-solved under a new solver version | `ADR-0008` tiers; a mismatched solver is refused, never substituted |
| 23 | `detExp10` evaluated outside its validated domain, degrading silently to 32.5 ulp | Domain assertion at the call site; AC-S10 requires refusal outside |

## Test plan

Mapped one-to-one to acceptance criteria. Nothing below is "add tests later".

| Type | Coverage |
|---|---|
| Unit — scientific | REF-1..REF-10; invariants; domain refusal; adversarial cases |
| Property | Charge/element/mass conservation over randomized valid inputs; unit round-trip |
| Numeric policy | `detLog10`/`detExp10` accuracy vs arbitrary-precision references; conservation after canonicalization; the AC-R9 design guard; `-0`/`NaN` hash handling |
| Compile | Branded vs opaque arithmetic fixtures (`tsc --noEmit`); ionic-strength base separation |
| Oracle | PHREEQC CLI comparison over a swept titration, in molality with aligned constants; disagreement reported, not averaged |
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
| AC-S1 | REF-1..REF-10 pass within stated tolerances, on the **self-consistent molality-basis** formulation | `vitest packages/sci`, `pytest tools/oracle` |
| AC-S2 | Charge balance residual < 1e-14 mol/kg on the **unquantized solver state** across the reference sweep | invariant test output |
| AC-S3 | Na, Cl, and acid-group element totals conserved across a 100-transfer sequence | conservation test + state dump |
| AC-S4 | Inputs outside the validity domain return `MODEL_OUT_OF_DOMAIN` and produce no number — checked **both** before the solve and on the converged `I_m` | domain test matrix |
| AC-S5 | The 1e-6 mol/kg acetic acid case matches the exact solve, and the HH divergence (0.65 pH) is reproduced | adversarial test |
| AC-S6 | The PHREEQC oracle agrees within ±0.02 pH over the swept curve, **including the equivalence region**, with constants **and the molality basis** aligned | oracle comparison report; see the caveat above |
| AC-S7 | `Ka`, `Kw`, Davies `A` and `b`, `γ_HA`, `a_w`, and the indicator constants are traced to citable sources in `docs/research/constants-provenance.md` | provenance review; **currently open — see Open questions** |
| AC-S8 | Every thermodynamic calculation runs on the **molality** basis; no `MolPerLitre` value reaches scientific-core internals | static check + type test on the `packages/sci` public surface |
| AC-S9 | `−lg c(H⁺)` (taught) and `pH = −log₁₀ a(H⁺)` (thermodynamic) are distinct types, both computed, neither assignable to the other | compile fixture + named reference cases REF-5/REF-6 |
| AC-S10 | `detLog10` and `detExp10` meet their stated accuracy (≤1.5 ulp in domain) against arbitrary-precision references, and refuse outside their validated domain | `spikes/numeric-policy` promoted to a package test |
| AC-S11 | The outer residual is strictly increasing in `m_H` across a sweep **including the domain boundary**, machine-checked | monotonicity sweep test |

### Runtime

| ID | Criterion | Evidence |
|---|---|---|
| AC-R1 | Replaying the serialized log produces the same quantized state hash at every committed boundary | replay test |
| AC-R2 | Replay is byte-identical on a second run in the same engine | repeat-run test |
| AC-R3 | Replaying the same log under a perturbed arithmetic path yields the same quantized hash | cross-engine proxy test (`ADR-0007` §6) |
| AC-R4 | After arbitrary child-branch operations, the parent's state hash is unchanged | branch-isolation test |
| AC-R5 | Deleting all snapshots and replaying yields identical results | snapshot-independence test |
| AC-R6 | Replay under a mismatched solver version is refused; re-solve is offered and labelled as a new world | solver-identity test |
| AC-R7 | 500-event replay completes in < 2 s | benchmark |
| AC-R8 | World export → import round-trips to an identical state hash | persistence test |
| AC-R9 | **Design guard.** Conservation after canonicalization ≤ 1e-13 relative over 100 transfers, **and** the "quantize each vessel independently" strategy demonstrably fails this threshold (measured 4.0e-12 vs 1.4e-15) | regression test derived from `spikes/numeric-policy` |
| AC-R10 | The reducer quantizes **only** canonical independent state; no derived quantity is ever quantized independently | static check + review of the single quantization call site |
| AC-R11 | `canonicalJson` normalizes `-0` to `0` and rejects `NaN`/`±Infinity` | unit test with the adversarial values |

### Representation

| ID | Criterion | Evidence |
|---|---|---|
| AC-V1 | `packages/render` has no import path to `packages/sci`; the build fails if one is added | dependency-rule test (deliberate violation fixture) |
| AC-V2 | Indicator colour is continuous in the computed ratio, with no threshold branch | observable-model unit test |
| AC-V3 | No hard-coded chemical colour literal exists in the render path | lint / grep-based test fixture |
| AC-V4 | Liquid level is obtained by calling the vessel's declared `h(V)`; `V(h)` and `h(V)` are mutually consistent within a stated tolerance | observable-model test against a fixture |
| AC-V5 | Screenshots at all four named viewports match the approved baseline | visual regression + owner review |
| AC-V6 | pH is displayed to at most 2 decimal places | DOM assertion in Playwright |
| AC-V7 | No geometry coordinate, stroke, or offset carries a volume; all are `Millimetre` | type check + `docs/visual/apparatus-standard.md` review checklist |

### ACE

| ID | Criterion | Evidence |
|---|---|---|
| AC-A1 | `PredictionRecorded` and `PredictionResolved` are emitted on prediction flows | ACE event test |
| AC-A2 | No ACE state is ever written to the world event log | store-boundary test |
| AC-A3 | After one wrong prediction, ≥2 learner hypotheses remain with non-zero uncertainty | ACE model test |
| AC-A4 | Scaffold fades after 3 consecutive in-tolerance predictions | ACE state test |
| AC-A5 | In challenge mode, no intervention of any kind is emitted, and the flow remains usable | Playwright challenge-mode flow |
| AC-A6 | `packages/ace` has no import path to `packages/render` or `packages/sci`; interventions leave ACE only as `InterventionIntent` data | dependency-rule test with a deliberate violation fixture |
| AC-A7 | Replacing `aceV0Policy` with a second, different policy object requires **no change to the control loop** | run the loop against two policies; assert identical code path |
| AC-A8 | No reachable `InterventionIntent` path constructs a value containing the correct pH | structural assertion over all policy branches |
| AC-A9 | `BeliefUpdater` retains an explicit `unknown` mass after one wrong prediction (it cannot be forced to a point estimate) | ACE model test |

### Units and representation

| ID | Criterion | Evidence |
|---|---|---|
| AC-U1 | Branded types reject a plain `number` and cross-unit assignment; opaque types additionally reject arithmetic on the value itself | `tsc --noEmit` on the fixture files, as in `spikes/numeric-policy` |
| AC-U2 | `IonicStrengthMolal` and `IonicStrengthMolar` cannot be assigned to or compared with each other | compile fixture |
| AC-U3 | Every serialized quantity carries a unit; a missing or unknown unit is a rejection, not a default | schema round-trip + negative test |

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
5. **(New, from P1-1 — the most consequential product decision in this spec.)
   How should the product present thermodynamic pH vs the taught `−lg c(H⁺)`?**
   For 0.1 M HCl these are **1.1064** and **0.9993**. A Chinese high-school
   student shown "pH = 1.11" for 0.1 M HCl will reasonably believe the software is
   wrong, because the syllabus defines pH as `−lg c(H⁺)`. Three options:
   - **(a) Show the taught quantity by default, with the thermodynamic pH one
     click away and the difference explained.** Honest, syllabus-aligned, and
     turns the gap into a teaching asset (`GOAL.md` §5.1, §1).
   - **(b) Show both side by side always.** Maximally honest, but likely to
     confuse a student who only needs the syllabus quantity.
   - **(c) Show the thermodynamic pH as "the" pH.** Scientifically defensible and
     pedagogically hostile; contradicts `GOAL.md` §3's obligation not to design
     only for advanced students.

   **Recommendation: (a).** The display-precision rule and the labeling language
   depend on this choice, so it must be settled before M5. This is a product
   decision, not a technical one, and the spec does not make it unilaterally.
6. **(New, from P1-2.)** Should `detLog10`/`detExp10` be implemented in
   TypeScript as in the spike, or via a WASM/fdlibm build? The spike shows the
   TypeScript route is feasible at 1.5 ulp; WASM would be faster but adds a build
   artifact and a second toolchain. **Recommendation: TypeScript**, consistent
   with keeping the v0 runtime free of extra native artifacts. Confirm at M4.
7. **(New, from P2-3.)** `ADR-0008` lists five open decisions on persisted-world
   solver compatibility, including the version support window. These need owner
   input before M8, not now.

## What this spec does not claim

This spec is at **S1 — Specified**. No code exists. No acceptance criterion has
been evaluated. The `±0.02` tolerance is established by an isolated spike for the
buffer and strong-acid regimes only, and **the weak-acid equivalence region
remains independently unvalidated**. Nothing here should be read as a claim that
acid-base titration works.

### What changed in the 2026-09-11 revision

Owner review found six real defects. Each was fixed in place rather than
noted for later:

| Finding | What was wrong | Where fixed |
|---|---|---|
| **P1-1** | The spec claimed an activity model but solved concentration-only, applying Davies post-hoc | §Governing model rewritten to a self-consistent `(m_H, I)` solve; REF table rebuilt; `spikes/activity-equilibrium` |
| **P1-2** | Reproducibility was ranked above correctness, and it constrained the physics | `ADR-0007` rewritten; priority order stated; `detLog10`/`detExp10` replace native calls; canonical/derived state split |
| **P1-3** | Molarity, molality, activity, and ionic strength were conflated | `docs/science/quantity-ontology.md` created; `ADR-0004` rewritten |
| **P1-4** | The branded-type guarantee was false as written | Tested by compilation; split into opaque vs branded; `ADR-0004` states the real guarantee |
| **P2-1** | A geometry axis carried a volume (mL) | `docs/visual/apparatus-standard.md` corrected to `mm` + `V(h)`/`h(V)` |
| **P2-2** | ACE tuning guesses were structural | `ADR-0009`; four abstractions; `aceV0Policy` as data; explicit non-claim on efficacy |
| **P2-3** | No policy for a world whose solver version is gone | `ADR-0008`; three availability tiers |

**The equivalence-region gap is unchanged and is still open.** The revision did
not close it; it made it more precisely stated. Only the M4 PHREEQC oracle can
close it.
