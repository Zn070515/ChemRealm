# SPEC-0001 — World Foundation & Acid-Base Titration

- **Status:** **Accepted** — S1 baseline, M1 S3, M3 S3, and M4
  pre-implementation contract amendments accepted. Owner, 2026-09-12.
- **Accepted baseline:** commit `8310c685`, `SPEC-0001` revision 6
- **Current revision:** **12 Accepted** — M4 pre-implementation accuracy
  contract wording was aligned with the existing runtime schema. Revisions 7–12
  are accepted contract amendments.
  See "Amendments since acceptance" below.
- **Acceptance scope:** the specification and its acceptance criteria. Deferred
  items listed under Open questions remain open and must be resolved before the
  milestone that names them. Acceptance does **not** assert that any criterion
  has been demonstrated — that is what the S3 evidence packet is for.
- **Date:** 2026-09-12 (M4 pre-implementation contract closure)
- **Owner:** Project owner
- **Supersedes:** revisions 1–5 of this spec
- **Coverage:** all 71 acceptance criteria below are both **claimed** by a
  `PLAN-0001` milestone (`**Addresses:**`) and **evidenced** in it (a test or
  stop condition), machine-checked by `tools/check_acceptance_coverage.py`,
  which runs in CI from M0. The check distinguishes "mentioned somewhere" from
  "claimed and evidenced"; the weaker form passed while criteria were unmapped.

### Amendments since acceptance

| Revision | Date | Change | Approval |
|---|---|---|---|
| 7 | 2026-09-11 | `CanonicalContents` conserves **components**, not materials (M1 contract remediation item 1). `AC-R21` added to carry that contract; `AC-S3` and `AC-R14` wording aligned to it. Round 6's claim at §"Round 6" that this file was "unchanged at revision 6" corrected. | Owner, 2026-09-11 |
| 8 | 2026-09-11 | M1 Contract Closure R2: all persisted `MaterialSnapshot` scientific inputs are tagged quantities; source-data provenance is distinct from solver/model provenance; v0 material definitions reject mixed bases and more than one molality solute until the joint resolver is implemented. | Owner, 2026-09-11 |
| 9 | 2026-09-11 | M1 Final Closure: material snapshot provenance follows each datum; snapshot scientific quantities are persisted only in canonical units; export wording is aligned with the v1 bundle contract (`events[0]` carries solver config, lineage ids are allowed, and learner evidence has no v1 payload). | Owner, 2026-09-11 |
| 10 | 2026-09-12 | M3 Contract Closure: World Runtime reduction/replay stays synchronous; async solving is composition-level orchestration; v0 binds one adapter, one model, and one exact `SolverConfig`; solute modes are discriminated; `MODEL_OUT_OF_DOMAIN` requires `nearestSupported`; incompatible requirements reject genesis before `WorldCreated`. | Owner, 2026-09-12 |
| 11 | 2026-09-12 | M3 Identity & Defensive Boundary Closure: decoded/cast request data always returns tagged `INVALID_INPUT`; adapter/model/config identity is defensively copied and deeply frozen across construction and registry boundaries; every `OK` result must carry provenance exactly matching the adapter model and solver configuration. | Owner, 2026-09-12 |
| 12 | 2026-09-12 | M4 pre-implementation contract closure: the proposed accuracy-envelope qualification is represented by the existing `ValidityStatus.withinProposedAccuracyEnvelope` boolean; no parallel `accuracyStatus` field is introduced. | Owner, 2026-09-12 |

A revision bump is recorded here rather than only in the body because the header
is what a reader checks before deciding whether the file they are reading is the
file that was accepted. Leaving "accepted at revision 6" in place while the body
had changed made `git diff` the only way to find out.
- **Related ADRs:** 0001–0009 were accepted at the baseline; ADR-0001 and
  ADR-0003 M1 Final Closure amendments and ADR-0010's v0 genesis basis boundary
  are accepted as part of M1 S3.
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
(`spikes/activity-equilibrium`, 24/24). The heavy general-purpose speciation
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
                                                │  apps/web builds a SolveRequest
                                                │  from the committed world state
                                                ▼
                                    await SolverAdapter.solve(request)
                                                │
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

- `SolverAdapter.solve(request) → Promise<SolveResult>` — an async result envelope, never a bare number (`ADR-0003`).
- A solver boundary that receives decoded or cast data must return tagged
  `INVALID_INPUT` for malformed request fields; it must not leak a property-access
  exception into the caller.
- Solver model/config identity is a defensive snapshot. Domain identity types
  are deeply readonly, and registry consumers receive a frozen contract
  adapter rather than mutable registration input.
- An `OK` result is accepted only when
  `state.provenance.modelId`, `modelVersion`, and exact `parameters` match the
  adapter's model and persisted `SolverConfig`; a mismatch is an adapter
  contract error.
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
charge balance   m̂_Na + m̂_H = m̂_OH + m̂_A + m̂_Cl              [dimensionless]
mass balance     m̂_HA,tot  = m̂_HA + m̂_A
Ka               Ka = a_H·a_A / a_HA = γ_H·m̂_H·γ_A·m̂_A / (γ_HA·m̂_HA)
Kw               Kw = a_H·a_OH       = γ_H·m̂_H·γ_OH·m̂_OH

reduced molality m̂_i = m_i / m°          m° = 1 mol/kg     [dimensionless]
activity         a_i = γ_i · m̂_i                            [dimensionless]

ionic strength   I_m = 0.5 · Σ m_i z_i²                     [mol/kg]
reduced          Î   = I_m / m°                             [dimensionless]

Davies           log₁₀γᵢ = −A·zᵢ²·( √Î/(1+√Î) − b·Î )
                 A = 0.509,  b = 0.3   (pure numbers on the reduced convention)
conditional      Kw_c = Kw/(γ_H·γ_OH)                       [dimensionless]
                 Ka_c = Ka·γ_HA/(γ_H·γ_A)                   [dimensionless]
neutral species  γ_HA = 1   (bounded approximation — see below)
```

**The algebra runs in reduced molality (round 4, finding P1-1).** Everything
above the dashed line is dimensionless; physical molalities are produced once at
the`ScientificState` boundary as `m_i = m̂_i · m°`.

This matters because `Kw` is a **dimensionless** thermodynamic constant. The
previous revision wrote

```
m_OH = Kw_c / m_H          ← dimensionless / (mol/kg)
```

which is not mol/kg. It produced correct numbers only because `m° = 1 mol/kg`
numerically, so the missing standard-state factor was invisible. Written in
reduced variables the same equation is legal:

```
m̂_OH = Kw_c / m̂_H         ← dimensionless / dimensionless
```

This is the same class of defect as the `1 + √I` problem below, and it was
found the same way — by asking what the units of each term are, rather than
whether the number looked right.

**Why the reduced ionic strength is not pedantry (round 3, finding P1-F).** The
Davies expression contains `1 + √I` and `b·I`. If `I` carries units of mol/kg,
that is a sum of a dimensionless `1` and a dimensioned quantity, which is not
defined. On the molality scale the standard resolution is to use the ionic
strength **relative to the standard molality**:

```
Î = I_m / m°,   m° = 1 mol/kg
```

so `Î` is a pure number and every term in the Davies expression is
dimensionless. `A` then carries no units either.

The numerical effect is nil (`Î = I_m / 1`), and that is exactly why it is worth
writing down: a project that insists activity and `Ka` be dimensionless while its
own activity model adds `1 + √(mol/kg)` is not being rigorous, it is being
inconsistent. The two are now distinct types — `IonicStrengthMolal` (mol/kg) and
`ReducedIonicStrength` (dimensionless) — so the distinction cannot be lost in
code by accident.

`Ka` and `Kw` are **thermodynamic** constants on the molality basis and are
dimensionless, because `a_i = γ_i·(m_i/m°)` with `m° = 1 mol/kg`.

**Why this is a loop, not an equation.** Substituting the *conditional* constants

```
Kw_c = Kw / (γ_H·γ_OH)          Ka_c = Ka·γ_HA / (γ_H·γ_A)
```

(which are **dimensionless**, like `Kw` and `Ka`) into the charge balance gives
the scalar form:

```
m̂_Na + m̂_H − Kw_c/m̂_H − m̂_A,tot·Ka_c/(Ka_c + m̂_H) = 0
```

**Every symbol in that equation is a REDUCED molality.** Writing it with
physical `m` — `Kw_c/m_H` — is `dimensionless / (mol/kg)` and is not a legal
expression; see the worked failure immediately above. This block is easy to
mistake for a harmless convention, so it is stated twice on purpose: **the hats
are not decoration.**

The scalar structure was always right. **What was wrong is that `Kw_c` and `Ka_c`
depend on `I`, which depends on the speciation, which depends on them.** The
earlier formulation froze them as constants. v0 solves the two unknowns
`(m̂_H, Î)` simultaneously, by nested bisection.

**Numerical structure** (derived and measured in `spikes/activity-equilibrium`):

- Bracketing uses the ideal (γ = 1) root and expands by factors of 3, 10, 100,
  1000, smallest first. A wide fixed bracket is *not* usable: far from the root,
  `m̂_OH = Kw_c/m̂_H` becomes enormous and the implied `Î` leaves the Davies
  domain, so the residual cannot be evaluated at all.
- The outer residual was found **strictly increasing** in `m̂_H` on all seven
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

### Three hydrogen-ion quantities that must never be conflated

**Revised 2026-09-11 (round 2, findings P1-1 and P1-2).** The previous revision
of this section was itself defective: it printed `−lg c(H⁺) = 0.9993` for
0.1000 mol/L HCl, but that number was `−log₁₀(m_H)` — the **molality** — wearing
the label of a concentration. The correct value is **1.0000**, because the
solution is *defined* as 0.1000 mol/L and HCl is fully dissociated.

The three quantities are physically distinct and are computed from distinct
inputs:

| Quantity | Symbol | Unit | Definition | 0.1000 mol/L HCl |
|---|---|---|---|---|
| Hydrogen-ion **molality** | `m(H⁺)` | mol/kg water | solver output | 0.100165 |
| Hydrogen-ion **molarity** | `c(H⁺)` | mol/L solution | `n_H / V_solution` | **0.100000** |
| Hydrogen-ion **activity** | `a(H⁺)` | dimensionless | `γ_H · m(H⁺)/m°` | 0.078279 |
| **Taught quantity** | — | dimensionless | `−lg(c(H⁺)/c°)`, `c°` = 1 mol/L | **1.0000** |
| **Model pH** | — | dimensionless | `−log₁₀ a(H⁺)` | **1.1064** |

`c(H⁺)/m(H⁺) = 0.998354` for this solution. They differ by 0.16 %, and merging
them is a defect regardless of how small the number appears
(`docs/science/quantity-ontology.md`).

#### Who owns which quantity

**Revised 2026-09-11 (round 3, finding P1-D).** Three separate documents
previously described three different architectures — the spec said the
scientific core emits molalities only, the ontology said it emits "both molality
and molarity", and `PLAN-0001` M4 required both pH-like values to be emitted. An
agent starting M3 would have had to guess. This table is now the single answer,
and the other three documents defer to it.

| Layer | Owns | Does **not** own |
|---|---|---|
| **Scientific Core** (`packages/sci`) | molal species amounts; `γ`; **activity**; `I_m`; **activity-based model pH**; **indicator chemical speciation**; validity, model identity, provenance | molarity, `−lg c(H⁺)`, colour, geometry |
| **World Physical State** (`packages/world`) | material `amount`s, `waterMass`, `liquidVolume`, structure, `scenarioSnapshot` | any equilibrium quantity |
| **ScientificProjection** (`packages/sci`, plain-data input) | `c(H⁺)` and `−lg c(H⁺)` — anything needing **both** scientific state and world volume | colour, geometry, formatting |
| **Observable Model** (`packages/render/observable`) | the **empirical mapping** from an already-computed scientific value to a visual: ratio → colour, volume → height via `h(V)`, series → curve geometry | any equilibrium calculation |
| **Renderer** (`packages/render/pixi`) | pixels | everything above |

```
Scientific Core        molality, γ, activity, I_m, model pH, indicator speciation
       +
World Physical State   amount, waterMass, liquidVolume
       ↓
ScientificProjection   c(H⁺) = n(H⁺)/V ,  −lg c(H⁺)
       ↓
Observable Model       colour, liquid height, curve geometry, text
       ↓
Renderer               pixels
```

**The key correction:** the scientific core is *solved* on the molality basis,
but that is a numerical base, not a restriction on what it may output. **Activity,
`I_m`, model pH, and indicator speciation are scientific outputs** and belong to
the scientific core. What the core cannot produce is `c(H⁺)`, because that needs
the world's solution volume — which is why `ScientificProjection` exists as a
named layer rather than being called "the presentation layer".

`ScientificProjection` lives in `packages/sci` and takes **plain data**
(`waterMass`, `liquidVolume`), so it does not import `packages/world`
(`ADR-0001` forbids `sci → world`).

There is no code path that derives `−lg c(H⁺)` from a molality. That is a
structural guarantee, not a convention.

#### Terminology: this is a *model* pH, not "the" pH

**Revised per P1-2.** The previous revision called `−log₁₀ a(H⁺)` the
"thermodynamic pH". That overstates what the number is.

IUPAC's Gold Book does define pH as `−lg a(H⁺)`, but the *same entry* states that
the activity of a single ion is not independently measurable, so the definition
is **notional**, and operational primary standards such as Bates–Guggenheim are
required to realise it. PHREEQC likewise defines pH via hydrogen-ion activity,
with activity coefficients coming from whichever model and database is selected.

Therefore:

- The term used throughout is **activity-based model pH**, quantified as
  *"pH under the Davies single-ion activity model"*.
- The UI must **not** imply that `1.1064` is the uniquely true pH while the
  textbook's `1.0000` is simply wrong. It is not.
- The inspection view states the IUPAC notional definition **and** that
  single-ion activity requires an extrathermodynamic convention.

Calling one number "the true pH" would repeat, in the opposite direction, the
same error as ignoring activity altogether.

#### Display decision (owner, 2026-09-11)

The owner selected the recommended option, with this labelling:

- **Default view** shows `−lg c(H⁺)`, which is what the syllabus means by pH, and
  **calls it pH**. Calling it anything else makes the product unusable for its
  primary users.
- A **`科学模型` / "scientific model"** affordance expands to show
  **activity-based model pH**, `−log₁₀ a(H⁺)`, together with the note that
  high-school treatment uses the concentration approximation and that a stricter
  activity model shifts the value, and that single-ion activity itself depends on
  a convention.

`GOAL.md` §5.1 — a teaching view may simplify, and must not falsify the
underlying state. Both quantities are stored; neither is presented as the
other; the difference is exposed rather than hidden.

**Binding constraints, unchanged and enforced:** both quantities exist in every
state (REF-5, REF-6); they are distinct types, never assignable (AC-S9); every
displayed number is labelled with which quantity it is; one convention per view;
and the choice is a policy object swappable without touching `packages/sci` or
the observable model (AC-V8).

### Computational domain vs proposed validation envelope

**Revised 2026-09-11 (rounds 2 and 3, findings P1-3 and P1-E).** Two separate
corrections live here.

**Round 2** separated `I_m ≤ 0.5 mol/kg` — where the Davies equation is *roughly*
usable, an informed rule of thumb and not an error bound — from a claim of
±0.02 pH, which had been demonstrated only at the two IUPAC buffer anchors
(`I = 0.01` and `I = 0.10`).

**Round 3** fixes the residual overstatement. The previous revision called the
inner region a **"validated"** envelope spanning `I_m ≤ 0.12`, while the same
document stated elsewhere that the **weak-acid equivalence region remains
independently unvalidated**. Both cannot be true: *equal ionic strength does not
imply equal model error.* Acetate buffer, strong-acid excess, and the weak-acid
equivalence point are different composition regimes, and Davies-vs-Bates–Guggenheim
disagreement need not be the same size in each.

| | Value | Status |
|---|---|---|
| **Computational domain** | `I_m ≤ 0.5 mol/kg` | Model is physically meaningful. Outside: refuse (`MODEL_OUT_OF_DOMAIN`). |
| **Proposed validation envelope** | `I_m ≤ 0.12 mol/kg` | **The target, not yet earned.** ±0.02 pH is currently evidenced *only* at the two IUPAC anchors inside it. |
| **Validated envelope** | — | **Does not exist yet.** Comes into being only when M4's AC-S6 passes with the PHREEQC oracle across the full swept curve including the equivalence region. |

Anchored so far by: IUPAC-traceable acetate buffer standards at `I = 0.01`
(Δ 0.0112) and `I = 0.10` (Δ 0.0061). Analytic activity relations across the
excess regimes verify the solver's arithmetic, **not** the model's accuracy, and
do not count toward the envelope.

**The envelope is not a guess about the scenarios — it is measured against
them.** The v0 titration scenarios (0.1 mol/L HCl/NaOH and HOAc/NaOH, 0–2
equivalents) reach a maximum `I_m` of **0.1002 mol/kg** over the full sweep
(`spikes/activity-equilibrium` §K), comfortably inside the proposed envelope.


**Behaviour between the envelope and the domain limit** (e.g. a learner building
a 0.3 mol/L system in the sandbox): the solver computes, and the result carries

```
withinProposedAccuracyEnvelope: false
```

The UI displays it with that qualification rather than suppressing it or
presenting it as equally trustworthy. `GOAL.md` §5.2 — an explicitly labelled
approximation, never a silent one.

### Refusal conditions

| Constraint | Supported | On violation |
|---|---|---|
| Temperature | 298.15 K exactly | `MODEL_OUT_OF_DOMAIN` |
| Ionic strength (**molality basis**, `I_m`) | ≤ 0.5 mol/kg (computational domain) | `MODEL_OUT_OF_DOMAIN` |
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
4. **Volume additivity is an OPERATIONAL approximation, not a display one.**
   **Corrected 2026-09-11 (round 5, finding P1-4).** An earlier revision called
   this "display-only, never affecting the thermodynamics". That was false, and
   the spec had itself made it false one section later by defining transfer as

   ```
   f = ΔV / liquidVolume_source      Δn_i = f·n_i      Δm_w = f·m_w
   ```

   `liquidVolume` is therefore **not** merely shown: it sets how much water and
   solute move on the *next* transfer, which sets the next mixture's molality,
   which is what the thermodynamics solve on. The approximation propagates.

   | Affected | How |
   |---|---|
   | Presentation | reported molarity, `c(H⁺)`, `−lg c(H⁺)`, liquid height, burette reading |
   | **Transfer metering** | the volume fraction `f` moved on the next transfer |
   | **Subsequent canonical composition** | hence the next state's molality |
   | **Hence subsequent thermodynamics** | indirectly, through molality |

   What remains true: **thermodynamics is never solved on a molarity.** The
   solver's inputs are always amounts and water mass. But those amounts are
   themselves shaped by earlier volume-additive metering, so the honest claim is
   "does not enter the equilibrium algebra directly", not "does not affect the
   result".

   The approximation is acceptable at the supported concentrations and is
   labelled as such. M4 measures the bound over the supported domain, and
   `AC-R14` checks that volume, water mass and component amounts are conserved
   across transfers — which bounds the *error*, not the approximation away.

   **This is the general principle:** an approximation may be accepted, but its
   influence must be described honestly. "Display-only" was a claim about
   blast radius that turned out to be wrong.
5. **Constant pressure.** 1 atm; no pressure dependence.
6. **The indicator is modelled as monoprotic** even where it is not (see below).
7. **Neutral-species activity is unity** (`γ_HA = 1`), neglecting the Setchenow
   term. Bounded at `+0.02` in `log10 γ` at I = 0.1; inside tolerance (F6).
8. **Water activity is unity** (`a_w = 1`). Standard dilute-solution convention;
   valid over the supported domain. Not valid at high solute concentration, which
   the domain check excludes.

### Indicator model — split across the core boundary

**Revised 2026-09-11 (round 3, finding P1-C).** An earlier revision put the
whole indicator model in the observable layer, including the equilibrium
expression. That was wrong: the expression contains `Ka`, an activity, and an
activity coefficient, which is **equilibrium chemistry**, not a perceptual
mapping. The renderer would have needed the activity model to evaluate it.

The correct split (`ADR-0006`):

**Half 1 — indicator equilibrium. Owned by the Scientific Core.**

```
m_In⁻ / m_HIn = Ka_in · γ_HIn / (a_H · γ_In)
```

with `γ_HIn = 1` (neutral species) and `γ_In` from Davies at the solution's
reduced ionic strength. The ratio depends on the hydrogen-ion **activity**, not
its molality or molarity. The core solves this alongside the analyte's
equilibrium and emits

```
indicators: [{ indicatorId, protonationRatio }]
```

**Half 2 — colour perception. Owned by the Observable Model.** The ratio maps to
a colour through a declared mixing model whose endpoints are standard colours and
whose transition interval is stated. There is **no `if pH > 8.2 then pink` branch
anywhere** (`GOAL.md` §5.3, `CLAUDE.md` §8.1).

**The dividing line:** *"how much In⁻ is there" is chemistry. "What does 50 %
In⁻ look like" is perception.* This is stated once as a general rule in
`ADR-0006` so it does not have to be re-argued for the next observable.

| Indicator | Acid form | Base form | Transition interval (25 °C) | `pKa_in` |
|---|---|---|---|---|
| Phenolphthalein | colourless | pink | 8.2 – 10.0 | ≈ 9.4 |
| Methyl orange | red | yellow | 3.1 – 4.4 | ≈ 3.4 |

**Provenance status: textbook/standard values, primary source to be pinned at M4.**
`Ka_in` enters the **solver configuration** (scientific core) and therefore replay
identity (`ADR-0007` §8); the colour endpoints enter the observable model's own
version. They must be traced to citable sources before M4's gate closes. Marked
here as provisional.

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
| `Ka`(CH₃COOH) | **to be pinned at M4** | molality, dimensionless | **Do not carry more digits than the source.** See Open question 1 — the previous `1.8001e-5` was invented precision from a two-figure input. |
| HCl | fully dissociated | model choice | Not a constant |
| NaOH | fully dissociated | model choice | Not a constant |
| Davies `A` (25 °C) | **0.509** | **dimensionless**, reduced-`I` convention | Standard; primary source to be pinned at M4 |
| Davies `b` | 0.3 | dimensionless, reduced-`I` convention | Empirical; primary source to be pinned at M4 |
| Standard molality `m°` | 1 mol/kg | defines `Î = I_m/m°` | Convention; recorded in solver config |
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

**Re-established against the self-consistent formulation** (2026-09-11;
round-2 revision adds the envelope, finding P1-3). Reference values come from
`spikes/activity-equilibrium`.

| Regime | `I_m` | Demonstrated agreement | Stated tolerance |
|---|---|---|---|
| Buffer region, 0.01 mol/kg | 0.010 | 0.0112 pH vs IUPAC | ±0.02 pH |
| Buffer region, 0.10 mol/kg | 0.100 | 0.0061 pH vs IUPAC | ±0.02 pH |
| Strong acid/base, excess regimes | ≤0.10 | <1e-9 pH vs analytic activity relation | ±0.005 pH |
| Half-equivalence vs `pKa + log10 γ_A` | ~0.06 | 0.0007 pH | ±0.005 pH |
| Dilute strong acid (1e-8 mol/kg) | ~1e-8 | 0.0002 pH vs full balance | ±0.005 pH |

**Stated model tolerance: ±0.02 pH, inside the proposed validation envelope
`I_m ≤ 0.12 mol/kg` only.**

The tolerance is **not** claimed across the whole computational domain. The two
highest rows are the only *external* anchors in the table; everything else
compares the solver against an analytic relation, which validates the arithmetic
and not the model (see below). ±0.02 is set by those two anchors with margin, and
extrapolating it to `I_m = 0.5` would be exactly the kind of unsupported claim
this spec exists to prevent.

**Molality vs molarity.** The scale choice moves the *model pH* by at most
**0.00096 pH** over the proposed validation envelope (measured, `spikes/activity-equilibrium`
§F). This is why the two scales can coexist — one thermodynamic, one
pedagogical — without the difference being visible to a learner. It is **not**
why they may be merged: the margin is a property of these concentrations, not a
licence to conflate the quantities.

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
| REF-5 | 0.1000 mol/L HCl, no base — **taught quantity** | `−lg c(H⁺)` = 1.0000 | definition; `c(H⁺)` from solution volume | ±0.0005 |
| REF-6 | 0.1000 mol/L HCl, no base — **activity-based model pH** | pH 1.1064 | `−log₁₀ a(H⁺)`, Davies | ±0.02 |
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

**Revised 2026-09-11 (round 3, findings P1-A and P1-B).** Two defects fixed here:
contents had two sources of truth, and the event log could not reconstruct the
state it claimed to own.

```
WorldState {
  schemaVersion: 1
  worldId: WorldId
  lineage: { parentWorldId: WorldId | null, forkSequence: number, forkStateHash: Hash }
  sequence: number                      // present cursor; not hashed
  solverConfig: { id, version, parameters }
  scenarioSnapshot: ScenarioSnapshot    // genesis is self-contained — see below
                                        // carries model REQUIREMENTS, not a resolved solver
  vessels: Vessel[]                     // STRUCTURE ONLY
  apparatus: Apparatus[]
  attachments: Attachment[]
  canonical: { byVessel: Record<VesselId, CanonicalContents> }
}

Vessel {
  id, kind,
  capacity: Litre,                      // fixed geometry
  geometryRef,                          // -> the V(h) / h(V) profile
  position: { x: Millimetre, y: Millimetre }
}                                       // NO contents field. See P1-B.

CanonicalContents {
  waterMass:        Kilogram                      // conserved solvent
  liquidVolume:     Litre                         // operational physical state
  componentAmounts: { componentId, amount: Mol }[] // conserved components
}
```

**`Vessel` holds no contents.** An earlier revision carried
`Vessel.contents: CanonicalContents` *and* `canonical.byVessel[vesselId]` — the
same chemistry in two places, which is the exact "second source of truth" this
project forbids everywhere else (`CLAUDE.md` §9, `ADR-0002`). `Vessel` is now
structure only; contents live **only** in `canonical.byVessel`.

**Correction (2026-09-11, owner review P1-1; owner-approved clarification).**
This block previously read

```
materials: { materialId, amount: Mol }[]  // conserved solutes
```

which is self-contradictory: a `materialId` names a reagent RECIPE, and a
recipe is not a conserved physical quantity. Two materials supplying the same
solute are indistinguishable once mixed, yet that shape kept two separate
"material amounts"; and a material holding two solutes (a buffer of CH₃COOH +
CH₃COONa) has no meaningful `n(material)` to store at all.

What conserves, transfers, and enters the replay hash is the amount of each
chemical COMPONENT. Four levels, kept distinct:

| Level | What it is | Where |
|---|---|---|
| `MaterialDefinition` | authored reagent recipe | `content.ts` |
| `MaterialSnapshot` | resolved genesis recipe | `world.ts` |
| **component inventory** | **conserved world truth** | `CanonicalContents` |
| `SpeciesState` | equilibrium-derived instantaneous state | `scientific.ts` |

For v0 the genesis resolution maps a material's solutes to components
one-for-one, because in this slice each solute *is* the component it supplies —
`HCl` as a defined component, exactly as PHREEQC treats it. When a later slice
needs total-Na or total-acetate, the component list is defined at the component
level; the FORMAT does not change. That is the point of paying for the correct
name now.

**Component → element.** `AC-S3` and `AC-R14` are stated in terms of element
totals (Na, Cl, acid-group), and a `componentId` is not an element: `HCl` as a
component supplies both H and Cl. The composition of a component is chemical
knowledge, so it is declared by the layer that owns the chemical model rather
than embedded in the conserved state — `AC-R21` fixes that obligation and the
shape of the inventory, and deliberately does **not** fix the bridge's final
form, because nothing before M4 needs it and inventing it here would be
guessing. For v0 the mapping is one-for-one, so no bridge exists yet.

`Apparatus { id, kind, position, state }` — a burette's `state` carries
`initialVolume: Litre`; its reading is **derived**, not stored.

`Attachment { childId, parentId, portId }`

### Genesis must be self-contained

**This is the fix for P1-A: an event log that cannot rebuild its own state is not
a source of truth.**

An earlier revision had `WorldCreated` carry only a `scenarioRef`, and
`MaterialCharged` carry only an `amount`. Neither is enough:

- **Where does the initial `waterMass` come from?** A material is a *solution*
  with a declared molarity and density. Charging 1.000 L of 0.1000 mol/L HCl at
  ρ = 1.0020 kg/L gives `n(HCl) = 0.1 mol` and
  `waterMass = 1.0020 − 0.1 × 0.03646 = 0.998354 kg`. None of that is derivable
  from `amount` alone.
- If the reducer resolved it by re-reading `content/`, the log would depend on an
  external file that can change or disappear. A world whose replay changes
  because someone edited a JSON file is not replayable.

Therefore:

- `WorldCreated` carries a **`ScenarioSnapshot`** containing, for each material,
  a **resolved inventory per litre** — not merely the raw reagent definition:

  ```
  MaterialSnapshot {
    materialId
    sourceDefinition                    // what the scenario author wrote
    density: { value, unit: "kg/L", provenance: DataProvenance }
    composition: { soluteId,
                   amountConcentration: { value, unit: "mol/L" },
                   provenance: DataProvenance }[]
    molarMasses: { soluteId,
                   molarMass: { value, unit: "kg/mol" },
                   provenance: DataProvenance }[]
    resolvedInventoryPerLitre: {        // FROZEN at genesis
      waterMass:        { value, unit: "kg" }
      soluteAmounts:    { soluteId, amount: { value, unit: "mol" } }[]
    }
  }
  ```

  Each scientific input datum carries its own `DataProvenance` sibling: density
  has one, every composition entry has one, and every molar-mass entry has one.
  There is no aggregate `appliesTo` array whose coverage or solute target could
  be ambiguous. `DataProvenance` is source-data provenance, not solver
  provenance; it carries `source`, `reference`, confidence `category`, optional
  edition/version, optional tagged temperature/pressure conditions, uncertainty
  notation, and `lastVerified`. The solver's model identity and parameter set
  remain the separate `ScientificState.provenance` record.

  A resolved `MaterialSnapshot` is normalized before persistence: density is
  `kg/L`, composition is `mol/L`, molar mass is `kg/mol`, water mass is `kg`,
  and resolved solute amounts are `mol`. Authoring `MaterialDefinition` may use
  equivalent registered units; the genesis resolver must canonicalize them
  before constructing this snapshot.

  Plus vessel geometry references and their `V(h)` profiles, apparatus defaults,
  and the scenario's **model requirements** — together with a **content hash**
  (the checksum of the snapshot). The world never re-reads `content/` at replay
  time.

  **Why the resolved inventory is stored rather than re-derived (round 5,
  finding P1-3).** Deriving `waterMass` needs `M(HCl) = 0.03646 kg/mol`. If the
  molar mass came from a runtime periodic table, then a replay would silently
  depend on that table — and `AC-R12` ("delete `content/`, replay, hash
  unchanged") would not actually be closed, only apparently closed. Storing the
  resolved inventory removes the dependency entirely: `MaterialCharged(volume)`
  becomes

  ```
  contents = volume × resolvedInventoryPerLitre
  ```

  Molar mass participates **once**, at scenario resolution, and is then frozen
  with its provenance. Replay performs no chemistry lookup of any kind.

  Molar masses therefore join the `AC-S7` provenance list alongside densities —
  both are scientific inputs, not implementation detail.

### Genesis composition-basis boundary

The content contract is deliberately narrower than the future resolver. In v0 a
material may contain multiple molarity-basis solutes, or at most one
molality-basis solute. A material may not mix molarity and molality bases, and a
material with two molality-basis solutes is rejected before genesis. This is a
structural schema rule, not a runtime refinement, so the JSON artifact and the
TypeScript validator agree.

The contract may be widened only when the Scientific Reality Core implements and
validates the joint conversion. For a solution density `ρ`, molarity-basis
concentrations `c_j`, molality-basis values `m_i`, and molar masses `M`, the
resolver must solve:

```
W = (ρ − Σ_j c_j M_j) / (1 + Σ_i m_i M_i)   // kg water per L solution
n_i = m_i W                                // molality-basis solute amount/L
n_j = c_j                                  // molarity-basis solute amount/L
```

Applying the single-solute formula independently to multiple molality solutes is
forbidden because each solute contributes to the shared solution-mass
denominator. The schema restriction remains until this joint formula has a
Scientific Reality Core owner, reference tests, conservation checks, and
out-of-domain behavior.

**The snapshot does NOT contain the resolved `solverConfig`** (round 4, finding
P1-2b). The two are different things and storing both would recreate the
double-source-of-truth problem just removed from `Vessel.contents`:

| | Records | Whose |
|---|---|---|
| `scenarioSnapshot.modelRequirements` | what the scenario *needs* (e.g. "monoprotic acid-base in water at 25 °C, activity-corrected equilibrium") | the content author |
| `WorldCreated.solverConfig` | which solver, version and parameters were **actually used** for this world | the runtime, at genesis |

`contentHash` is not a third source of truth: it is the snapshot's checksum,
verified on load by `hash(snapshot) === contentHash`.

### Requirements constrain the solver; the solver never overrides them

**Corrected 2026-09-11 (round 5, finding P1-5).** An earlier revision said that
if the two disagreed, "`solverConfig` wins, because it is what the numbers were
actually produced with". That is wrong, and it degrades a requirement into a
comment.

Resolution is a **compatibility check, not a precedence contest**:

```
ModelRequirements              (from the scenario snapshot)
        ↓
  SolverResolver
        ↓
  compatible?
   ┌────┴────┐
  no        yes
   ↓          ↓
REJECT    SolverConfig  →  frozen into genesis
```

If the resolved solver does **not** satisfy the snapshot's requirements — wrong
temperature, an unsupported species set, an activity model outside its stated
domain — then **world creation fails**. It does not quietly proceed with a
solver the scenario did not ask for.

The two are not competing sources of truth; they answer different questions:

- `modelRequirements` is a **constraint** on what may be used.
- `solverConfig` is a **record** of what *was* used, and must satisfy the constraint.

**AC-R20** requires that an unsatisfiable requirement rejects world creation with
a stated reason, rather than resolving to some other solver.
- `MaterialCharged` carries the **charged volume**, not a bare amount. The
  reducer derives amount, water mass, and any other state from the snapshot's
  material definition. This also matches what a learner actually does — dispense
  a volume.

**Consequence, stated plainly:** editing `content/` does not mutate existing
worlds. It produces a new content hash, and therefore a new world. This is the
desired behaviour, and it is what makes the export bundle self-contained
(`ADR-0005`).

### `liquidVolume` is operational state, not derived

The system explicitly **rejects** deriving volume from water mass plus a density
model — that would put a density model back into the thermodynamic path that
molality was chosen to avoid (`ADR-0004` open question 2).

But volume is needed by four separate things: liquid level via `h(V)`, the
burette reading, `c(H⁺)` and therefore `−lg c(H⁺)`, and **the size of the next
transfer**. So it is tracked as state and enters `replayHash`.

It is *updated by transfer*, never recomputed:

**Every delta is computed from the pre-transfer values** (round 4, finding
P2-1b). The previous pseudocode read `source.waterMass -= f · source.waterMass`
and then `target.waterMass += f · source.waterMass` — if executed literally in
that order, the second line sees an already-decremented source and moves too
little. The spike's implementation was correct; the spec's pseudocode was
ambiguous, which is worse, because M2 will be written from the spec.

```
f = ΔV / liquidVolume_source                       // pre-transfer value

Δwater = f · waterMass_source                      // pre-transfer
Δn(m)  = f · amount_source(m)          ∀ m         // pre-transfer

source.liquidVolume -= ΔV          target.liquidVolume += ΔV
source.waterMass    -= Δwater      target.waterMass    += Δwater
∀ m:
  source.amount(m)  -= Δn(m)       target.amount(m)    += Δn(m)
```

The rule is stated once: **read the source's pre-transfer contents, compute all
deltas from that snapshot, then apply.** An implementation that interleaves
reads and writes is a defect even when it happens to be numerically close.

Two assumptions are stated rather than hidden: **volume additivity**
(`V_mix = ΣV`) and **complete instantaneous mixing**, which is what makes the
transfer of water and solutes proportional to the volume fraction. Element
conservation across a transfer sequence is the test that catches both being
wrong (AC-S3).

### Three levels of state, never conflated

This is the fix for owner finding P1-2 and it is load-bearing (`ADR-0007` §3):

| Level | Contents | Quantized | Persisted | Purpose |
|---|---|---|---|---|
| **Solver state** | full speciation, unquantized float64 | no | no | conservation validation |
| **Canonical state** | `n_i` (mol), `m_w` (kg), **`V` (L)**, `scenarioSnapshot`, world structure | yes | yes | defines replay equality |
| **Derived science** | molalities, activities, `γ`, `I_m`, model pH, species | no | no | recomputed on demand |

Species, activities, and ionic strength are **derived and never quantized
independently**. A transfer computes each conserved independent delta from the
pre-transfer state, quantizes that delta once, and applies the same delta to
source and target. The measured consequence (`spikes/numeric-policy`):
quantizing independent per-vessel quantities drifts `4.0e-12` over 100
transfers, while quantizing the transfer delta once drifts `1.4e-15` — a ~3000×
difference, and the wrong choice is invisible in any single step.

Two hashes follow from the split:

- **`replayHash`** over an explicit replay-identity projection — solver
  configuration, genesis snapshot, provenance, lineage, IDs, and structure are
  exact, while only canonical independent runtime quantities are quantized;
  this defines replay equality and persistence identity.
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

### Explicit design decision: chemistry is recomputed outside the world reducer

The synchronous World Runtime reducer never calls or awaits a `SolverAdapter`.
Events carry the *action* (`volume transferred`), not the *result* (`resulting
pH`). After a committed `WorldState` exists, composition-level orchestration
builds a `SolveRequest` and awaits the adapter. This keeps event folding,
branching, and replay deterministic even when a solver runs in a worker, WASM
module, or separate process.

Rationale: `state = fold(events)` is the honest event-sourcing position. If the
event stored the answer, replay would merely re-read it and would no longer
verify the solver. Recompute the scientific projection after the world boundary
instead of making event folding depend on async completion order.

Consequence, stated plainly: **replay requires the same solver version.** A world
created under `acidbase-monoprotic-davies@1.0.0` is not replayable under
`acidbase-monoprotic-davies@1.1.0`. The runtime must:

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
| `WorldCreated` | `{ worldId, scenarioSnapshot, contentHash, solverConfig, seed: null }` | Genesis, and **self-contained**: the snapshot carries resolved material inventories, vessel geometry and `V(h)` profiles, apparatus defaults, and model **requirements**. `solverConfig` is the single record of what was **resolved and used**. |
| `ApparatusPlaced` | `{ apparatusId, kind, position }` | Emitted on drop, never during drag. |
| `ApparatusAttached` | `{ childId, parentId, portId }` | e.g. burette clamped above flask. |
| `MaterialCharged` | `{ vesselId, materialId, volume: {value,unit} }` | Carries **volume**, not amount: the reducer derives amount, `waterMass`, and `liquidVolume` from the snapshot's resolved inventory. |
| `TransferCommitted` | `{ fromVesselId, toVesselId, volume: {value,unit}, mechanism }` | The chemically load-bearing event. Updates `liquidVolume` and moves water and solutes by volume fraction, all deltas from the pre-transfer snapshot. |
| `WorldBranched` | `{ childWorldId, parentWorldId, forkSequence, forkStateHash }` | Creates the child's identity. Recorded in the **child** log. |

### World identity is event-sourced too

**Added 2026-09-11 (round 5, finding P1-2).** `ADR-0002`'s governing principle is
that **the event log is the source of truth and `WorldState` is a fold over it**.
It was not true: `WorldState` carries `worldId` and `lineage`, but the event
envelope carries neither, so

```
WorldState ≠ fold(events)
```

`worldId` was unreconstructable for a root world. It was worse for a flattened
child export: replaying a genesis-to-tip log could not tell that the final
identity had changed from root to child.

**Rule: identity is created once, at event time, and written into the event;
replay reads it and never regenerates it.**

| Field | Written by | On replay |
|---|---|---|
| `worldId` | `WorldCreated` | read from the event |
| `childWorldId`, `parentWorldId`, `forkSequence`, `forkStateHash` | `WorldBranched` | read from the event |

That random ids are fine is the point — a generated id is not nondeterminism as
long as generation happens **when the event is created** and the value is then
frozen in the log. Replay of the same log yields the same identity because it
reads the same bytes. **AC-R19** asserts it by replaying a flattened child log
and checking the reconstructed `worldId` and lineage.

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

### Replay completeness test

The log must reconstruct the state **without reading `content/`**. This is a
criterion, not an aspiration (AC-R12):

> Delete or corrupt every file under `content/`, then replay a serialized world.
> The `replayHash` must be unchanged.

A world that fails this is not event-sourced; it is event-sourced plus a mutable
external dependency.

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
  deleting all snapshots must not change any result (AC-R5). Each cache binds
  its world identity, genesis content hash, solver configuration, and exact
  event-log prefix hash through its sequence; a foreign or stale-prefix cache
  is ignored.

### Persistence and export

IndexedDB only, per `ADR-0005`. Stores: `worlds`, `events`, `snapshots`,
`learnerEvidence`, `aceState`, `contentCache`. No server write path exists.

Export bundle: self-describing and versioned, carries `schemaVersion`, lineage
world ids, and the complete event log. The resolved `solverConfig` travels in
`events[0].payload`, not at the bundle top level. It contains no personal,
device, or cross-session tracking identifiers, and states explicitly whether
learner evidence is included; v1 carries the literal `false` and no learner
evidence payload.

## Representation design

### Layering

Per `ADR-0006`. `ObservableModel` is pure TypeScript with no DOM and no PixiJS.
`packages/render` must not import `packages/sci`, enforced by a build-time
dependency rule.

### Layer assignment for this slice

| Element | Layer |
|---|---|
| Glassware geometry, stroke, highlights | Renderer |
| Liquid level | Observable model — calls `h(V)`, mapping only |
| Liquid fill geometry | Renderer |
| **Indicator protonation ratio** | **Scientific Core** — equilibrium, not rendering |
| Indicator colour | Observable model — perceptual mapping of the ratio |
| **Activity-based model pH value** | **Scientific Core** |
| **`c(H⁺)` and `−lg c(H⁺)`** | **ScientificProjection** — needs scientific state + world volume |
| Readout text, 2 dp formatting | Renderer |
| Burette reading | Observable model (derived: `initial − Σ delivered`) |
| Curve points | ScientificProjection supplies values; Observable model gives geometry |
| Axes, gridlines, labels, tooltips | Renderer |
| Species composition (micro view) | Observable model — **re-presents** scientific values |
| Equilibrium expressions (symbolic view) | Observable model — **re-presents** solver output; computes nothing |
| Bubbles / precipitate / flame | **Not in v0**; presence will be Scientific Core when added |

**The observable layer's rule:** it may re-present a scientific value — list,
format, map to a colour or a geometry. It may not compute new chemistry. If a
display question needs a `Ka`, a `Ksp`, an activity, or a reaction direction, the
answer comes from the Scientific Core. Stated once in `ADR-0006` so it does not
get re-litigated per observable.

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
| **Explicitly exportable** | World bundle; event log; rendered screenshots. A learner-evidence export is deferred until a versioned privacy-safe payload exists. All user-initiated. |
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
| 1 | Scientifically plausible but numerically wrong (HH used outside range) | REF-1..REF-10; adversarial cases REF-7, and the 1e-6 mol/kg HH divergence test |
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
| 18 | Taught `−lg c(H⁺)` reported as model pH, or vice versa | Distinct types (AC-S9); REF-5 and REF-6 sit side by side in the reference set |
| 19 | **`−lg c(H⁺)` derived from a molality** — the defect this review round found | `c(H⁺)` is produced only by `ScientificProjection` from amounts and solution volume (AC-S8); REF-5 is exact at 1.0000 and a molality-derived value would give 0.9993 and fail it |
| 20 | Model pH presented as "the true pH" rather than a model-dependent quantity | Display copy asserts the IUPAC notional definition and names the activity model (AC-S12) |
| 21 | A result computed outside the proposed validation envelope shown as equally trustworthy | `withinProposedAccuracyEnvelope` travels with the result; AC-S13 |
| 22 | Cross-engine variation in a transcendental flips a hash | `detLog10`/`detExp10` replace the native calls (AC-S10); perturbed-path replay (AC-R3) |
| 23 | Derived quantities quantized independently, breaking conservation | AC-R9 design guard, which **requires the wrong strategy to fail** |
| 24 | An ACE tuning value becomes structural, so a guess cannot be corrected | AC-A7 replaces the whole policy object without touching the control loop |
| 25 | An old world silently re-solved under a new solver version | `ADR-0008` tiers; a mismatched solver is refused, never substituted |
| 26 | `detExp10` evaluated outside its validated domain, degrading silently to 32.5 ulp | Domain assertion at the call site; AC-S10 requires refusal outside |
| 27 | **Replay depends on an external `content/` file** — the log is not self-contained | AC-R12: replay with `content/` absent must be hash-identical |
| 28 | **Two sources of truth for vessel contents** | AC-R15: `Vessel` carries no `contents` field; schema test |
| 29 | **`liquidVolume` not tracked**, so liquid level, burette reading, `c(H⁺)` and the next transfer all drift | AC-R13: volume is canonical state and enters `replayHash`; AC-R14 conservation |
| 30 | **The representation layer computes equilibrium chemistry** (indicator now; precipitation and redox later) | AC-V9; the observable's input carries a ratio, never a `Ka` |
| 31 | **Davies evaluated with a dimensioned ionic strength** | `ReducedIonicStrength` is a distinct type from `IonicStrengthMolal`; AC-U4 |
| 32 | **An accuracy claim wider than its evidence** | The envelope is *proposed* until M4 AC-S6 passes; AC-S13/S14 |

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
| AC-S3 | Na, Cl, and acid-group totals conserved across a 100-transfer sequence. The conserved world state is a **component** inventory (`AC-R21`); these totals are read through the component→element composition the model declares | conservation test + state dump |
| AC-S4 | Inputs outside the validity domain return `MODEL_OUT_OF_DOMAIN` and produce no number — checked **both** before the solve and on the converged `I_m` | domain test matrix |
| AC-S5 | The 1e-6 mol/kg acetic acid case matches the exact solve, and the HH divergence (0.65 pH) is reproduced | adversarial test |
| AC-S6 | The PHREEQC oracle agrees within ±0.02 pH over the swept curve, **including the equivalence region**, with constants **and the molality basis** aligned | oracle comparison report; see the caveat above |
| AC-S7 | **Every scientific input** is traced to a citable source in `docs/research/constants-provenance.md`: `Ka`, `Kw`, Davies `A` and `b`, `γ_HA`, `a_w`, the indicator `Ka_in`, the solution **densities**, and the **molar masses** (`ρ` and `M` jointly set `waterMass → molality → activity → model pH`; both are scientific inputs, not implementation details) | provenance review; **currently open — see Open questions** |
| AC-S15 | If `ρ` is treated as a scenario input, the scenario schema must **require** it — a missing density is a validation error, never a default | negative content test |
| AC-S8 | Every thermodynamic calculation runs on the **molality** basis; no `MolPerLitre` value reaches scientific-core internals; **`m(H⁺)`, `c(H⁺)`, and `a(H⁺)` are produced by distinct code paths and none is derived from another by renaming** | static check + type test on the `packages/sci` public surface; `c(H⁺)` construction unit test |
| AC-S9 | `−lg c(H⁺)` (taught) and activity-based model pH are distinct types, both computed, neither assignable to the other | compile fixture + named reference cases REF-5/REF-6 |
| AC-S10 | `detLog10` and `detExp10` meet their stated accuracy (≤1.5 ulp in domain) against arbitrary-precision references, and refuse outside their validated domain | `spikes/numeric-policy` promoted to a package test |
| AC-S11 | The outer residual is strictly increasing in `m_H` across a sweep **including the domain boundary**, machine-checked | monotonicity sweep test |
| AC-S12 | Model pH is never labelled or described as "the true/thermodynamic pH"; the inspection view states the IUPAC notional definition and names the activity model it depends on | copy review + DOM assertion on the inspection view |
| AC-S13 | A result computed beyond the proposed validation envelope carries `withinProposedAccuracyEnvelope: false` and is displayed with that qualification | domain-matrix test at `I_m` = 0.15 and 0.30 mol/kg |
| AC-S14 | The proposed validation envelope is asserted, not assumed: the v0 scenario sweep's maximum `I_m` (0.1002 mol/kg) is checked against the envelope limit at test time | boundary test derived from `spikes/activity-equilibrium` §K |

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
| AC-R10 | The reducer quantizes **only** canonical independent state; no derived quantity is ever quantized independently, and each conserved transfer delta is quantized once | static check + review of the explicit reducer delta boundaries |
| AC-R11 | `canonicalJson` normalizes `-0` to `0` and rejects `NaN`/`±Infinity` | unit test with the adversarial values |
| AC-R12 | **Replay completeness.** Delete or corrupt every file under `content/`, then replay a serialized world: `replayHash` is unchanged. The log is self-contained | test that moves `content/` aside and replays |
| AC-R13 | `liquidVolume` is canonical world truth. It changes only through explicit volume-bearing world events (`MaterialCharged`, `TransferCommitted`), is never recomputed from chemistry or presentation state, and enters `replayHash` | hash-diff test over charge/transfer events |
| AC-R14 | Transfer is **component**- and volume-conserving over 100 steps under the homogeneous-mixture assumption. **Element** totals (AC-S3) are conserved as a consequence, through the component→element composition declared by the model (`AC-R21`) | conservation test (spike §N promoted) |
| AC-R15 | `WorldState` has exactly **one** location for vessel contents; `Vessel` carries no `contents` field | schema test + review |
| AC-R16 | `scenarioSnapshot` carries model **requirements**, never a resolved `solverConfig`; exactly one resolved solver config exists per world | schema test: the snapshot type has no solver-config field |
| AC-R17 | **Branch export is self-contained.** Exporting a branch emits the **complete** event log from genesis (flattened), with lineage metadata — not just the branch's suffix. A bundle imported on a machine with no parent replays to the same `replayHash` | round-trip test that exports a child, discards the parent, and replays |
| AC-R18 | Transfer deltas are computed from the pre-transfer snapshot: a test that interleaves read/write fails | unit test asserting the order-independence of the transfer update |
| AC-R19 | **World identity is event-sourced.** `WorldCreated` carries `worldId`; `WorldBranched` carries `childWorldId`, `parentWorldId`, `forkSequence`, `forkStateHash`. Replaying a flattened genesis-to-tip log reconstructs the final `worldId` and full `lineage` from the log alone, with nothing regenerated | replay test: fold a flattened child log, compare reconstructed identity to the live world's |
| AC-R20 | **Requirements constrain, they do not lose.** A scenario whose `modelRequirements` cannot be satisfied by any available solver **rejects world creation** with a stated reason. It never resolves to a solver the scenario did not ask for | negative test: a scenario requiring a temperature outside every shipped solver's domain fails to create, with the reason recorded |
| AC-R21 | **The conserved quantity is a chemical component, not a material.** `CanonicalContents` holds `componentAmounts: { componentId, amount }[]`, and **no material identifier appears anywhere in conserved world state** — material identity stops at genesis. Two materials supplying the same component are indistinguishable after mixing, and a material holding two components has no `n(material)`. The **component→element** composition that `AC-S3` checks is declared by the layer that owns the chemical model, not inferred from a `componentId`; for v0 the genesis resolver maps a material's solutes to components one-for-one, so no mapping is needed yet, and this criterion fixes the *shape* rather than that mapping's home | schema test: `CanonicalContents` has `componentAmounts` and no material identifier, on both sides of the language boundary |

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
| AC-V8 | **Presentation convention (owner-decided 2026-09-11).** Default view shows `−lg c(H⁺)` labelled simply as pH; a `科学模型` affordance shows activity-based model pH with the convention caveat. Every displayed hydrogen-ion number is labelled with which quantity it is; no view mixes the two; the choice is a **policy object** swappable without touching `packages/sci` or the observable model. **"Labelled" means: the numeric readout carries a visible quantity label, and the two conventions never appear in one view unlabelled and unseparated** | DOM assertions for labelling and single-convention; a test that swaps the policy and asserts zero non-presentation code changes |
| AC-V9 | **Indicator boundary.** The indicator protonation ratio is produced by `packages/sci`; `packages/render` receives a number and computes no `Ka`, activity, or activity coefficient. No equilibrium expression appears in the render path | dependency rule + review; the observable's input type carries a ratio, not a `Ka` |

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
| AC-U4 | `ReducedIonicStrength` (dimensionless), `IonicStrengthMolal` (mol/kg), and `IonicStrengthMolar` (mol/L) are three distinct types, mutually non-assignable and non-comparable. Davies accepts only the reduced type | compile fixture; a **positive** test that the Davies signature rejects `IonicStrengthMolal` |
| AC-U5 | `ReducedMolality` (dimensionless) and `MolPerKilogram` are distinct, non-assignable types; the equilibrium helpers accept only the reduced type | compile fixture, as `AC-U4` |
| AC-S16 | Every recorded constant carries **exactly** the precision of its source; no constant has more significant figures than the source states | provenance review against `constants-provenance.md`, with the source's own precision recorded |

### Privacy

| ID | Criterion | Evidence |
|---|---|---|
| AC-P1 | No server API route exists in the v0 build | build artifact inspection |
| AC-P2 | A full scripted session issues no request carrying learner data | network inspection log |
| AC-P3 | IndexedDB contains no identifier, name, or contact field | storage inspection |
| AC-P4 | Export produces a bundle with **no personal, device, or cross-session tracking identifier**, and states whether learner evidence is included. **World ids, lineage, and fork hashes are not identifiers in this sense and are required** — a literal reading of "no identifier field" would wrongly forbid them | export schema test, asserting the absence of tracking fields and the presence of lineage |
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

1. **Which acetic acid `Ka` is authoritative?** It enters replay identity and
   appears in the symbolic view, so it cannot be changed casually.

   **The previous recommendation was itself an instance of fake precision**
   (round 4, finding P2-4). It proposed pinning `Ka = 1.8001e-5` as "derived
   from the commonly cited `1.8e-5`". A two-significant-figure source cannot
   yield five significant figures; the extra digits were invented. `GOAL.md`
   §5.2 prohibits precisely this.

   **The rule: a recorded constant carries exactly the precision of its
   source.** Two acceptable resolutions, and the choice depends on what M4 finds:

   - Source states `pKa = 4.7447` → record that source and derive
     `Ka = 10^−4.7447`, documenting that the derivation is exact given the pKa.
   - Source states `Ka = 1.8e-5` → **store `1.8e-5` unchanged**, with a stated
     uncertainty of ±1 in the last digit. Do not append digits.

   Either way the textbook discrepancy (4.75 / 4.76) is shown in the symbolic
   view rather than hidden. **M4 pins the source; the value and its precision
   both come from it.**
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
5. ~~How should the product present activity-based model pH vs the taught
   `−lg c(H⁺)`?~~ — **DECIDED by owner, 2026-09-11.**

   The owner chose **option (a)** with refined wording, recorded here verbatim
   because it governs all user-facing copy:

   > **Default view.** Display the textbook quantity, `−lg c(H⁺)`, and simply
   > call it **pH**. Calling it anything else makes the product unusable for its
   > primary users.
   >
   > **`科学模型` affordance.** Expands to show **activity-based model pH**,
   > `−log₁₀ a(H⁺)`, with the explanation that high-school treatment uses the
   > concentration approximation, that a stricter activity model shifts the
   > value, and that single-ion activity itself depends on a convention or
   > model.

   The owner's reasoning is worth preserving: IUPAC itself treats its pH
   definition as **notional**, so there is no scientific obligation to fight a
   pointless war against the syllabus. What matters is that the underlying state
   is not falsified and that the two are never conflated.

   For 0.1000 mol/L HCl the two values are `1.0000` and `1.1064`.

   **Binding regardless of configuration** (this is what "口径统一" means
   operationally):

   | # | Constraint | Enforced by |
   |---|---|---|
   | 1 | Both quantities are computed and available in every state | REF-5, REF-6 |
   | 2 | They are distinct types, never assignable to each other | AC-S9 |
   | 3 | Every on-screen number is labelled with **which** quantity it is; an unlabelled "pH" is a defect | AC-V8 |
   | 4 | One convention per view — a view never mixes the two | AC-V8 |
   | 5 | The choice is a **policy object**, swappable without touching `packages/sci` or the observable model | AC-V8 |
   | 6 | `−lg c(H⁺)` is never derived from a molality | AC-S8, REF-5 |
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
| **P1-1** | The spec claimed an activity model but solved concentration-only, applying Davies post-hoc | §Governing model rewritten to a self-consistent `(m_H, I)` solve (later carried in REDUCED variables, round 4); REF table rebuilt; `spikes/activity-equilibrium` |
| **P1-2** | Reproducibility was ranked above correctness, and it constrained the physics | `ADR-0007` rewritten; priority order stated; `detLog10`/`detExp10` replace native calls; canonical/derived state split |
| **P1-3** | Molarity, molality, activity, and ionic strength were conflated | `docs/science/quantity-ontology.md` created; `ADR-0004` rewritten |
| **P1-4** | The branded-type guarantee was false as written | Tested by compilation; split into opaque vs branded; `ADR-0004` states the real guarantee |
| **P2-1** | A geometry axis carried a volume (mL) | `docs/visual/apparatus-standard.md` corrected to `mm` + `V(h)`/`h(V)` |
| **P2-2** | ACE tuning guesses were structural | `ADR-0009`; four abstractions; `aceV0Policy` as data; explicit non-claim on efficacy |
| **P2-3** | No policy for a world whose solver version is gone | `ADR-0008`; three availability tiers |

**The equivalence-region gap is unchanged and is still open.** The revision did
not close it; it made it more precisely stated. Only the M4 PHREEQC oracle can
close it.

### Round 2 (2026-09-11) — science semantics and consistency

Owner review round 2 found that round 1 fixed the *ideas* but not the *document
consistency*, and introduced one real scientific defect.

| Finding | What was wrong | Where fixed |
|---|---|---|
| **P1-1** | `−lg c(H⁺)` was computed as `−log₁₀(m_H)` — a **molality** wearing a concentration's label. Gave 0.9993 for 0.1000 mol/L HCl, and the spec carried both 0.9993 and 1.0000 | Spike rev 3: `present()` derives `c(H⁺)` from amounts and solution volume, structurally separate from `m(H⁺)`. Correct value **1.0000**. §Three hydrogen-ion quantities |
| **P1-2** | `−log₁₀ a(H⁺)` called the "thermodynamic pH", implying the textbook value is simply wrong | Renamed **activity-based model pH** throughout, with the IUPAC *notional definition* caveat and the activity model named. §Terminology |
| **P1-3** | `I_m ≤ 0.5` (Davies's approximate range) and "±0.02 pH" were presented as one guarantee | Split into **computational domain** (0.5) and a validation envelope (0.12). Round 3 downgraded the latter to **proposed** until M4 AC-S6 passes. |
| **P1-4** | Round 1's own instruction was to sweep stale statements; it did not. PLAN still carried "one millilitre" geometry, `Ka_in/[H⁺]`, a duplicate M4 stop condition, and `REF-1..REF-8` | Full repository sweep; every instance corrected. PLAN M4/M5/M6, `ADR-0003`, `ADR-0006` |
| **P2-1** | Quantity types were split by "is arithmetic allowed", which is wrong — activity, `γ`, mole fraction, and ionic strength all need arithmetic | Re-split by **which operations have defined meaning**, as a controlled quantity algebra with named operations. `ADR-0004` §2, ontology |
| **P2-2** | `ADR-0008` Tier C promised "previously recorded derived values" that may not exist, since derived science is never persisted | Tier C now guarantees the event log, canonical state, structure, provenance, and explicit exports — **not** an old curve. `ADR-0008` |

**Round 2 did not touch the architecture.** Event sourcing, the solver adapter
boundary, local-first persistence, the renderer layering, and the ACE
abstractions were accepted by the owner and are unchanged.

### Round 3 (2026-09-11) — World truth, core boundaries, validation semantics

Round 3 found no chemistry errors. What it found was that the **data model and
the core boundaries** did not yet support what the documents claimed — the class
of problem that is cheap to fix in Markdown and expensive after M1/M2 exist.

| Finding | What was wrong | Where fixed |
|---|---|---|
| **P1-A** | The event log could not rebuild the state it owned. `WorldCreated` carried only a `scenarioRef`; `MaterialCharged` only an `amount`; **where initial `waterMass` came from was undefined**. And there was no `liquidVolume`, although volume drives level, burette reading, `c(H⁺)`, and the next transfer | Genesis carries a self-contained `ScenarioSnapshot` + content hash; `MaterialCharged` carries **volume**; `liquidVolume` is canonical state; transfer moves water and solutes by volume fraction. §Genesis must be self-contained, §`liquidVolume` is operational state, AC-R12..AC-R14 |
| **P1-B** | Contents existed twice — `Vessel.contents` **and** `canonical.byVessel[id]` — the "second source of truth" this project forbids everywhere else | `Vessel` is structure only. AC-R15 |
| **P1-C** | The indicator's **equilibrium** (`Ka_in`, activity, `γ`) was computed in `packages/render/observable`. That is chemistry, and the same pattern would repeat for precipitation and redox | Indicator equilibrium moves to the Scientific Core; the observable layer receives a ratio and owns only ratio → colour. General rule stated in `ADR-0006`. AC-V9 |
| **P1-D** | Three documents gave three architectures for who owns molarity / model pH. The spec said the core emits molalities only; the ontology said it emits molarity too; PLAN M4 required both pH values | `ScientificState` now explicitly contains activity, `I`, model pH, and indicator speciation. Molarity and `−lg c(H⁺)` belong to a named **`ScientificProjection`**. §Who owns which quantity; `ADR-0003`; ontology updated. AC-S8 |
| **P1-E** | The envelope was called **"validated"** while the same document stated the equivalence region is unvalidated. Equal `I` does not imply equal model error | Renamed **proposed validation envelope**. It becomes "validated" only when M4 AC-S6 passes. §Computational domain vs proposed validation envelope; AC-S13/S14 |
| **P1-F** | Davies contains `1 + √I` and `b·I`; with `I` in mol/kg those are illegal sums, in a document that insists activity and `Ka` be dimensionless | **Reduced ionic strength** `Î = I_m/m°`, dimensionless; `A` and `b` are pure numbers; `ReducedIonicStrength` is its own type. §Governing model; AC-U4 |
| **P2-1** | PLAN stale: "revision 2", the old arithmetic criterion, `AC-S1..AC-S11`, duplicated failure-mode numbers, AC-V8 still saying "deferred" | All corrected and swept. PLAN M1/M4/M5 |
| **P2-2** | Solution **density** is a scientific input (it sets `waterMass`, hence molality, activity, model pH) but was not in the provenance requirement | Added to AC-S7, with AC-S15 requiring scenarios to declare it |

### Round 4 (2026-09-11) — standard state, persistence format, contract semantics

Round 4 found no architecture problems. It found that the standard-state factor
had not been carried through the algebra, and that three contracts still had
ambiguities an implementing agent would resolve differently.

| Finding | What was wrong | Where fixed |
|---|---|---|
| **P1-1** | `Ka_c` and `Kw_c` are dimensionless, but the solver divided them by **physical** molalities: `dimensionless / (mol/kg)`. Correct numbers only because `m° = 1 mol/kg` numerically | The algebra now runs in **reduced molality** `m̂ = m/m°`; physical molalities are produced once at the boundary. `ReducedMolality` is its own type. §Governing model; AC-U5; spike §L2 |
| **P1-2b** | `solverConfig` appeared in **both** `scenarioSnapshot` and `WorldCreated` — the double-source-of-truth just removed from `Vessel.contents` | The snapshot carries model **requirements**; `WorldCreated.solverConfig` is the single record of what was resolved and used. `contentHash` is the snapshot's checksum, verified on load. AC-R16 |
| **P1-3** | A branch stores only its suffix, but the export bundle could be exported alone → **unreplayable**, so "attach the log to reproduce a bug" silently fails for branches | **Export flattens**: a branch exports the complete log from genesis with lineage metadata. Internal storage may share the prefix; export is a portability boundary. `ADR-0005`; AC-R17 |
| **P2-1b** | The transfer pseudocode interleaved reads and writes, so a literal implementation would move too little | All deltas are computed from the **pre-transfer snapshot**, stated as a rule. AC-R18 |
| **P2-3** | Solver id `acidbase-exact` claimed a quality, not a model — and it is permanent replay identity | Renamed **`acidbase-monoprotic-davies`**, which names the model and the activity equation. `ADR-0003` |
| **P2-4** | `Ka = 1.8001e-5` was "derived" from a two-significant-figure source. Five digits from two is invented precision | A constant carries **exactly** its source's precision. AC-S16; Open question 1 rewritten |
| **P2-5** | The literal sweep was still not clean: the spike printed "INSIDE validated envelope"; `ADR-0002`'s event table said "scenario ref" | Fixed, and the sweep run as a literal command |

### Round 5 (2026-09-11) — event-sourced identity, genesis resolution, contract closure

Round 5 found that the event log still could not reconstruct its own world, and
that the plan had not followed the spec. It also produced the mechanism that
stops that second class of defect recurring.

| Finding | What was wrong | Where fixed |
|---|---|---|
| **P1-1** | `PLAN-0001` was not updated for revision 5: M1 lacked `ReducedMolality`; M2's `CanonicalContents` omitted `liquidVolume`; M4's stop condition still read `AC-S1..AC-S11`; M2/M4/M8 did not cover `AC-R12..AC-R18`, `AC-S12..AC-S14`, `AC-S15`, `AC-S16`, `AC-U5` | Plan updated **driven by the new coverage check**, not by re-reading. **`tools/check_acceptance_coverage.py`** now runs in CI (M0 6a) and PASSES at 0 unmapped / 0 dangling |
| **P1-2** | `WorldState` carries `worldId` and `lineage`, but neither `WorldCreated` nor `WorldBranched` carried identity — so `WorldState ≠ fold(events)`, and a flattened child log could not tell it had become a child | Identity is created once at event time and written into the event; replay reads it and never regenerates. AC-R19 |
| **P1-3** | `ScenarioSnapshot` held composition and density but not molar masses, so `waterMass` derivation would depend on a runtime periodic table — leaving AC-R12 only *apparently* closed | The snapshot stores a **resolved inventory per litre** (`waterMass` + `soluteAmounts`), frozen at genesis with provenance. Molar masses join the AC-S7 list |
| **P1-4** | "Volume additivity is a display-only approximation, never affecting the thermodynamics" was **false** — `f = ΔV/liquidVolume` makes volume set how much moves on the next transfer, hence later molality | Renamed an **operational** approximation with its influence traced explicitly through metering to subsequent composition. The honest claim is "does not enter the equilibrium algebra directly", not "does not affect the result" |
| **P1-5** | "If `modelRequirements` and `solverConfig` disagree, `solverConfig` wins" degraded a requirement into a comment | Resolution is a **compatibility check**: an unsatisfiable requirement **rejects world creation** with a stated reason. The two are a constraint and a record, not competing sources of truth. AC-R20 |
| **P2-1** | The spike's call sites passed physical values into a reduced-molality core — numerically identical because `m° = 1`, which proves a **numeric** test cannot catch a standard-state error | Every physical input now crosses an explicit `solve_physical()` boundary. Standard-state safety is a compile-time property (AC-U5) |
| **P2-2** | "Export contains no identifiers" would, read literally, forbid the `worldId` that flattened branch export requires | AC-P4 now reads "no **personal, device, or cross-session tracking** identifier"; lineage is required and permitted |

### Round 6 (2026-09-11) — execution-level closure

Round 6 found **no scientific, world-model, or ACE defects**. Both blockers were
execution-level, and `SPEC-0001` was **unchanged at revision 6** at that time —
the fixes were in `PLAN-0001`, `CLAUDE.md`, `ADR-0001`, and the coverage tool.

> **Amended 2026-09-11.** The sentence above was true when written and is no
> longer: the M1 contract remediation that closed owner finding P1-1 changed the
> `CanonicalContents` contract in this file and added `AC-R21`, taking it to
> revision 7. Recorded here rather than deleted, because a history section that
> silently rewrites itself is worth less than one that says what changed.

| Finding | What was wrong | Where fixed |
|---|---|---|
| **P1-1** | `PLAN-0001` M2 declared `CanonicalContents` to contain "waterMass, liquidVolume, material amounts, **and the scenarioSnapshot**". The snapshot is **world-level** genesis state on `WorldState`; per-vessel it would give a world with 8 vessels 8 copies, and re-blur world-metadata against per-vessel contents | M2 now lists **three** fields and states explicitly that the snapshot is not one of them. `PLAN-0001` M2 |
| **P1-2** | `CLAUDE.md` said "never use bare `python`/`py`" while `PLAN-0001` and CI said `py tools/check_acceptance_coverage.py`. The Windows-only `py` launcher **does not exist on the GitHub Actions Ubuntu runner**, so CI would have failed on its first run. Separately, `pyproject.toml` was declared inside `tools/oracle/` while the environment lived at the root `.venv`, leaving `uv sync` with two candidate targets | One Python project at the root (`pyproject.toml` + `.venv`); `tools/oracle/` holds source. One platform-neutral command set, given **verbatim** in `README`, `CLAUDE.md`, `PLAN-0001`, CI, and `ADR-0001` §4a. `CLAUDE.md` §21.5 also gained bootstrap semantics — `.venv` is gitignored, so a fresh clone must create it |
| **P2-1** | The coverage checker counted a criterion as mapped if it appeared **anywhere** in a milestone section, so `Addresses: AC-R1..AC-R18` while `AC-R19` sat in the test table still passed | Two tiers: **claimed** (in `Addresses:`) and **evidenced** (in tests or stop condition). The stronger check immediately exposed **17 unevidenced criteria** that the weak one had passed. All 70 are now claimed *and* evidenced |

**Two residue fixes in the same pass** (owner review round 7). Neither is a
revision — both are the same defects not fully swept the first time.

| Residue | What was wrong | Where fixed |
|---|---|---|
| **The scalar equation still used PHYSICAL molality** | The governing-model section defines `m̂ = m/m°` and states `Kw_c`/`Ka_c` are dimensionless, then **six lines later** wrote the scalar form as `m_Na + m_H − Kw_c/m_H − m_A,tot·Ka_c/(Ka_c + m_H) = 0` — reintroducing `dimensionless / (mol/kg)`. It was labelled "the familiar scalar form", which is precisely what invites an implementer to copy it | Corrected to reduced symbols throughout, with an explicit note that the hats are not decoration. The same equation in `docs/research/` and the bracketing discussion were corrected too. `PLAN-0001` M4 had already been right — the spec and research doc were trailing behind it |
| **`UNEVIDENCED` was only a warning** | The checker printed unevidenced criteria but returned `ok = not unmapped and not dangling`, so a criterion claimed with no test **passed CI**. That directly contradicts `CLAUDE.md`: *"Each acceptance criterion MUST have a corresponding verification method."* | `UNEVIDENCED` now blocks. Verified by fixture rather than asserted: dropping a criterion from an `Addresses:` line and removing an evidence row each produce exit 1, and reverting restores exit 0 |
