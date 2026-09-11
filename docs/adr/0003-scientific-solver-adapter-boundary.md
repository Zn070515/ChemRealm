# ADR-0003: Scientific solver adapter boundary

- **Status:** Proposed
- **Date:** 2026-09-11
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

- The exact titration solve is a single scalar root-find on the charge balance.
  A 200-line implementation reproduces an independent closed form to <0.0001 pH
  and reproduces IUPAC acetate buffer standards to within 0.012 pH
  (`spikes/activity-equilibrium`).
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
  readonly id: SolverId;            // e.g. "acidbase-exact"
  readonly version: string;         // semver, participates in replay identity
  readonly models: readonly ModelDescriptor[];

  solve(request: SolveRequest): SolveResult;
}

type SolveResult =
  | { status: "OK";             state: ScientificState; provenance: Provenance }
  | { status: "MODEL_OUT_OF_DOMAIN"; reason: string; nearestSupported: ModelDescriptor }
  | { status: "NOT_CONVERGED";  residual: number; iterations: number }
  | { status: "INVALID_INPUT";  violations: readonly InputViolation[] };
```

Three properties make this load-bearing rather than decorative:

1. **No bare numbers cross the boundary.** A consumer that wants pH receives a
   `ScientificState` plus the `Provenance` that produced it. There is no
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

### v0 implementation: `acidbase-exact`

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
- Two solver implementations will eventually disagree on some input. The
  interface makes that *visible* (different `SolverId`), but the project still
  needs a policy for which one is authoritative. Recorded as an open question.

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

1. When `acidbase-exact` and `phreeqc-adapter` disagree, which is authoritative?
   **Proposed: neither, unconditionally — a disagreement above tolerance is a
   finding to investigate, and the world records which solver produced its
   numbers.** Owner confirmation wanted before M3.
2. Should the adapter be synchronous or async in its interface? A future
   PHREEQC-over-HTTP adapter is async; a pure local solve is sync. Deciding
   async now costs a little ergonomics and avoids a breaking change later.
   **Leaning: async from the start.** Confirm at M3.
3. ~~Activity model for v0~~ — **RESOLVED 2026-09-11.** Davies on the
   **molality** basis, participating **inside** the equilibrium constraints, with
   the two ionic-strength bases kept as distinct types. Demonstrated to
   ±0.02 pH against IUPAC buffers with the self-consistent solve
   (`spikes/activity-equilibrium`). The ±0.02 figure is accepted; the display
   rule is 2 decimal places, derived from it. SIT or Pitzer would be more
   accurate at higher ionic strength and remain out of scope. See
   `docs/science/quantity-ontology.md`.
4. **What happens to a persisted world whose solver version no longer ships?**
   Not answerable within this ADR — it is `ADR-0008`, which defines three
   availability tiers (exact replay / re-solve / archive). The adapter registry
   must be able to report *which* tiers are available for a given world, which
   is a small addition to the interface above. Confirm at M3.
