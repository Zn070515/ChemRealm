# ADR-0003: Scientific solver adapter boundary

- **Status:** **Accepted** — M1 Final Closure source-data provenance amendment
  and M3 owner decisions accepted. Owner, 2026-09-12.
- **Deferred decisions:** ADR-0008's availability tiers and product workflow
  remain deferred to M8; the M3 registry/resolver primitive is decided below.
- **Date:** 2026-09-12
- **Deciders:** Project owner
- **Related:** `GOAL.md` §5.1, §5.2, §6.1, §14; `CLAUDE.md` §4.5, §8; `AGENTS.md` §2, §9
- **Blocks:** `PLAN-0001` M3, M4

## Context

`GOAL.md` §6.1 requires one Scientific Reality Core and permits mature external
libraries behind adapters, preferring validated scientific software over
reimplementation. `GOAL.md` §5.2 requires every model to carry a validity domain
and to return `MODEL_OUT_OF_DOMAIN` rather than a plausible but invalid number.

The acid-base titration slice needs, at runtime, only solution equilibrium for
monoprotic acids and strong bases in dilute aqueous solution at 25 °C. The
later stress cases named in `GOAL.md` §17 — Al(III) hydrolysis/precipitation/
amphoterism and Fe(III)–SCN complex equilibria — need multi-component speciation
with solid phases and a curated log K database. Those are different problems.

A technology investigation (2026-09-11, recorded in
`docs/research/scientific-solver-landscape.md`) established:

- The exact titration solve is a **coupled two-unknown problem** — `(m̂_H, Î)`,
  solved by nested bisection, with activity coefficients participating inside
  the equilibrium constraints and on the **molality** basis. A ~150-line
  implementation reproduces analytic activity relations to <1e-9 pH and IUPAC
  acetate buffer standards to within 0.012 pH (`spikes/activity-equilibrium`).
- **PHREEQC** (USGS, public domain) is a legitimate long-term oracle and
  eventual adapter for multi-component speciation.
- **Reaktoro** ships conda-only with no clean Windows pip wheel and adds
  significant build weight. **Cantera**'s electrolyte model cannot impose fixed
  pH or charge-balancing constraints and is the wrong tool for aqueous
  acid-base. **iapws** is GPL-3 and is transitively pulled in by **pyEQL** —
  a license landmine to avoid. None of these are needed for v0.

The owner decided on 2026-09-11: TypeScript solves at runtime; Python plus
PHREEQC produces oracle values at test time only.

The risk this ADR addresses is not "which solver". It is: **a number enters the
world with no record of which model produced it, whether that model was valid,
or what its uncertainty is.** Once that becomes normal, `GOAL.md` §5.2 is
unenforceable.

## Decision

**All scientific computation passes through a single `SolverAdapter` interface.
Adapters return a result envelope that carries model identity, validity status,
and units. Consumers cannot obtain a bare number.**

### Interface shape (indicative; `SPEC-0001` owns the exact schema)

```ts
interface SolverAdapter {
  readonly id: SolverId;            // e.g. "acidbase-monoprotic-davies"
  readonly version: string;         // semver, participates in replay identity
  readonly model: ModelDescriptor;  // exactly one model in v0
  readonly solverConfig: SolverConfig; // exact identity frozen into genesis

  solve(request: SolveRequest): Promise<SolveResult>;
}

type SolveResult =
  | { status: "OK";             state: ScientificState }   // provenance lives INSIDE state
  | { status: "MODEL_OUT_OF_DOMAIN"; reason: string; nearestSupported: ModelDescriptor }
  | {
      status: "NOT_CONVERGED";
      code: SolveFailureCode;
      reason: string;
      residual?: number;
      iterations: number;
    }
  | { status: "INVALID_INPUT";  violations: readonly InputViolation[] };
```

`NOT_CONVERGED` diagnostics are versioned with the scientific wire schema.
`code` and `reason` are always required; `residual` is present only when
the failed iteration produced a finite, meaningful residual. A missing bracket
or an invalid numeric argument must not be represented by a fabricated zero
residual. The failure code identifies the numerical failure class; it does not
turn that failure into a model-domain refusal.

### M3 owner decisions (accepted 2026-09-12)

1. **Solver disagreement has no unconditional authority.** The solver selected
   in a world's genesis record is authoritative for that world's replay
   identity, but not a universal scientific authority. If an independent
   solver or oracle disagrees beyond the accepted tolerance, the result is a
   finding to investigate. Implementations must never average the results or
   silently choose the more convenient one; M4 validation fails until the
   disagreement is explained.
2. **The adapter is async from the start.** The public contract is
   `solve(request): Promise<SolveResult>`, including for a local pure
   TypeScript implementation. This keeps worker, WASM, and out-of-process
   adapters from requiring a later breaking change.
3. **M3 implements only exact availability primitives.** Registry lookup is an
   exact `(id, version)` match: a newer or older version is not a fallback.
   Resolver requirements are constraints, not preferences, and resolution
   returns an explicit unavailable/incompatible reason when no adapter
   satisfies them. ADR-0008's Tier A/B/C replay, re-solve, and archive product
   workflows remain M8 scope.

### M3 contract closure (accepted 2026-09-12)

The implementation now makes the following additions explicit. They are a
contract amendment to the accepted decisions above. The amendment was verified
with the M3 S3 evidence packet at baseline `573c36f` (CI `34682646131`).

1. **World Runtime and science have separate execution boundaries.**
   `packages/world` remains a synchronous, deterministic reducer and replay
   engine. It never calls or awaits a `SolverAdapter`. Composition code builds a
   `SolveRequest` from a committed `WorldState` and awaits the adapter after the
   event boundary; `ReplayOptions.deriveScience` is only a synchronous
   projection/hash callback. Async completion order therefore cannot change
   world truth.
2. **v0 has one adapter, one model, and one exact config.** An adapter's
   `id`/`version`, its `model.id`/`model.version`, and its
   `solverConfig.id`/`solverConfig.version` must be identical. Registry
   registration rejects any mismatch, and compatible resolution returns the
   complete `SolverConfig` that the genesis builder writes to `WorldCreated`.
   Multi-model adapters are deferred until a separate contract is accepted.
3. **SolveRequest solutes are discriminated.** A fully dissociated solute is
   `{ soluteId, amount, mode: "fully-dissociated" }`; a finite-equilibrium
   solute is `{ soluteId, amount, mode: "monoprotic-equilibrium", ka }` with a
   positive dimensionless `ka`. The schema rejects contradictory or incomplete
   combinations.
4. **Domain refusal is actionable.** Every `MODEL_OUT_OF_DOMAIN` result
   carries a required `nearestSupported` `ModelDescriptor`.
5. **Genesis rejects unsatisfied requirements.** The composition-level
   `createWorld` builder resolves canonical requirements before emitting
   `WorldCreated`; incompatible or unavailable resolution returns a reason and
   no event. The builder does not invoke the async solver.

### M3 Identity & Defensive Boundary Closure (accepted 2026-09-12)

The M3 closure implementation adds three runtime protections that are required
before a scientific solver is allowed to produce persisted or rendered state:

1. **Malformed cross-boundary input is a tagged result.** Defensive request
   validation treats decoded or cast values as `unknown` at runtime. Missing,
   malformed, non-finite, or physically impossible fields produce
   `INVALID_INPUT`; they do not escape as a JavaScript property-access error.
2. **Solver identity is a frozen snapshot.** Domain model/config contracts use
   deep-readonly semantics. Adapter construction and registry registration copy
   and freeze nested identity values, and the registry exposes a frozen contract
   wrapper so later mutation of a caller-owned object cannot change the exact
   `(id, version, parameters)` used for lookup or genesis.
3. **Successful results prove their producer.** An `OK` result crosses the
   adapter boundary only after a shared assertion verifies that
   `state.provenance.modelId`, `modelVersion`, and exact `parameters` equal the
   adapter's model and `SolverConfig`. A mismatch is an adapter contract error,
   not a scientific result to propagate.

This candidate does not change the synchronous World Runtime seam, solver
selection policy, or the M4 chemistry scope.

### M4 scenario-scientific-input closure (implementation candidate)

The global `SolverConfig` contains constants that define the solver model,
including `Kw`, `Ka_HOAc`, Davies parameters, the neutral-acid convention, the
numeric `waterActivity` value, and the numeric-policy version. A scenario's
indicator is not a different solver model, so its `Ka_in` does not belong in
that global identity. It is nevertheless scientific input and must be
replayable.

Accordingly, the content-to-genesis resolver writes each resolved indicator to
`ScenarioSnapshot.indicators` as `{ indicatorId, kaIn, provenance }`, with
canonical positive dimensionless `kaIn` and datum-level `DataProvenance`. The
snapshot is covered by `WorldCreated.payload.contentHash`; composition code
copies the frozen snapshot value into `SolveRequest` and never consults mutable
indicator content during replay. The persisted world/event schema version is bumped
from 1 to 2 with a forward migration that adds an explicit empty indicator list
where no prior block exists. This does not recover an indicator that an older
pre-v2 caller supplied only in an unpersisted request, so such a record must not
be presented as having preserved that scientific input.

**Correction (2026-09-11, owner-approved).** The OK branch was sketched above as
`{ state, provenance }`, with provenance a SIBLING of state. The implementation
puts it inside `ScientificState`, and that is now the decision:

> A caller that writes `const state = result.state;` silently drops a sibling
> provenance, and "provenance follows the number" is the entire point of
> `GOAL.md` §12. Carrying it twice would be the second-source-of-truth defect
> this project removed from `Vessel.contents`.

This is also why no `getPh(): number` shortcut exists (see below): every
shortcut that flattens a result into a bare value is a place provenance is lost.

Three properties make this load-bearing rather than decorative:

### Amendment — solver provenance is not source-data provenance (accepted)

`Provenance` belongs to a solver result and answers which model, version,
activity model, and pinned parameters produced the state. It is not a citation
for an input such as density or molar mass. Genesis snapshots therefore use the
separate `DataProvenance` contract attached directly to each datum: density and
each composition or molar-mass record carry their own source reference,
confidence category, and optional tagged measurement conditions. The record's
`soluteId` identifies the composition or molar-mass datum it accompanies; there
is no aggregate target list whose coverage can be ambiguous. Neither type may be
substituted for the other merely because both contain a `category` field. This
distinction is accepted as part of M1 Final Closure. It authorizes no runtime
milestone beyond the plan's explicit gates.

### What `ScientificState` contains — and what it does not

**Clarified 2026-09-11 (round 3, finding P1-D).** Three documents previously
disagreed about this, which would have forced an implementing agent to guess.

`ScientificState` is the scientific core's output and contains:

```
ScientificState {
  species: [
    { symbol,
      reducedMolality: ReducedMolality,   // the algebra's native variable
      molality:        MolPerKilogram,    // = reducedMolality × m°
      amount:          Mol,
      activityCoefficient: ActivityCoefficient,
      activity:        Activity }
  ]
  ionicStrengthMolal:    IonicStrengthMolal
  ionicStrengthReduced:  ReducedIonicStrength
  modelPh:               Ph          // -log10 a(H+), under a named model
  indicators:            { indicatorId, protonationRatio: number }[]
  validity:              ValidityStatus
  provenance:            Provenance
}
```

**Correction (2026-09-11, owner-approved): per-species records, not parallel
arrays.** The block above previously listed five parallel arrays, each keyed by
`symbol`. The implementation uses one record per species, and that is now the
decision:

> Attribute-parallel storage invites silent misalignment. Two arrays that must
> stay the same length fail by *slipping*, not by erroring: a species dropped
> from one array shifts every later entry, and nothing in the type system
> notices. One record per entity cannot drift out of step with itself.

It also means adding a per-species field is a local change rather than a sixth
array that has to be kept aligned with five others.

**Why reduced molality is a first-class output** (round 4, finding P1-1). `Kw` is
dimensionless, so `m_OH = Kw_c / m_H` divides a pure number by a dimensioned
concentration and is not mol/kg. The algebra must be written in
`m̂ = m/m°`; physical molality is produced by multiplying by `m°` once, here.
`ReducedMolality` and `MolPerKilogram` are distinct types so the two cannot be
silently interchanged (`ADR-0004`).

It does **not** contain `c(H⁺)`, `−lg c(H⁺)`, or any molarity — those require the
world's solution volume, which the scientific core does not have.

`c(H⁺)` and `−lg c(H⁺)` are produced by **`ScientificProjection`**, which takes
`ScientificState` plus plain physical data (`waterMass`, `liquidVolume`) and is
tested independently of both the world runtime and the renderer.

Molality is the core's *numerical base*; it is not a limit on what the core may
output. Activity, ionic strength, model pH, and indicator speciation are all
scientific and all live here.

### Boundary properties

1. **No bare numbers cross the boundary.** A consumer that wants the model pH
   reads `ScientificState.modelPh` together with its `Provenance`. There is no
   `getPh(): number` shortcut, because that shortcut is how provenance gets lost.

2. **Validity is a first-class return value, not an exception.** Returning
   `MODEL_OUT_OF_DOMAIN` is a *normal* outcome. The spike demonstrates why this
   matters: at 1e-6 M acetic acid, the Henderson–Hasselbalch form is wrong by
   0.65 pH. Any model with a stated validity range will be asked to work outside
   it eventually, and the interface must make refusing easy rather than awkward.

3. **Solver identity is part of replay identity.** `SolverId` + `version` +
   model parameters are written into the world's genesis record. Replay compares
   only within the same solver identity (`ADR-0002`, `ADR-0007`). Silently
   swapping in a different solver that returns a different number is a P0 defect,
   not a refactor.

### v0 implementation: `acidbase-monoprotic-davies`

**Named for the model, not for a quality claim** (round 4, finding P2-3). The
earlier id `acidbase-exact` was wrong: the model uses the Davies activity
equation, `γ_neutral = 1`, `a_w = 1`, a monoprotic indicator approximation,
instantaneous equilibrium, and a fixed 25 °C. Whatever "exact" was meant to
convey — that the solver does not take the Henderson–Hasselbalch shortcut — the
id is permanent replay identity and should say **which model**, not how good it
is. Renaming later would invalidate every persisted world.

The id plus version plus parameters form the solver's identity; a change to any
constant in the parameters is a new version (`ADR-0008` open decision 2).

An in-repository TypeScript adapter implementing the exact charge-balance
formulation validated in the spike. Scope is fixed by `SPEC-0001` §Scientific
Design: monoprotic acids (strong and weak), strong bases, water at 25 °C,
activity via Davies on the **molality** basis, ionic strength `I_m` ≤ 0.5 mol/kg.
Outside that: refuse.

### Deferred: `phreeqc-adapter`

Defined as an interface target now, implemented when the Al/Fe stress cases
arrive. It will be reached through `tools/oracle` (test-time) first and only
later, if ever, become a deployed service. **The owner's hybrid decision means
no Python process is on the v0 production path.**

### Prohibited, explicitly

- A world content file containing its own private chemistry (no
  `worlds/titration-001.ts` with an inline acid-base calculation — `AGENTS.md` §10).
- A renderer calling a solver, or reading a model parameter (`ADR-0006`).
- ACE calling a solver to produce a chemistry answer for a student
  (`AGENTS.md` §2). ACE reads already-computed world state.
- Encoding a known exam answer as a special case. `GOAL.md` §8.1 and the
  `CLAUDE.md` §8.1 `if FeCl3 then yellow` example are the canonical prohibition.

## Alternatives considered

**Adopt PHREEQC (or Reaktoro) as the runtime solver from day one.** Rejected for
v0. It places a conda-only or MSI-installed native dependency on the browser
runtime path — impossible in a browser, so it forces a server, which contradicts
the owner's hybrid decision and weakens the local-first privacy posture in
`GOAL.md` §5.5. It is also, on the evidence of the spike, unnecessary: the exact
solve is more precise than PHREEQC's default convergence tolerance for this
domain, and PHREEQC's real advantage (activity models, curated databases) is not
needed until the Al/Fe cases.

**Write the exact solver with no interface, refactor to an adapter later.**
Rejected. "Later" is when provenance is already lost and consumers have grown
direct calls. The interface costs little now and is the entire point.

**Have the adapter throw on out-of-domain input.** Rejected. Exceptions
encourage `try/catch`-and-continue, which converts a refusal into a silently
propagated stale value. A returned status forces the caller to handle it.

**Put the adapter in the World Runtime.** Rejected. The World Runtime must not
contain scientific truth (`CLAUDE.md` §4.4). Runtime stores scientific state; it
does not compute it.

**Let the adapter live in the browser worker and expose a `number`-returning
convenience API.** Rejected. Convenience APIs are what erode boundaries. If a
call site genuinely needs a scalar, it can read it off the returned state, and
that read is visible in review.

## Consequences

### Positive
- Every number in the world is traceable to a model, a version, and a validity
  assessment. `GOAL.md` §12 provenance requirements become achievable rather than
  aspirational.
- Adding the PHREEQC adapter later does not touch the World Runtime,
  Representation Engine, or ACE.
- Adapters are independently testable against the oracle with no browser and no
  UI (`AGENTS.md` §8).

### Negative
- More ceremony at every call site than `const ph = solvePh(...)`.
- The result envelope is a schema, so changing it is a versioned change.
- Two solver implementations may disagree on some input. The disagreement is
  deliberately visible and follows the investigation policy above; it is not
  averaged or silently resolved by the adapter boundary.

### Neutral
- The adapter boundary is invisible to users. Its cost is entirely in developer
  ergonomics, and it is paid deliberately.

## Reversibility

**Moderate to hard.** The interface itself can evolve while there is one
implementation. But once provenance and solver identity are persisted in the
event log, removing them is a format migration. The decision to keep scientific
computation out of the renderer and ACE is the hard-to-reverse part, and that is
intentional — it is `GOAL.md` §5.3.

## Open questions

1. ~~When `acidbase-monoprotic-davies` and `phreeqc-adapter` disagree, which is
   authoritative?~~ **RESOLVED by owner, 2026-09-12.** Neither is
   unconditionally authoritative; disagreement above tolerance is a finding,
   never an input to averaging or silent selection.
2. ~~Should the adapter be synchronous or async in its interface?~~
   **RESOLVED by owner, 2026-09-12.** `SolverAdapter.solve` is async from the
   start and returns `Promise<SolveResult>`.
3. ~~Activity model for v0~~ — **RESOLVED 2026-09-11.** Davies on the
   **molality** basis, participating **inside** the equilibrium constraints, with
   the two ionic-strength bases kept as distinct types. Demonstrated to
   ±0.02 pH against IUPAC buffers with the self-consistent solve
   (`spikes/activity-equilibrium`). The ±0.02 figure is accepted; the display
   rule is 2 decimal places, derived from it. SIT or Pitzer would be more
   accurate at higher ionic strength and remain out of scope. See
   `docs/science/quantity-ontology.md`.
4. ~~What happens to a persisted world whose solver version no longer ships?~~
   **M3 boundary resolved by owner, 2026-09-12.** The registry provides exact
   `(id, version)` lookup and requirements compatibility/unavailability
   reasons. The three availability tiers (exact replay / re-solve / archive)
   and their product workflow remain `ADR-0008` / M8 scope.
