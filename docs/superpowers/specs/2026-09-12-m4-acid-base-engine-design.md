# M4 Acid-Base Engine and Oracle Validation Design

Status: Design v2 approved by the project owner on 2026-09-12 after
self-review. Implementation is in progress; the M4 Chemical Identity Closure
is recorded as the revision-13 candidate in `SPEC-0001` and `ADR-0011`. The
M4 Scientific Domain & Constant Semantics Closure is recorded as the
revision-14 candidate and `ADR-0012`; both remain pending owner review.
The scientific wire result diagnostics are revision-15 candidate material:
scientific schema v2 introduced an explicit numerical failure code and reason.
The current scientific wire schema is v3; v3 additionally separates accepted
input components from equilibrium species. The cross-system compatibility
closure is revision-16 candidate material: actual scenario components
participate in genesis resolution, authoring scenarios are shape version 3,
resolved requirement temperatures are canonical Kelvin, and the Davies solver
never evaluates activity outside its declared domain. Persisted world/event
schema v3 is revision-17 candidate material: v2 temperature snapshots migrate
to canonical Kelvin rather than being reinterpreted in place.

## Context

M0–M3 establish the Scientific Reality Core boundary, typed quantities,
defensive DTO parsing, exact solver identity, and the synchronous World Runtime
boundary. The repository now has a deterministic production adapter for the
v0 slice; independent reference fixtures and PHREEQC oracle validation remain
pending.

The first scientific slice is aqueous monoprotic acid/strong-base chemistry at
25 °C with Davies activity correction. The activity-equilibrium spike proves
that the intended formulation is a coupled solve, but its inner ionic-strength
iteration is a damped fixed point and its Python implementation is not a
production path. M4 must promote the formulation only after implementing a
deterministic TypeScript solver and comparing it with independently authored
references and a PHREEQC CLI oracle.

## Goal

M4 will deliver an acidbase-monoprotic-davies@1.0.0 adapter that:

1. solves the accepted self-consistent molality/activity formulation;
2. emits a typed ScientificState with model pH, species, activities, indicator
   ratios, validity, and producer provenance;
3. refuses invalid input and out-of-domain states without fabricating numbers;
4. uses deterministic logarithm/exponentiation primitives on the
   replay-relevant scientific path;
5. passes hand-authored reference cases and independent PHREEQC cross-checks,
   including the weak-acid equivalence region; and
6. records every solver constant, source, precision, and model identity needed
   to reproduce the result.

## Non-goals

- Generic polyprotic, multi-equilibrium, precipitation, redox, or non-aqueous
  chemistry.
- A Python or PHREEQC dependency in the browser or production runtime.
- A change to the synchronous reducer, event log, or branch model. The required
  scenario snapshot amendment is limited to freezing resolved indicator inputs
  and is versioned/migrated under `ADR-0011`.
- M5 observable-state projections, renderer colour mapping, ACE behaviour, or
  M6 apparatus assets.
- Replacing the scientific model with Henderson–Hasselbalch or a lookup table.
- Averaging TypeScript and PHREEQC results when they disagree.

## User experience

M4 has no new visual surface. Its user-visible contract is the result envelope
consumed by later composition and observable layers:

- valid supported input produces a ScientificState;
- malformed input produces INVALID_INPUT with field-level violations;
- requirements-stage solvent, phase, and required-species incompatibility is
  rejected before `WorldCreated`; solve-stage temperature, component,
  analytical-total, and converged ionic-strength refusals produce
  MODEL_OUT_OF_DOMAIN with a reason and nearest supported descriptor;
- a numerical failure produces NOT_CONVERGED with a code, reason, iteration
  count, and a residual only when one was meaningfully computed — never a
  plausible fallback number; and
- results identify the activity model and solver identity so a later inspection
  view can describe model pH honestly rather than call it “true pH”.

## Architecture

M4 belongs to the Scientific Reality Core. The production path is:

    committed WorldState
          ↓ composition builds SolveRequest
          ↓ async SolverAdapter.solve()
          ↓ defensive request validation
          ↓ acid-base model domain check
          ↓ reduced-molality equilibrium solve
          ↓ ScientificState + producer identity assertion

The World Runtime remains a synchronous pure reducer. It neither imports the
solver nor awaits it. The adapter receives a complete request and returns a
tagged result; it does not append events, mutate world state, or read authored
content.

The implementation is split by responsibility:

- packages/sci/src/acidbase/model.ts owns the model descriptor, parameter names,
  species roles, validity domain, and typed constant interpretation.
- packages/sci/src/acidbase/activity.ts owns reduced ionic strength and Davies
  activity coefficients.
- packages/sci/src/acidbase/solve.ts owns the bracketed nested root solve and
  residual diagnostics.
- packages/sci/src/acidbase/species.ts owns mass balance, charge balance,
  ionic-strength calculation, species inventory, and state construction inputs.
- packages/sci/src/acidbase/catalog.ts owns the exact v0 component identities,
  stoichiometric roles, and the fixed acid constant used by this model. It
  never infers chemistry from a material label.
- packages/sci/src/acidbase/indicator.ts owns indicator equilibrium ratios; it
  does not map ratios to colours.
- packages/sci/src/acidbase/index.ts owns adapter orchestration, domain
  refusal, result construction, and the M3 identity assertion.
- packages/sci/src/deterministic-math.ts owns deterministic detLog10 and
  detExp10, including their validated input domains.
- packages/sci/test/reference/*.json owns independent reference fixtures; these
  files are never generated by the TypeScript solver.
- tools/oracle/phreeqc/ owns test-time PHREEQC batch generation and parsing; it
  is not imported by packages/sci.

## Scientific design

### Accepted model and units

The model is aqueous, monoprotic, and fixed at 25 °C. All equilibrium algebra
uses reduced molalities:

    m̂_i = m_i / m°                         dimensionless
    Î   = I_m / m°                           dimensionless
    a_i = γ_i · m̂_i                         dimensionless
    I_m = 0.5 · Σ(m_i z_i²)                  mol/kg water

The activity equations are:

    log10(γ_i) = -A z_i² ( √Î/(1 + √Î) - bÎ )
    Kw = a_H · a_OH
    Ka = a_H · a_A / a_HA

The neutral acid approximation is γ_HA = 1. `a_w = 1` is an explicit v0 model
convention, represented in the frozen solver parameter bag as `waterActivity`.
It records the unit-water-activity assumption but is not multiplied into the
v0 `Kw` equation. A positive non-unit value is outside this v0 model and is
refused. Kw, Ka, A, and b are dimensionless model parameters. Physical
molalities are created only at the ScientificState boundary by multiplying
reduced molality by m°.

### Input interpretation and fixed v0 component catalog

The model interprets SolveRequest.soluteId as an exact model component identity,
not as a display label. The v0 catalog is:

| Component id | Required mode | Scientific contribution |
|---|---|---|
| HCl | fully-dissociated | one strong-acid chloride equivalent, contributing Cl⁻ |
| NaOH | fully-dissociated | one strong-base sodium equivalent, contributing Na⁺ |
| HOAc | monoprotic-equilibrium | total HA/A⁻ family with the catalogued Ka |
| NaOAc | fully-dissociated | Na⁺ and the same total acid family as HOAc |

Free H⁺ and OH⁻ are produced by the water/equilibrium equations; they are not
treated as authored solute labels. HCl, NaOH, HOAc, and NaOAc are the only
component ids the v0 adapter may accept. Any other id or a mode that contradicts
this catalog returns MODEL_OUT_OF_DOMAIN with a reason. The mapping is a
model-owned stoichiometric catalog, so a material name cannot silently select a
chemical behavior.

The `fully-dissociated` and `monoprotic-equilibrium` labels in this table are
catalog modes owned by the Scientific Reality Core, not authoring fields. The
Scenario content contract carries component identity and quantities only; it
has no `fullyDissociated` boolean for the resolver to ignore or override.

Repeated entries for the same component id are aggregated only when their mode
and, for HOAc, their Ka agree exactly. Conflicting duplicate entries are
MODEL_OUT_OF_DOMAIN rather than an implicit precedence rule.

The equilibrium solute ka remains present in SolveRequest because it is part of
the M3 scientific request contract. For HOAc, the adapter requires it to equal
the frozen catalog value in its SolverConfig exactly; a different finite value is
an unsupported model request, not a silently substituted constant. Indicator
`Ka_in` is different: it is scenario-specific scientific input. Content
resolution canonicalizes it, attaches per-datum source provenance, and freezes
it in `ScenarioSnapshot.indicators`, which is covered by the genesis content
hash. A later SolveRequest is built only from that frozen snapshot block; it
does not read a mutable indicator catalog. This keeps indicator choice out of
global solver identity while keeping the scientific input replayable.

### Solve structure

The solver finds (m̂_H, Î) by nested bracketed bisection:

1. For a trial m̂_H, compute activity coefficients and conditional
   dimensionless constants.
2. Solve the ionic-strength fixed-point equation with an explicit bracketed
   inner solve; do not use the spike's damped fixed-point iteration in
   production.
3. Evaluate the charge-balance residual in reduced variables.
4. Bracket the outer root by the documented ideal-root/expansion procedure and
   bisect until the configured residual and interval tolerances are met.
5. Recompute the converged ionic strength and domain status from the final
   unquantized state before emitting any number.

Every activity evaluation, including an outer trial and an exact-boundary
classification, is made at `0 <= Î <= 0.5`. If a legal boundary evaluation
establishes that the root lies beyond the Davies domain, the solver returns an
explicit domain refusal. It never evaluates Davies coefficients at an
exploratory `Î > 0.5` value merely to classify that refusal; an inability to
establish a bracket inside the legal envelope remains `NOT_CONVERGED`.

The supported v0 species are the named strong-acid/strong-base ions and one
monoprotic acid family represented by the existing SolveRequest solute union.
The model rejects unsupported species and ambiguous solute modes before the
numerical solve. It does not infer chemistry from a material label.

### Deterministic mathematics

detLog10 and detExp10 use only the operations approved by ADR-0007 and the
specified integer reduction steps. detExp10 uses a two-part Cody–Waite argument
reduction. Each function has a measured validated domain; calls outside that
domain return a typed refusal or cause the model to return
MODEL_OUT_OF_DOMAIN, never an uncontrolled accuracy degradation.

Math.sqrt is permitted. Native Math.log10, Math.exp, and Math.pow are forbidden
in the Scientific Reality Core. The solver's unquantized residuals remain
available for charge and convergence evidence; hash/canonicalization policy
remains the responsibility of the existing runtime projections.

### Scientific outputs

The adapter emits the existing ScientificState contract:

- every species has reduced molality, physical molality, amount, activity
  coefficient, and activity;
- ionic strength is emitted in both physical and reduced forms;
- modelPh is −log10(a_H) and is explicitly model-dependent;
- each requested indicator emits the scientific protonation ratio
  m(In⁻)/m(HIn);
- validity reports whether the solve is inside the computational domain and
  whether it is inside the proposed accuracy envelope; and
- Provenance carries the exact model, version, activity model, and parameters
  asserted against the adapter's frozen identity.

Molarity and taught −lg c(H⁺) are not emitted by the core. A separate
ScientificProjection may derive them from the scientific state plus physical
solution volume, as defined in SPEC-0001.

### Constants and provenance

The exact M4 solver configuration is acidbase-monoprotic-davies@1.0.0. Parameter
keys, values, units/interpretation, source citation, source edition or version,
and source precision are recorded in
docs/research/constants-provenance.md. No value may carry more significant
figures than its source. A changed constant creates a different solver
configuration and therefore a different replay identity.

The fixed configuration includes the global model constants Kw, Ka_HOAc,
Davies A and b, standard molality, neutral-acid activity coefficient, numeric
`waterActivity`, and the numeric-policy precision/version represented by the
adapter's exact identity. `waterActivity: 1` is an identity/model convention,
not a multiplier in the v0 `Kw = a_H · a_OH` equation. Scenario-specific indicator Ka values are not global
model constants: they are resolved into the genesis snapshot with per-datum
provenance and copied from there into each SolveRequest.

M4 also reviews the density and molar-mass provenance already attached to
MaterialSnapshot inputs because they determine the water-mass/molality boundary.
It does not duplicate those data in SolverConfig or move their ownership out of
the genesis data-provenance contract.

## World/event design

M4 adds no new event type. WorldCreated keeps the exact SolverConfig selected by
M3 and the resolved scenario-specific indicator block inside its self-contained
ScenarioSnapshot; the acid-base adapter is resolved and invoked by composition
code after a committed world state exists.

The adapter is deterministic for the same request and frozen configuration.
World replay does not invoke it implicitly, and solver completion order cannot
change event sequence, world hash, branch identity, or snapshot truth.

## Representation design

No renderer code changes in M4. The scientific core exposes model pH and
indicator protonation ratios as approved scientific outputs. Later M5 code may
map those outputs to observables and colours; it must not recompute activity,
Ka, or indicator equilibrium in the renderer.

## Learning design

No ACE or learner-state behavior changes in M4. Scientific refusal and model
qualification are data available to later teaching layers, but M4 does not
choose hints, diagnose learners, or alter chemistry for pedagogy.

## Privacy/compliance

No privacy boundary changes. The solver is local TypeScript code. PHREEQC runs
only in test tooling, consumes checked-in fixtures, and sends no data over the
network. No account, telemetry, learner identity, or cloud persistence is
introduced.

## API/schema changes

The existing public adapter shape remains stable:

    export function createAcidBaseAdapter(): SolverAdapter;

    solve(request: SolveRequest): Promise<SolveResult>;

There is no public arbitrary-constant override on the production factory. A
constant override would let two adapters claim the same fixed id/version while
solving different models. Test vectors vary inputs; they do not mutate the
accepted production identity. Any future configurable model requires a new
explicit identity/configuration contract.

The adapter's frozen identity is:

    id      = "acidbase-monoprotic-davies"
    version = "1.0.0"

The model descriptor declares aqueous solvent, aqueous phase, 25 °C, the
computational ionic-strength ceiling of 0.5 mol/kg, the closed supported
species set, and activityCorrected: true. The persisted SolverConfig contains
the exact numeric parameter bag required by the M3 identity contract.

The persisted world/event schema is version 3 because v2 could persist a
non-canonical temperature spelling. Migration `1 → 2` adds `indicators: []`
only where no prior value exists; migration `2 → 3` canonicalizes a persisted
requirement temperature to Kelvin. Neither step invents a missing constant.
The authored `Scenario` shape is a separate versioned contract and is currently
version 3 with its own migration namespace. Its resolved snapshot freezes
canonical Kelvin requirements, canonical positive dimensionless `kaIn`,
per-datum `DataProvenance`, and actual component identities before genesis;
authoring units are never retained as alternate snapshot representations.
Scientific DTOs retain their independent scientific schema version.

The current runtime schema represents the proposed accuracy-envelope result as
ValidityStatus.withinProposedAccuracyEnvelope, a boolean. SPEC-0001 revision 12
now uses that same field. No parallel accuracyStatus field or schema version
bump is introduced.

## Failure modes

| Failure | Required behavior |
|---|---|
| Missing, malformed, non-finite, or physically impossible request field | INVALID_INPUT with violations; no solver callback and no exception escape |
| Incompatible solvent, phase, required species, or derived scenario component in `SolverRequirements`/resolution context | Resolver rejects before `WorldCreated`, with an actionable reason |
| Unsupported component or temperature in `SolveRequest` | MODEL_OUT_OF_DOMAIN with reason and nearest supported descriptor |
| Total analytical solute molality below 1e-9 or above 0.5 mol/kg | MODEL_OUT_OF_DOMAIN before aggregation/solve |
| Final converged ionic strength exceeds 0.5 mol/kg | MODEL_OUT_OF_DOMAIN; do not emit ScientificState |
| Positive non-unit water activity | MODEL_OUT_OF_DOMAIN; v0 uses the unit-water-activity convention only |
| Root bracket cannot be established for an otherwise in-domain request | NOT_CONVERGED with diagnostic code/reason and iterations; residual is optional and never invented |
| Inner or outer solve reaches iteration limit | NOT_CONVERGED; no stale or partial state |
| Deterministic math argument outside the model's declared validated band | MODEL_OUT_OF_DOMAIN; never silently call a native substitute |
| Internal solver invariant produces an invalid math argument | NOT_CONVERGED with a diagnostic; the invariant is a test failure and no partial state is emitted |
| TypeScript/PHREEQC disagreement beyond tolerance | recorded investigation failure; never averaged or hidden |
| Missing constant citation or invented precision | M4 S3 blocked; no accepted evidence claim |

## Test plan

Tests are written before each production behavior and must first fail for the
intended reason. The test layers are:

1. deterministic-math unit tests against arbitrary-precision vectors, including
   domain refusal and Cody–Waite boundary values;
2. activity/species tests for dimensionless reduced algebra, Davies values,
   mass/charge balance, indicator ratio continuity, and monotonicity;
3. solver tests for strong acid/base excess, weak-acid buffer, dilute weak acid,
   equivalence region, low-water/high-ionic-strength boundaries, and refusal;
4. adapter contract tests for all four result statuses and exact provenance;
5. hand-authored canonical REF-1 through REF-10 fixtures loaded from JSON,
   kept separate from the ORACLE-* PHREEQC sweep. REF-5 and REF-6 exercise
   ScientificProjection for the distinct taught/model hydrogen quantities;
   REF-10 measures molality/molarity sensitivity. None add molarity to
   ScientificState;
6. Python PHREEQC batch tests using aligned molality inputs and a locally pinned
   database; and
7. a swept cross-engine comparison that includes pre-equivalence, equivalence,
   and post-equivalence points and reports disagreement without averaging.

The test suite also includes a static check that packages/sci contains no native
Math.log10, Math.exp, or Math.pow calls and no MolPerLitre input to acid-base
internals.

## Acceptance criteria

| Criterion | Result required | Evidence |
|---|---|---|
| AC-S1 | REF-1..REF-10 pass within their stated tolerances | Vitest reference suite and Python fixture validation |
| AC-S2 | Unquantized charge residual is below 1e-14 mol/kg across the reference sweep | solver invariant report |
| AC-S3 | Na, Cl, and acid-group totals are conserved over 100 transfers | World/science integration fixture |
| AC-S4 | Requirements resolution refuses unsupported solvent, phase, and required species before genesis; the adapter refuses unsupported temperature, component/analytical totals, and converged I_m | resolver + adapter domain matrix |
| AC-S5 | 1e-6 mol/kg acetic acid matches the exact solve and reproduces the 0.65 pH Henderson–Hasselbalch divergence | adversarial solver test |
| AC-S6 | PHREEQC and TypeScript differ by no more than ±0.02 pH, including equivalence | cross-check report |
| AC-S7 | Every constant has source, precision, and provenance record | constants provenance review |
| AC-S8 | No molarity reaches acid-base internals; m(H⁺), c(H⁺), and a(H⁺) have distinct paths | static/type tests and projection test |
| AC-S9 | Taught −lg c(H⁺) and model pH remain distinct types and both references pass | compile fixture plus REF-5/REF-6 |
| AC-S10 | Deterministic log/exp functions meet the stated ulp bound in-domain and refuse outside | numeric vectors |
| AC-S11 | Outer residual is strictly increasing over the expanded sweep and domain boundary | monotonicity test |
| AC-S12 | No UI or documentation calls model pH “true” or “thermodynamic” pH | copy review and existing inspection contract |
| AC-S13 | Results outside the proposed accuracy envelope carry withinProposedAccuracyEnvelope: false | validity-domain test |
| AC-S14 | The v0 scenario maximum ionic strength is checked against the proposed envelope | boundary evidence |
| AC-S15 | Missing scenario density is rejected rather than defaulted | schema/content negative test |
| AC-S16 | Constant precision never exceeds the cited source precision | provenance review |

## Self-review findings and closure status

The first self-review found and resolved the following design ambiguities in this
document:

- v0 component ids and stoichiometric roles are now explicit and model-owned;
- the public factory no longer permits an identity-breaking constant override;
- HOAc Ka is tied to the frozen solver configuration and genesis identity;
  scenario-specific indicator Ka is tied to the frozen genesis snapshot and
  per-datum source provenance, rather than to global solver identity;
- bracket, deterministic-math, and internal-invariant failures have distinct
  public result behavior; and
- REF-5/REF-6 are explicitly assigned to ScientificProjection rather than
  being smuggled into ScientificState. REF-10 is a scale-sensitivity property
  suite, not a replacement for the canonical projection references.

The owner accepted the recommended resolution: the existing
`withinProposedAccuracyEnvelope` boolean is the sole accuracy-envelope
representation, and SPEC-0001 revision 12 records that decision. The design is
ready for an implementation plan; the remaining open questions are
evidence-pinning tasks only.

## Rollout/migration

M4 is additive to the M3 adapter contract. The stub remains available for
contract tests, while composition tests gain a real acid-base adapter fixture.
The persisted world/event schema is version 3. Its explicit migration chain is
`1 → 2 → 3`: the first step adds an empty indicator list where no prior block
exists, and the second canonicalizes legacy persisted requirement temperature
to Kelvin. Both steps preserve the original record and the World Runtime
rebuilds the derived genesis checksum after the snapshot changes. The authored
Scenario shape is a separate version 3 contract with an independent migration
namespace; removal of the ignored dissociation field has no automatic rewrite.

The adapter is not registered as the default application solver until its
reference and PHREEQC evidence pass. Before S3, any disagreement or missing
oracle capability remains visible as a blocked evidence item rather than being
relabelled as a successful validation.

## Open questions

The algorithm and ownership decisions are otherwise closed. Two external
evidence details must be pinned during implementation before M4 S3:

1. the exact citable source and precision for the acetic-acid Ka, densities,
   molar masses, Kw, Davies constants, neutral-acid approximation, and
   indicator constant; and
2. the exact PHREEQC executable/database version and checksum used by the oracle
   runner.

These are evidence-pinning tasks, not permission to change the model or to
replace PHREEQC with a weaker self-check.
