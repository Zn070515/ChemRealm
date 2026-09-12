# M4 Acid-Base Engine and Oracle Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the owner-approved `acidbase-monoprotic-davies@1.0.0` Scientific Reality Core adapter and validate its self-consistent activity-equilibrium results against hand-authored references and a pinned PHREEQC CLI oracle, without changing World Runtime or inventing a chemistry shortcut.

**Architecture:** `packages/sci` owns the reduced-molality/Davies solver, deterministic math, species algebra, indicators, the scientific adapter, and the `ScientificProjection` boundary. `packages/schema` remains the cross-boundary shape authority. `tools/oracle/phreeqc` owns test-time external execution and comparison only. The World Runtime remains a synchronous event fold and is never made solver-aware.

**Tech Stack:** TypeScript, Vitest, Zod contracts from `@chemrealm/schema`, Node 22, pnpm 11, Python 3.12, uv, pytest, PHREEQC CLI in test tooling only, and a committed PHREEQC/database manifest with checksums.

**Spec:** `docs/superpowers/specs/2026-09-12-m4-acid-base-engine-design.md` (Design v2, approved); `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md` revisions 13–14 candidates; `docs/adr/0003-scientific-solver-adapter-boundary.md`; `docs/adr/0007-deterministic-numeric-and-replay-policy.md`; `docs/adr/0011-scenario-scientific-input-freezing.md`; `docs/adr/0012-m4-domain-and-constant-semantics.md`.

## Global Constraints

1. Read `GOAL.md`, `AGENTS.md`, the approved design, the current SPEC, ADR-0003, ADR-0007, `docs/science/quantity-ontology.md`, and `spikes/activity-equilibrium/README.md` before implementation. The spike is an origin record and an independent-derivation warning, not an accepted reference dataset.
2. Work directly in the current shared working tree. Do not create a worktree or pull request. At the end of each completed round, verify, inspect the diff, commit, and push `main`.
3. Use TDD for every production behavior: add a narrowly scoped failing test first, run it and record the intended failure, implement the smallest change, run the targeted test, then refactor without weakening the test.
4. `packages/schema` remains the only owner of persisted/wire shapes. Any required M4 contract change must be explicit, versioned, migrated, and emitted into the committed JSON Schema artifacts; never silently widen a persisted shape.
5. The v0 production factory has no arbitrary constants override. It returns exactly one frozen identity: `acidbase-monoprotic-davies@1.0.0`.
6. The exact v0 component catalog is model-owned:
   - `HCl` in `fully-dissociated` mode contributes strong-acid/chloride analytical totals;
   - `NaOH` in `fully-dissociated` mode contributes strong-base/sodium analytical totals;
   - `HOAc` in `monoprotic-equilibrium` mode contributes the acetate-family analytical total and must carry exactly the frozen model Ka;
   - `NaOAc` in `fully-dissociated` mode contributes sodium and the same acid-family analytical total as HOAc; origin does not create a separate permanent-acetate pool;
   - any other component ID, mode, or HOAc Ka is `MODEL_OUT_OF_DOMAIN` after request validation;
   - duplicate entries aggregate only when their mode and equilibrium constant agree exactly; conflicting duplicates refuse.
7. The solver's native unknowns are dimensionless reduced molalities `m̂` and reduced ionic strength `Î`. Physical molality is produced once at the scientific-state boundary as `m = m̂ · m°`. `MolPerLitre` must not enter acid-base internals.
8. The accepted scientific model is self-consistent: activity coefficients participate inside the equilibrium equations and ionic strength is solved with a bracketed inner solve. No post-hoc activity correction, Henderson–Hasselbalch replacement, concentration-only branch, or pre-authored pH curve is acceptable.
9. The model validity domain is aqueous liquid phase, 25 °C (`298.15 K`), supported v0 species only, total analytical solute molality in `[1e-9, 0.5] mol/kg`, and converged `I_m <= 0.5 mol/kg`. The pinned `waterActivity: 1` is a unit-water-activity convention and is not multiplied into `Kw = a_H · a_OH`. The proposed accuracy envelope is separate from the model domain and is represented only by `withinProposedAccuracyEnvelope`.
10. `detLog10` and `detExp10` are the only logarithm/exponential path in `packages/sci` and `packages/world`. Native `Math.log10`, `Math.exp`, and `Math.pow` are forbidden there. `Math.sqrt` is permitted. Outside the measured deterministic-function domain, refuse; do not silently fall back to native math.
11. Transfer conservation, World Runtime replay, branch storage, and event schemas are M2 contracts. M4 must consume committed state/request data at the composition boundary and must not modify the reducer or make replay await a solver.
12. `ScientificState` contains molal species, activity coefficients, activities, ionic strength, activity-based model pH, indicator protonation ratios, validity, and solver provenance. It does not contain molarity or taught `−lg c(H⁺)`.
13. `ScientificProjection` may use `ScientificState` plus `waterMass` and `liquidVolume` to produce molarity and taught `−lg c(H⁺)`. It remains in `packages/sci`, imports neither `packages/world` nor `packages/render`, and never changes the scientific state.
14. PHREEQC is an independent test oracle, not a runtime dependency and not a replacement solver. TS/PHREEQC disagreement is reported and investigated; values are never averaged. Python `pyproject.toml` does not gain a fake package dependency for a CLI executable.
15. A missing or unpinned PHREEQC executable/database is a failed oracle prerequisite, not a passing test. Local unit work may run without the executable, but no M4 S3 claim may be made until the CI oracle path is exercised.
16. No visual, ACE, privacy, World Runtime, or persisted-event feature is in scope. M4 may add scientific evidence and test fixtures only.

## Preflight Contract Answers

Before the first production edit, the implementer records these answers in the task notes/evidence rather than assuming them:

| Required answer | M4 decision |
|---|---|
| Problem | Provide a scientifically explicit, replay-compatible v0 acid-base reference engine whose outputs can be independently checked. |
| GOAL scope | It is the Scientific Reality Core required by the accepted titration slice; it supports later Observable, ACE, and UI layers without moving chemistry into them. |
| Owning cores | Scientific Reality Core; `ScientificProjection` is its named output boundary. PHREEQC runner is test infrastructure only. |
| Existing contracts | M3 async `SolverAdapter`, frozen adapter/model/config identity, tagged request/result schema, discriminated solute modes, and the M2 synchronous World Runtime. |
| Scientific assumptions | Monoprotic HOAc, strong HCl/NaOH/NaOAc catalog, aqueous 25 °C, Davies activity coefficients, reduced molality, unit water activity convention, and declared validity/accuracy limits. |
| Persistence | Schema version 2 adds resolved scenario indicator inputs to `ScenarioSnapshot`; the 1 → 2 migration supplies an explicit empty block for legacy records. Existing `WorldCreated.solverConfig` remains the frozen global solver identity. |
| User-visible behavior | No UI change. Later callers receive tagged scientific results, explicit refusal statuses, and model-vs-taught hydrogen quantities through the approved boundary. |
| Privacy/compliance | No network, account, identity, telemetry, learner state, or deployed PHREEQC behavior. Oracle inputs are checked-in fixtures. |
| Required evidence | Independent reference vectors, residual/conservation/invariant reports, domain/refusal matrix, deterministic-math accuracy vectors, projection/type tests, PHREEQC sweep including equivalence, provenance review, and the final evidence packet. |
| Explicitly out of scope | Polyprotic chemistry, mixed/multiple molality materials, temperatures other than 25 °C, runtime PHREEQC, M4 renderer/UI, learning interventions, and solver re-solve/archive workflows. |

---

## Task 0 — Freeze the evidence and toolchain prerequisites

**Objective:** Close the two evidence-pinning questions before scientific results can be called verified: constants and the external oracle artifact.

**Files:**

- `docs/research/constants-provenance.md`
- `tools/oracle/phreeqc/manifest.json`
- `tools/oracle/phreeqc/README.md`
- `tools/oracle/phreeqc/vendor/` (only the approved database and its license/source record)
- `docs/evidence/M4.md`

**Interfaces touched:** None in production. The manifest defines the test-tool boundary consumed by the batch runner and CI.

**Implementation detail:**

1. Pin the exact decimal values and interpretation for `Kw`, frozen HOAc `Ka`, Davies `A`, Davies `b`, standard molality, neutral-acid activity convention, indicator Ka inputs, and the numeric-policy precision/version. Record source, edition/version, source precision, units/basis, temperature, and uncertainty/limitations. Do not add digits merely because JavaScript can represent them.
2. Use the official USGS PHREEQC distribution as the provenance anchor. The current official download page exposes `phreeqc-3.8.6-17100`; use that exact release/database unless a separately approved decision changes it. Record the executable/source URL, database filename, release identifier, and SHA-256 values in the manifest. A GitHub-only newer tag is not silently substituted.
3. State explicitly whether the checked-in database is the PHREEQC `phreeqc.dat` database and which database entries are used. Vendor only the needed database artifact plus its license/source record; do not vendor an untraceable generated output.
4. Mark `M4.md` as evidence pending until the constants and executable/database checksums are actually available in the clean checkout.

**Tests to add/run:**

- Add a Python manifest/provenance test that rejects missing URL, version, checksum, database checksum, or source record.
- Add a constants provenance test that rejects an unrecorded production numeric constant and source precision overrun.
- Run `uv run pytest tools/oracle/tests/test_manifest.py` (red before implementation, green after).

**Expected evidence:** A reviewer can trace every accepted constant and the PHREEQC/database bytes without reading solver code; no S3 claim is made while either pin is absent.

**Stop/go:** Stop if a constant cannot be sourced at the precision used, if the model's water-activity convention cannot be represented without changing the accepted schema/identity contract, or if the PHREEQC artifact cannot be checksum-pinned.

## Task 1 — Add the exact v0 acid-base catalog and fixed model identity

**Objective:** Make component semantics, stoichiometry, constants, validity, and solver identity explicit before any numerical equation is implemented.

**Files:**

- `packages/sci/src/acidbase/catalog.ts` (new)
- `packages/sci/src/acidbase/model.ts` (new)
- `packages/sci/src/acidbase/catalog.test.ts` (new)
- `packages/sci/src/acidbase/model.test.ts` (new)
- `packages/sci/src/index.ts`
- `packages/sci/src/public-api.guarantees.ts` if the public surface changes
- `docs/research/constants-provenance.md`

**Interfaces:**

```ts
export type AcidBaseComponentId = "HCl" | "NaOH" | "HOAc" | "NaOAc";
export type AcidBaseSpeciesSymbol = "H+" | "OH-" | "HA" | "A-" | "Na+" | "Cl-";

export interface AcidBaseConstants {
  readonly Kw: ThermodynamicConstant;
  readonly Ka_HOAc: ThermodynamicConstant;
  readonly daviesA: number;
  readonly daviesB: number;
  readonly standardMolality: MolPerKilogram;
  readonly neutralAcidActivityCoefficient: ActivityCoefficient;
  readonly waterActivity: Activity;
  readonly waterActivityConvention: "unit";
}

export interface AcidBaseComponentTotals {
  readonly strongAcidChlorideMolality: ReducedMolality;
  readonly strongBaseSodiumMolality: ReducedMolality;
  readonly totalAcidFamilyMolality: ReducedMolality;
}

export const ACID_BASE_MODEL_ID = "acidbase-monoprotic-davies" as const;
export const ACID_BASE_MODEL_VERSION = "1.0.0" as const;
export const DEFAULT_ACID_BASE_CONSTANTS: AcidBaseConstants;
export const ACID_BASE_COMPONENT_CATALOG: ReadonlyMap<AcidBaseComponentId, ...>;
export function aggregateComponents(request: SolveRequest): AcidBaseComponentTotals;
export function buildAcidBaseModelDescriptor(): ModelDescriptor;
export function buildAcidBaseSolverConfig(): SolverConfig;
```

**Implementation detail:**

1. Catalog entries own their stoichiometric roles; no equation infers chemistry from a label or from a material ID.
2. `aggregateComponents()` consumes only `amount` and the discriminated `mode`/`ka` already validated by the request boundary. Convert amount divided by `waterMass` to physical molality and immediately reduce it; all downstream catalog totals are reduced molalities.
3. Enforce exact HOAc Ka equality with the fixed model constant. A request with `ka: 1.75e-5` is not accepted merely because it is close to the frozen value.
4. Build a model descriptor whose species list and validity range are the catalog's explicit domain. Build the frozen numeric `SolverConfig` with the exact parameter keys approved by the evidence record. Do not expose an options object that lets callers mutate these values.
5. Include `waterActivity: 1` in the frozen numeric parameter bag and retain `waterActivityConvention: "unit"` in the model contract. The parameter records the explicit v0 convention and replay identity; it is not multiplied into the v0 `Kw = a_H · a_OH` equation. A positive non-unit value is outside v0.

**Tests to add/run:**

- one entry for each supported component and each supported mode;
- wrong ID, wrong mode, HOAc without Ka, HOAc with a different Ka, and conflicting duplicate entries refuse;
- same-mode/same-Ka duplicate entries aggregate exactly;
- catalog totals prove Na, Cl, and acid-family ownership independently;
- model descriptor/config IDs and versions agree, constants equal the provenance record, and factory identity is fixed;
- mutation attempts on catalog/config objects do not change identity.

Run `pnpm exec vitest run packages/sci/src/acidbase/catalog.test.ts packages/sci/src/acidbase/model.test.ts`.

**Expected evidence:** A catalog table and identity/config snapshot that another agent can use without inspecting solver equations; negative tests prove unsupported chemistry is refused.

**Stop/go:** Stop if any supported component's stoichiometry is ambiguous, if a configurable factory can claim the fixed identity with changed constants, or if request totals require molarity.

## Task 2 — Replace the numeric spike boundary with deterministic math

**Objective:** Provide tested, domain-restricted `detLog10` and `detExp10` for every M4 logarithm/exponential operation.

**Files:**

- `packages/sci/src/deterministic-math.ts` (new)
- `packages/sci/src/deterministic-math.test.ts` (new)
- `spikes/numeric-policy/check.ts` (read-only origin unless comments need correction)
- `tools/numeric-policy/` or `tools/oracle/tests/` for arbitrary-precision vector generation (test tooling only)
- the existing guard/lint script that scans native math calls

**Interfaces:**

```ts
export const DET_LOG10_DOMAIN: readonly [number, number];
export const DET_EXP10_DOMAIN: readonly [number, number];
export function detLog10(value: number): number;
export function detExp10(value: number): number;
```

Both functions reject non-finite or invalid arguments with a typed/routable range error. They never return `NaN` or `Infinity` inside the declared accepted domain.

**Implementation detail:**

1. Port the accepted `log10` range reduction and atanh-series coefficients from the spike, preserving the exact operation ordering.
2. Implement `exp10` with two-part Cody–Waite argument reduction: split the reduction constant into high/low parts, compute the reduced residual in a fixed order, evaluate the polynomial with fixed-order double-double arithmetic, and reconstruct the power using only allowed operations and integer exponent handling.
3. Define the actual call domain from the solver's needs and the measured vector suite. Outside it, throw the deterministic-math domain error. Do not widen the domain to make a failing solver case pass.
4. Add a static source check that rejects `Math.log10`, `Math.exp`, and `Math.pow` under `packages/sci/src` and `packages/world/src`. The guard must inspect tests/guarantee files as appropriate and must not whitelist a production call by filename.

**Tests to add/run:**

- arbitrary-precision reference vectors across the entire declared domain (`detExp10` is currently validated only for the Davies band `[-0.137, 0]`; `detLog10` accepts normal positive doubles);
- boundary, subnormal-adjacent, sign, zero, non-finite, and out-of-domain cases;
- ulp measurement with the accepted `<= 1.5 ulp` in-domain bound and explicit refusal outside;
- Cody–Waite reduction boundary cases around integer powers and the solver's minimum/maximum hydrogen values;
- static native-math guard.

Run `pnpm exec vitest run packages/sci/src/deterministic-math.test.ts` and the numeric guard. Keep Python/Decimal or another independent implementation out of the production dependency graph.

**Expected evidence:** Committed input/output vectors, ulp report, declared domains, and a guard failure fixture demonstrating native substitution is caught.

**Stop/go:** Stop if `detExp10` misses the stated bound in the actual solver band or if the solver needs an argument outside the declared band. Narrow/refuse or improve the reduction and document the choice; never call native math as fallback.

## Task 3 — Implement Davies activity and reduced species algebra

**Objective:** Implement the unit-correct activity equations and species bookkeeping used by the nested solve.

**Files:**

- `packages/sci/src/acidbase/activity.ts` (new)
- `packages/sci/src/acidbase/species.ts` (new)
- `packages/sci/src/acidbase/activity.test.ts` (new)
- `packages/sci/src/acidbase/species.test.ts` (new)

**Interfaces:**

```ts
export interface DaviesActivities {
  readonly hydrogen: ActivityCoefficient;
  readonly hydroxide: ActivityCoefficient;
  readonly monovalentAnion: ActivityCoefficient;
  readonly neutralAcid: ActivityCoefficient;
}

export function daviesActivities(
  ionicStrength: ReducedIonicStrength,
  constants: AcidBaseConstants,
): DaviesActivities;

export interface ReducedSpeciesMolalities {
  readonly hydrogen: ReducedMolality;
  readonly hydroxide: ReducedMolality;
  readonly neutralAcid: ReducedMolality;
  readonly conjugateBase: ReducedMolality;
  readonly sodium: ReducedMolality;
  readonly chloride: ReducedMolality;
}

export function ionicStrengthFromSpecies(
  species: ReducedSpeciesMolalities,
): ReducedIonicStrength;
export function chargeResidualFromSpecies(
  species: ReducedSpeciesMolalities,
): number;
```

**Implementation detail:**

1. Use Davies `log10 γ = −A z²(√I/(1+√I) − bI)` with the reduced ionic-strength coordinate and the approved `A=0.509`, `b=0.3` constants. Use `detExp10` only to return γ from the logarithm.
2. Apply the neutral-acid convention explicitly (`γ_HA = 1` in v0). Do not use `Math.log10`, native exponentials, or a molarity conversion.
3. Keep `ReducedMolality`, `MolPerKilogram`, `ActivityCoefficient`, `Activity`, and `ReducedIonicStrength` distinct. Physical values are created only by named schema constructors at the output boundary.
4. Compute ionic strength as `0.5 Σ m_i z_i²` from physical/reduced-equivalent molalities with the documented `m°=1 mol/kg` boundary, and expose charge residual before any quantization or display rounding.

**Tests to add/run:**

- Davies values at `I_m = 0`, `0.001`, `0.01`, `0.1`, and `0.5 mol/kg` against independently calculated vectors;
- `γ > 0`, neutral γ convention, and no invalid deterministic-math argument;
- charge residual and ionic-strength calculations with known species sets;
- compile-level proof that `MolPerLitre` cannot enter these modules;
- negative tests for negative/non-finite ionic strength and species molality.

Run the activity/species Vitest files and the relevant `pnpm verify:guarantees` fixture.

**Expected evidence:** Independent activity table, algebra unit tests, and a static type/import check proving the native coordinate is reduced molality.

**Stop/go:** Stop if any equilibrium equation requires a physical molality divided into a dimensionless constant or if the activity function needs an unvalidated log/exp argument.

## Task 4 — Implement the nested bracketed self-consistent solve

**Objective:** Solve the v0 aqueous acid-base system with deterministic, bracketed convergence in `(m̂_H, Î)` and no post-hoc correction.

**Files:**

- `packages/sci/src/acidbase/solve.ts` (new)
- `packages/sci/src/acidbase/solve.test.ts` (new)
- `docs/research/` only if an equation or failure interpretation needs clarification

**Interfaces:**

```ts
export interface ReducedSolveInput {
  readonly totals: AcidBaseComponentTotals;
  readonly constants: AcidBaseConstants;
}

export interface ReducedSolveSuccess {
  readonly species: ReducedSpeciesMolalities;
  readonly ionicStrength: ReducedIonicStrength;
  readonly chargeResidual: number;
  readonly iterations: { readonly outer: number; readonly inner: number };
}

export type ReducedSolveFailure =
  | { readonly kind: "OUT_OF_DOMAIN"; readonly reason: string }
  | { readonly kind: "NOT_CONVERGED"; readonly residual: number; readonly iterations: number };

export function solveReduced(
  input: ReducedSolveInput,
): ReducedSolveSuccess | ReducedSolveFailure;
```

**Implementation detail:**

1. Define every equation in a code comment with units: `m̂` and `Î` are dimensionless; physical molality is `m̂·m°`; charge residual is mol/kg after the explicit boundary interpretation.
2. For a fixed `m̂_H`, bracket the inner ionic-strength fixed point with a monotone residual and use bisection. Recompute Davies coefficients and all species inside each candidate evaluation; do not damp a fixed point and call the last iterate converged.
3. For a candidate `(m̂_H, Î)`, use thermodynamic `Kw` and frozen HOAc `Ka` in activity form. Strong acid/base totals and acetate/acid-family totals come from Task 1. The HA/A− distribution is a mass-balanced equilibrium calculation, not Henderson–Hasselbalch.
4. Use a bracketed outer charge-balance root over the declared hydrogen domain. Establish and verify the sign change before iterating. The final converged ionic strength is checked again against the model domain.
5. Keep tolerances explicit and separate: root residual tolerance, physical charge residual `< 1e-14 mol/kg` for the reference sweep, iteration caps, and model domain/accuracy envelope. No rounding/quantization is applied to hide a residual.
6. Return `OUT_OF_DOMAIN` only for an explicit model-domain condition (such as a converged ionic-strength overflow or the unit-water-activity convention). Failed inner/outer brackets, iteration limits, and invalid numerical arguments return `NOT_CONVERGED` with diagnostic data. Never emit a partial `ScientificState`.

**Tests to add/run:**

- strong-acid excess, strong-base excess, weak-acid buffer, very dilute `1e-6 mol/kg` HOAc, pre-equivalence, equivalence, and post-equivalence cases;
- inner/outer bracket sign and monotonicity checks, including the domain boundary;
- unquantized charge residual across the full reference sweep;
- exact mass balance for HA/A− and water autoionization;
- adversarial proof that the result is not reproduced by a post-hoc activity correction;
- iteration-limit and bracket-failure tests with no partial state;
- `I_m=0.5` accepted only when the converged value is inside and `I_m>0.5` refuses after convergence;
- no `MolPerLitre` imports or native logarithm/exponential calls.

Run `pnpm exec vitest run packages/sci/src/acidbase/solve.test.ts` before moving to the adapter.

**Expected evidence:** Solver invariant report with residuals, iterations, bracket endpoints, domain decisions, and the self-consistency witness for REF-3/REF-4.

**Stop/go:** Stop immediately if a post-hoc correction matches the reference cases, if the residual is not bracket-monotone over the accepted domain, or if a domain failure is being hidden as a numerical success.

## Task 5 — Add scientific indicator equilibrium and the projection boundary

**Objective:** Produce indicator protonation ratios inside the Scientific Reality Core and keep molarity/taught hydrogen exponent in a named projection.

**Files:**

- `packages/sci/src/acidbase/indicator.ts` (new)
- `packages/sci/src/projection.ts` (new)
- `packages/sci/src/acidbase/indicator.test.ts` (new)
- `packages/sci/src/projection.test.ts` (new)
- `packages/sci/src/index.ts`

**Interfaces:**

```ts
export interface IndicatorInput {
  readonly indicatorId: string;
  readonly kaIn: ThermodynamicConstant;
}

export function protonationRatio(
  indicator: IndicatorInput,
  hydrogenActivity: Activity,
  indicatorAnionActivityCoefficient: ActivityCoefficient,
): number;

export interface ScientificProjection {
  readonly hydrogenIonMolarity: MolPerLitre;
  readonly taughtHydrogenIonExponent: TeachingHydrogenIonExponent;
}

export function projectScientificState(
  state: ScientificState,
  input: { readonly waterMass: Kilogram; readonly liquidVolume: Litre },
): ScientificProjection;
```

**Implementation detail:**

1. Compute indicator ratio from its activity-based equilibrium relation. The observable layer later receives only `{indicatorId, protonationRatio}` and owns color mapping; it does not receive `Ka`, activity, or γ.
2. Build the hydrogen-ion molarity in projection from the hydrogen species amount and `liquidVolume`, using `molarityOf`; do not place it in `ScientificState`.
3. Build taught `−lg c(H⁺)` from the projected molarity through `detLog10` and `taughtHydrogenIonExponent`. Keep it non-assignable to `Ph`.
4. Test the low-pH and high-pH indicator approximation validity rule from the accepted SPEC without adding threshold branches to the equilibrium itself.

**Tests to add/run:**

- ratio monotonicity/continuity across the transition;
- indicator output contains no Ka or activity internals;
- projection computes `c(H⁺)` from amount/volume and distinct model pH/taught exponent values;
- compile fixture proving `Ph` and `TeachingHydrogenIonExponent` cannot be exchanged;
- REF-5/REF-6 projection cases and zero-volume refusal.

**Expected evidence:** Scientific-state vs projection ownership matrix and reference output showing the two hydrogen quantities differ as required.

**Stop/go:** Stop if the renderer-facing type needs chemistry inputs, if taught exponent is derived from molality without volume, or if projection mutates or recomputes the scientific equilibrium.

## Task 5.5 — Freeze scenario-specific scientific inputs before adapter integration

**Objective:** Make indicator constants replayable without making them part of
the global solver identity.

**Files:**

- `packages/schema/src/content.ts`
- `packages/schema/src/world.ts`
- `packages/schema/src/migrate.ts`
- `packages/world/src/state.ts`
- `packages/sci/src/request.ts` and `packages/sci/src/request.test.ts`
- `docs/adr/0011-scenario-scientific-input-freezing.md`
- `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`
- committed `packages/schema/json-schema/` artifacts and Python contract fixtures

**Implementation detail:**

1. Authoring scenarios declare indicator definitions with a dimension-checked
   positive `kaIn`.
2. Genesis snapshots carry canonical positive `kaIn` plus datum-level
   `DataProvenance` for every indicator; `WorldCreated` content hashing covers
   the block.
3. Request builders copy indicator values from the frozen snapshot only. They
   do not reload a mutable indicator catalog during replay.
4. Bump the world/content schema to version 2 and add a tested forward `1 → 2`
   migration that inserts only `indicators: []` when the legacy record has no
   block. Regenerate and consume the committed JSON Schema artifacts.
5. Add `waterActivity: 1` to the fixed numeric solver identity. The v0
   equation remains `Kw = a_H · a_OH`; a positive non-unit test value is
   outside the v0 unit-water-activity convention.

**Tests to add/run:**

- missing provenance, non-canonical/non-positive indicator constants, and
  unknown indicator keys refuse; runtime snapshot parsing rejects duplicate
  indicator ids;
- snapshot parse/serialize preserves the frozen indicator block and changing it
  changes the genesis content hash;
- v1 migration adds an explicit empty block without inventing a constant;
- World Runtime migration rebuilds the derived genesis content checksum after
  the snapshot bytes change;
- the default acid-base equation satisfies `a_H · a_OH = Kw`, while a test-only
  non-unit water activity is refused and the production config remains pinned
  at 1.

**Expected evidence:** The genesis event is sufficient to rebuild the
scenario-specific indicator input, while `SolverConfig` remains a reusable
global model identity. The request bridge does not consult mutable content, and
the migration/checksum rebuild plus committed artifact are reproducible from a
clean checkout.

**Stop/go:** Stop if an indicator request can still be populated from mutable
content, if a resolved snapshot accepts a non-canonical or non-positive `kaIn`,
or if the schema artifact and TypeScript contract disagree.

## Task 6 — Build the real adapter and map all result statuses

**Objective:** Connect catalog, solver, indicator, projection-independent ScientificState construction, M3 identity assertions, and the existing async adapter contract.

**Files:**

- `packages/sci/src/acidbase/index.ts` (new)
- `packages/sci/src/acidbase/adapter.test.ts` (new)
- `packages/sci/src/index.ts`
- `packages/sci/src/public-api.guarantees.ts`
- existing M3 identity/registry tests only where a real adapter fixture is needed

**Interfaces:**

```ts
export function createAcidBaseAdapter(): SolverAdapter;
```

The returned adapter is frozen and exposes the fixed model/config identity from Task 1. `solve()` remains `Promise<SolveResult>`.

**Implementation detail:**

1. Validate `unknown` defensively through the existing request guard before touching nested fields. Malformed casts yield `INVALID_INPUT`, never an exception escape.
2. Apply exact component/domain checks before solving. Unsupported species, temperature, solvent, phase, incompatible HOAc Ka, converged ionic-strength overflow, deterministic-math refusal, and numerical failure must each retain their prescribed tagged result/reason.
3. Convert request inputs once at the boundary: amounts/water mass to reduced analytical totals; temperature and other quantities are already canonical domain values. Do not read a liquid-volume value as a concentration or use it in equilibrium equations.
4. Construct each `SpeciesState` with reduced molality, physical molality, amount, γ, and activity using the schema constructors. Construct activity-based `modelPh` with `ph`; set `withinProposedAccuracyEnvelope` from the converged domain/accuracy rule; place the exact M3 provenance identity inside the state.
5. Call `assertSolveResultIdentity()` before returning `OK`. The adapter must never return a successful state whose provenance disagrees with its model/config.
6. Keep the stub adapter and M3 tests intact. The real adapter is an additional implementation, not a replacement for generic contract coverage.

**Tests to add/run:**

- OK result for each reference category;
- INVALID_INPUT for malformed/non-finite/contradictory cast data;
- MODEL_OUT_OF_DOMAIN with required `nearestSupported` for unsupported ID, temperature, solvent/phase, mode, and ionic strength;
- NOT_CONVERGED fixture with no partial state;
- exact provenance identity, schema round-trip, and frozen adapter/config mutation tests;
- no scalar convenience `solvePh`/bare number export;
- `createAcidBaseAdapter()` cannot accept a constants override.

Run the complete `packages/sci` Vitest suite, `pnpm typecheck`, `pnpm build`, and `pnpm verify:guarantees` after this task.

**Expected evidence:** Adapter contract matrix with all four result statuses, serialized `ScientificState` validation, exact identity assertion, and no World Runtime import.

**Stop/go:** Stop if the adapter has to change the World reducer, if a solver Promise is dropped/awaited inside replay, if a malformed request throws, or if a successful result lacks exact producer provenance.

## Task 7 — Hand-author REF-1 through REF-10 independent reference fixtures

**Objective:** Establish reproducible scientific anchors that were not generated by the implementation under test.

**Files:**

- `packages/sci/test/reference/REF-1.json` through `REF-10.json` (new)
- `packages/sci/src/acidbase/reference.test.ts` (new)
- `packages/sci/src/reference-fixtures.ts` (test-only or carefully scoped fixture loader)
- `docs/research/constants-provenance.md`

**Fixture rules:**

1. Each JSON fixture contains the input, basis, constants/source record ID, expected values, tolerance, and the derivation/source note. Expected values are entered from the pinned independent derivation/literature/oracle record, never emitted by the TS solver and copied back into JSON.
2. Cover the accepted matrix: strong-acid excess, strong-base excess, weak-acid buffer, dilute weak acid, pre-equivalence, equivalence, post-equivalence, model-vs-taught hydrogen quantities, and indicator/projection behavior.
3. REF-5 and REF-10 are projection cases where applicable; do not add molarity to the ScientificState just to make a fixture easier to assert.

**Tests to add/run:**

- schema/shape validation of every fixture;
- Vitest solver comparison with each fixture's stated tolerance;
- explicit conservation and charge residual assertions independent of expected pH;
- test that deleting or changing a reference expected value causes a failure rather than silently regenerating it.

**Expected evidence:** Fixture manifest and derivation notes with no circular “reference generated from solver” path.

**Stop/go:** Stop if any fixture has no independent source/derivation, if expected digits exceed source precision, or if a reference cannot be reproduced within the stated tolerance without changing the accepted model.

## Task 8 — Implement the PHREEQC batch runner and pinned CI installation

**Objective:** Make independent molality-based PHREEQC validation reproducible on CI and diagnosable locally.

**Files:**

- `tools/oracle/phreeqc/run_batch.py`
- `tools/oracle/phreeqc/parse_output.py` (if parsing is split)
- `tools/oracle/phreeqc/cases/*.pqi.in`
- `tools/oracle/phreeqc/manifest.json`
- `tools/oracle/phreeqc/install_ci.sh` or a platform-neutral checked-in installer script
- `tools/oracle/tests/test_reference.py`
- `tools/oracle/tests/test_cross_check.py`
- `.github/workflows/ci.yml`
- `pyproject.toml` only for test dependencies if a real Python library is necessary; do not list PHREEQC as a Python package dependency

**Interfaces:**

```py
def run_case(case: Path, executable: Path, database: Path) -> PhreeqcResult: ...
def require_phreeqc() -> PhreeqcToolchain: ...
```

**Implementation detail:**

1. `run_batch.py` resolves `PHREEQC_BIN` and `PHREEQC_DATABASE` first, then the pinned CI installation path. Missing executable/database, checksum mismatch, nonzero exit, parse error, or PHREEQC warning that invalidates a case is a test failure with the exact command and stderr.
2. Generate inputs with amounts specified in molality and water mass explicitly. Align temperature, Davies activity model, species definitions, and constants with the TS model. Do not pass molarity while claiming molality equivalence.
3. Use isolated temporary directories and fixed output selection. Parse only named output fields; do not scrape a human summary or accept an empty result.
4. CI downloads/builds the exact manifest artifact, verifies SHA-256 before execution, installs the database at the recorded path, exports the tool variables, and runs the oracle tests. A skipped oracle test is forbidden in CI.
5. Local environments without PHREEQC may run pure TS tests and report the missing prerequisite, but `CHEMREALM_REQUIRE_PHREEQC=1` must turn that situation into a hard failure.

**Tests to add/run:**

- manifest checksum and executable version check;
- one simple known PHREEQC case and one invalid/missing-tool case;
- reference-case output parser tests using checked-in sample output;
- database mismatch and nonzero-process negative tests;
- CI shell/installer smoke test in an Ubuntu-like environment.

**Expected evidence:** Exact PHREEQC release/database/checksums, command line, input/output fixtures, and a CI log showing the executable actually ran.

**Stop/go:** Stop if the CLI output cannot be unambiguously parsed, if constants cannot be aligned, or if CI has to mark oracle tests optional. Record the limitation instead of claiming AC-S6.

## Task 9 — Add the TS/PHREEQC cross-check, including equivalence

**Objective:** Compare independently executed model outputs over the full titration sweep and make disagreement visible.

**Files:**

- `tools/oracle/phreeqc/cases/reference-sweep.pqi.in`
- `tools/oracle/phreeqc/run_ts_cases.mjs`
- `tools/oracle/tests/test_cross_check.py`
- `docs/evidence/M4.md`
- `docs/research/` for any investigated disagreement; never edit expected values to hide it

**Implementation detail:**

1. Define a single checked-in sweep containing pre-equivalence, near-equivalence, equivalence, and post-equivalence points, including the weak-acid/strong-base case and the v0 maximum ionic-strength boundary.
2. Run TS through the built adapter in a separate Node process and PHREEQC through the batch runner. Serialize both as molality-basis records with model/database identity attached.
3. Compare the approved observable quantity (pH under the explicitly aligned convention) with `±0.02` tolerance, while also comparing charge balance, species totals, and refusal/domain metadata where applicable.
4. Produce a machine-readable report containing every point, absolute difference, maximum difference, and pass/fail status. Never average the two engines or replace a failed point with a neighboring point.
5. Verify the TS result remains self-consistent and the difference is not caused by using the taught concentration exponent as model pH.

**Tests to add/run:**

- cross-engine sweep test;
- explicit equivalence-region point test;
- output identity/version mismatch negative test;
- disagreement fixture that fails when a result exceeds tolerance;
- report completeness test ensuring no sweep point disappears.

**Expected evidence:** Cross-check report with source identities, constants, database checksum, all sweep points, and the maximum absolute pH difference.

**Stop/go:** Stop on any equivalence-region disagreement over `0.02 pH`, unexplained species/charge imbalance, missing point, or any attempt to average/hide disagreement. M4 remains below S3 until investigated.

## Task 10 — Complete the acceptance matrix and static architectural guards

**Objective:** Turn the design's claims into machine-checkable evidence and catch the exact regressions that prior reviews found.

**Files:**

- `packages/sci/src/acidbase/*.test.ts`
- `packages/sci/src/reference-fixtures.ts` or test helpers
- existing guard scripts under `tools/`
- `.github/workflows/ci.yml`
- `docs/evidence/M4.md`
- `docs/plans/PLAN-0001-world-foundation-acid-base-titration.md`

**Acceptance mapping:**

| Criterion | Required evidence |
|---|---|
| AC-S1 | REF-1..REF-10 Vitest plus fixture/Python validation |
| AC-S2 | Unquantized charge residual report `< 1e-14 mol/kg` |
| AC-S3 | 100-transfer element/component conservation integration fixture |
| AC-S4 | Temperature, ionic-strength, species, solvent, phase matrix plus converged-I recheck |
| AC-S5 | `1e-6 mol/kg` exact weak-acid result and measured HH divergence |
| AC-S6 | Pinned PHREEQC cross-check including equivalence |
| AC-S7 | Constants provenance table and source-precision test |
| AC-S8 | Type/import guard excluding `MolPerLitre` from internals |
| AC-S9 | Distinct model pH/taught exponent types and reference values |
| AC-S10 | Deterministic math ulp/refusal vectors and native-call guard |
| AC-S11 | Outer residual monotonicity sweep |
| AC-S12 | Copy/inspection search with no “true/thermodynamic pH” mislabel |
| AC-S13 | `withinProposedAccuracyEnvelope: false` at `I_m=0.15` and `0.30` |
| AC-S14 | v0 maximum `I_m=0.1002 mol/kg` envelope check |
| AC-S15 | Missing density negative content test remains green |
| AC-S16 | Source precision/provenance review |

**Implementation detail:**

1. Add a static check for imports from `@chemrealm/world`/`@chemrealm/render` in `packages/sci` and for `MolPerLitre` in acid-base internals.
2. Add a static check that forbids a production pH lookup table or pre-authored curve. Reference fixtures may contain expected values only under the test reference directory.
3. Add a test that `withinProposedAccuracyEnvelope` is the only accuracy-envelope field used; do not introduce `accuracyStatus`.
4. Extend CI only after each new command works locally. Keep PHREEQC hard-required in the oracle job/path; do not use `continue-on-error`.
5. Generate the M4 evidence packet from actual commands, commit, and CI run. It must state what is verified, what is not, the exact baseline, and any non-blocking limitations.

**Tests to add/run:**

- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `pnpm verify:guarantees`
- `pnpm verify:schema-artifacts`
- `pnpm depcruise`
- `pnpm guards`
- `pnpm verify:world`
- `pnpm lint`
- `uv run pytest`
- `uv run python tools/check_acceptance_coverage.py`

**Expected evidence:** A completed M4 acceptance matrix with a concrete path/command for every row; any failed critical row keeps M4 at S2/HOLD.

**Stop/go:** Stop if any test was weakened, if a criterion's required method was replaced by code inspection, or if a critical row lacks reproducible evidence.

## Task 11 — Final review, stage transition, and direct integration

**Objective:** Verify the clean result and hand off M4 without overstating its gate.

**Files:**

- `docs/evidence/M4.md`
- `docs/plans/PLAN-0001-world-foundation-acid-base-titration.md`
- `README.md` or stage-status documentation only if the repository convention requires it
- no runtime files unless verification found a real defect

**Implementation detail:**

1. Inspect `git diff --check`, the complete diff, generated artifacts, untracked files, and dependency graph.
2. Run the full CI-equivalent command set on a clean working tree, including the actual pinned PHREEQC path. Capture the final commit SHA and CI run only after that commit's workflow completes.
3. Update the evidence packet to `M4 S3 VERIFIED / ACCEPTED` only if every P0/P1 and every critical acceptance row is closed. Otherwise leave the honest `S2 / Final Verification HOLD` state and record exact blockers.
4. Update PLAN status and authorized-next-stage text only after the owner verdict. Do not authorize M5 from an agent-only green run.
5. Commit the completed round with a focused message and push `main`; do not create a PR or force-push.

**Expected evidence:** Final acceptance matrix, reproducible commands, pinned reference/oracle artifacts, CI URL/run identifier, clean status, and explicit next-stage gate.

**Stop/go:** A missing oracle, unexplained disagreement, failed reference, schema mismatch, or undocumented constant is a blocker. The correct handoff says so and leaves the evidence needed to resume.

## Handoff Format

The final M4 handoff must include:

- current HEAD and CI run;
- M4 gate (`S0`, `S1`, `S2`, `S3`, or `S4`);
- accepted model identity/config and validity envelope;
- reference fixture and PHREEQC/database versions/checksums;
- exact verification commands;
- residual, conservation, deterministic-math, and cross-engine maxima;
- known limitations and any P0/P1/P2 findings;
- next authorized stage, or the decision that M4 remains blocked.

No handoff may say only “solver works” or “tests pass.”
