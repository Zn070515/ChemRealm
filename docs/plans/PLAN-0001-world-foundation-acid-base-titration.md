# PLAN-0001 — World Foundation & Acid-Base Titration

- **Status:** Ready to execute (pending `SPEC-0001` acceptance)
- **Date:** 2026-09-11
- **Implements:** `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`
- **Related ADRs:** 0001–0007, all `Proposed`
- **Audience:** an agent that did not participate in the design. Nothing below
  assumes prior context beyond the repository documents.

## How to read this plan

Each milestone is independently acceptable. A milestone is **not** "done"
because its code is written. Per `AGENTS.md` §7:

| Stage | Meaning | What it unlocks |
|---|---|---|
| **S2 — Implemented** | Code and content written; local targeted tests pass; no hidden stubs | The next milestone may begin |
| **S3 — Verified** | Acceptance criteria evaluated; evidence packet assembled; regressions checked | The milestone may be claimed complete |

**A milestone's stage label below is the target, not a promise.** M0–M10 target
S3. There is no point in this plan where S2 is allowed to be reported as done.

## Prerequisite

`SPEC-0001` and ADRs 0001–0007 must be `Accepted` before M0 begins. Building
against a `Proposed` ADR is exactly the "assume the decision is made" failure the
ADR status vocabulary exists to prevent.

## Milestone map

| M | Title | Depends on | Primary risk |
|---|---|---|---|
| M0 | Repository foundation | — | Two toolchains in one CI |
| M1 | Schema and units | M0 | Getting the contract wrong early |
| M2 | Event runtime and replay | M1 | Determinism |
| M3 | Solver adapter contract | M1 | Over- or under-designing the envelope |
| M4 | Acid-base engine and oracle validation | M3 | PHREEQC install; the equivalence-region gap |
| M5 | Observable state | M1, M4 | Observable layer catching chemistry it shouldn't |
| M6 | First final-quality apparatus slice | M5 | Hitting the visual bar with PixiJS |
| M7 | Interactive titration end to end | M6 | Integration; the first real product moment |
| M8 | Branch, replay, persistence | M2, M7 | Parent immutability; IndexedDB quota |
| M9 | Minimal ACE | M7 | Inferring too much from too little |
| M10 | Integrated verification | all | Assembling honest evidence |

Ordering follows `CLAUDE.md` §6: contracts → validation fixtures → core →
adapter → observable → renderer → ACE → persistence → end-to-end → docs.

---

## M0 — Repository foundation

**Target stage:** S3
**Addresses:** ADR-0001; `SPEC-0001` AC-P1, AC-V1

### Purpose

Establish a workspace where the four cores can exist without importing each
other, where the two-language contract from ADR-0001 actually works, and where
the architectural rules are enforced by the build rather than by review.

The most important thing M0 proves is **not** that packages exist. It is that
**two toolchains coexist in one CI run and a forbidden import fails the build.**
Both are load-bearing assumptions of ADR-0001 and ADR-0006.

### Files and modules

```
package.json                     root, private, scripts only
pnpm-workspace.yaml              packages/*, apps/*
tsconfig.base.json               strict, project references
vitest.workspace.ts
eslint.config.js
.dependency-cruiser.js           the import-direction rules
.github/workflows/ci.yml
packages/schema/                 package.json, tsconfig, src/index.ts (placeholder export)
apps/web/                        Vite + React + TS, renders "ChemRealm"
tools/oracle/                    pyproject.toml, uv.lock, tests/test_smoke.py
docs/adr/, docs/specs/, docs/plans/    already present
```

### Contracts changed

None. M0 adds the mechanism by which contracts will be enforced.

### Implementation

1. `pnpm init`-equivalent root manifest; `pnpm-workspace.yaml` globbing
   `packages/*` and `apps/*`. TypeScript strict everywhere.
2. `tsconfig.base.json` with `composite: true` and project references so package
   boundaries are real to the compiler, not just to the linter.
3. `.dependency-cruiser.js` encoding ADR-0001 rule 2 and ADR-0006:
   - `forbidden: render → sci`
   - `forbidden: render → world`
   - `forbidden: ace → sci`
   - `forbidden: ace → render` (ACE emits `InterventionIntent` data; `apps/web` acts on it)
   - `forbidden: sci → world`
   - allowed direction: `world/sci/render/ace → schema`
4. `apps/web` as a minimal Vite + React + TS app rendering a placeholder. React
   Router is deferred to M7.
4a. **Self-host every runtime resource.** Vite must not emit a third-party
   origin reference. Self-host fonts rather than loading a font service. This is
   required by `SPEC-0001` §Privacy (AC-P5): a third-party font or CDN leaks the
   user's IP and referrer on every page load, is unreachable from mainland
   China, and is unreviewed code. Add a build-output check that fails on any
   external origin in the emitted HTML.
5. `tools/oracle` as a `uv` project with a single smoke test, so the second
   toolchain is exercised in CI from day one. **No PHREEQC yet** — that is M4.
6. CI: `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm test`,
   `pnpm depcruise`, then `uv sync` and `uv run pytest`.
7. `README.md` with exact setup commands for both toolchains.

### Tests and evidence

| Test | Proves |
|---|---|
| `pnpm build` succeeds | Workspace is coherent |
| `pnpm test` passes | Vitest is wired across the workspace |
| `pnpm depcruise` passes on the clean tree | Rules are active |
| `pnpm depcruise` **fails** on a deliberately added `render → sci` import (fixture, then reverted) | The rule actually bites — this is the point of M0 |
| `uv run pytest` passes | The second toolchain runs |
| CI green on a clean checkout | Both toolchains coexist (ADR-0001's central claim) |

### Stop condition

CI is green on a clean checkout, and a deliberately-introduced forbidden import
has been observed to fail the build. If the dependency rule can be bypassed, M0
is not complete regardless of everything else passing.

### Rollback

Delete the M0 files. Nothing is persisted and nothing depends on them.

---

## M1 — Schema and units

**Target stage:** S3
**Addresses:** ADR-0001, ADR-0004; `SPEC-0001` AC-C1, AC-C2, AC-R8, AC-P3

### Purpose

Define every persisted and runtime contract exactly once, and make unit
confusion a compile error rather than a numerical defect.

### Files and modules

```
packages/schema/src/units.ts          branded types, constructors, the ONE conversion module
packages/schema/src/quantity.ts       {value, unit} tuple parse/serialize
packages/schema/src/world.ts          WorldState, Vessel, Apparatus, Attachment
packages/schema/src/events.ts         the six v0 events + event envelope
packages/schema/src/commands.ts       the Command union
packages/schema/src/scientific.ts     ScientificState, Provenance, ModelDescriptor
packages/schema/src/content.ts        scenario definition schema
packages/schema/src/export.ts         chemrealm.export v1
packages/schema/src/json-schema.ts    emits JSON Schema into dist/json-schema/
```

### Contracts changed

All of them. This is the milestone that creates the public surface.

### Implementation

1. Branded quantity types per ADR-0004: `Mol`, `Litre`, `MolPerLitre`, `Kelvin`,
   `Kilopascal`, `Gram`, `Second`, `IonicStrength`, plus `Ph` as a
   **non-arithmetic** type with no operators defined.
2. Constructors that reject `NaN`, infinities, and negative values for
   non-negative quantities. `litre(-1)` throws.
3. **One** conversion module. No `* 1000` anywhere else in the repository.
   Round-trip conversions for every supported unit.
4. zod schemas for every contract above, with `schemaVersion` fields.
5. `parseQuantity` **rejects a missing unit** and **rejects an unknown unit**.
   Neither falls back to a default (`SPEC-0001` AC-C2).
6. JSON Schema emission into `packages/schema/dist/json-schema/` for the Python
   oracle. Add a CI check that the emitted artifact is current.
7. A no-op `1 → 1` migration registered in a migration registry, so the harness
   exists before it is needed (`SPEC-0001` §Rollout/migration).

### Tests and evidence

| Test | Proves |
|---|---|
| Unit round-trip property test for every unit | Conversion module is correct |
| `litre(-1)`, `molPerLitre(NaN)` throw | Constructors validate |
| `parseQuantity` rejects `{}` and `{"value":1,"unit":"furlong"}` | AC-C2 |
| Quantity arithmetic is unavailable for `Ph` (compile-failure fixture) | pH cannot be misused |
| Golden JSON Schema snapshot | Contract drift is visible in review |
| Migration registry runs `1 → 1` on a fixture world | Harness works |

### Stop condition

Every `SPEC-0001` contract has a schema; every schema has a test; the JSON Schema
artifact is emitted and consumed by at least one Python test that validates a
fixture against it. That last item is what proves ADR-0001's "one source of
truth" claim rather than asserting it.

---

## M2 — Event runtime and replay

**Target stage:** S3
**Addresses:** ADR-0002, ADR-0007; `SPEC-0001` AC-R1..AC-R5, AC-R7

### Purpose

Make the event log real, and make determinism a measured property rather than a
hope. This is the milestone where `GOAL.md` §5.4 either becomes true or does not.

### Files and modules

```
packages/world/src/state.ts          WorldState construction, freeze helpers
packages/world/src/reduce.ts         pure reducer + registry
packages/world/src/command.ts        validate → emit or reject
packages/world/src/log.ts            append-only log, sequence enforcement
packages/world/src/replay.ts         fold from genesis; snapshot-aware
packages/world/src/snapshot.ts       snapshot policy (every 50, always at forks)
packages/world/src/hash.ts           canonicalJson + quantize + SHA-256
packages/world/src/branch.ts         fork, lineage, parent-immutability guards
```

### Contracts changed

`reduce`, `validate`, `replay`, `stateHash`, `fork`, `snapshot` signatures
finalized. `packages/world` still has **no** scientific dependency: the reducer
takes a solver function by injection, so M2 can be tested with a stub solver and
M4 can supply the real one without touching this package.

### Implementation

1. `quantize(v) = Number(v.toPrecision(12))` in `hash.ts`, applied at the
   world boundary (ADR-0007 §4). One implementation, one call site per quantity.
2. `canonicalJson`: sorted keys, fixed number formatting. Test against two
   structurally identical states built in different orders.
3. Reducer enforces `event.seq === state.sequence + 1`; strict sequential replay.
4. `stateHash` excludes wall-clock, cursor position, and all presentation fields
   (ADR-0007 §6).
5. `branch.ts` freezes the fork-point state and returns a child whose reduction
   path allocates. Add a **runtime** assertion in dev builds that the parent
   object graph is unchanged after a child mutation — a test that only compares
   hashes at the end can miss a transient mutation.
6. Snapshot policy with the invariant that snapshots are a cache: replay must
   produce identical results with snapshots deleted.
7. Move the `TransferCommitted` handling behind an injected solver interface so
   M2 is testable before M4 exists.

### Tests and evidence

| Test | Proves |
|---|---|
| Replay of a 500-event log: hash identical at every boundary, run twice | AC-R1, AC-R2 |
| Same log replayed through a **perturbed arithmetic path** (e.g. an extra `+0.0` and a different but mathematically equivalent grouping) yields the same quantized hash | AC-R3 — this is the actual cross-engine proxy |
| Fork, mutate child heavily, assert parent hash unchanged | AC-R4 |
| Replay with all snapshots deleted | AC-R5 |
| 500-event replay under 2 s | AC-R7 |
| Reducer rejects out-of-sequence events | Sequence enforcement |
| `canonicalJson` order-independence | Hash is structural, not incidental |

### Stop condition

Determinism is *demonstrated*, not argued. If AC-R3 cannot be made to pass,
**stop and revisit ADR-0007 before M4.** Discovering a quantization flaw after
the scientific engine is built means rebuilding both.

---

## M3 — Solver adapter contract

**Target stage:** S3
**Addresses:** ADR-0003; `SPEC-0001` AC-S4

### Purpose

Fix the interface through which every scientific number enters the world, with
provenance and validity as first-class return values.

### Files and modules

```
packages/sci/src/adapter.ts          SolverAdapter interface
packages/sci/src/result.ts           SolveResult union, Provenance, ModelDescriptor
packages/sci/src/request.ts          SolveRequest
packages/sci/src/stub.ts             a deliberately-trivial adapter for contract tests
packages/sci/src/registry.ts         adapter registry, id+version lookup
```

### Contracts changed

`SolverAdapter`, `SolveRequest`, `SolveResult`, `Provenance`, `ModelDescriptor`.

### Implementation

1. The result union from ADR-0003, with **no** convenience scalar accessor. If a
   call site wants a number, it reads it from the returned state, visibly.
2. Async from the start, per ADR-0003 open question 2: a future PHREEQC adapter
   may be out-of-process, and retrofitting async later is a breaking change
   across every call site.
3. `Provenance` carries `{ modelId, solverId, solverVersion, parameters, activityModel, uncertainty, validityRange, category }`
   where `category ∈ { measured, evaluated, calculated, empirical, pedagogicalApproximation }`
   (`GOAL.md` §12). The indicator colour model will use `empirical`.
4. `registry.ts` resolves by id **and** version, and refuses to return a
   different version. This is what makes AC-R6 enforceable.
5. Domain declaration: each adapter publishes its `validityRange` (T, ionic
   strength, species set, solvent, phase). `MODEL_OUT_OF_DOMAIN` is checked
   **before** solving, not inferred from a converged result.

### Tests and evidence

| Test | Proves |
|---|---|
| Stub adapter returns each of the four statuses | Union is complete and exercisable |
| Registry refuses a version mismatch | AC-R6 foundation |
| A request outside the declared domain returns `MODEL_OUT_OF_DOMAIN` with no state | AC-S4 |
| Type test: `SolveResult` has no `ph: number` field | The convenience shortcut cannot be added quietly |
| `Provenance.category` is required, not optional | `GOAL.md` §12 is enforceable |

### Stop condition

The interface can express every v0 scientific outcome **and** every refusal,
without a caller ever holding a bare number lacking provenance.

---

## M4 — Acid-base reference engine and oracle validation

**Target stage:** S3
**Addresses:** ADR-0003, ADR-0007; `SPEC-0001` AC-S1..AC-S7

The scientific heart of the slice. Also the milestone that closes the
equivalence-region gap the spike could not.

### Purpose

Implement the exact solver in TypeScript, and validate it against three
independent routes — the same three the spike used, plus PHREEQC.

### Files and modules

```
packages/sci/src/acidbase/model.ts        formulation, constants, domain declaration
packages/sci/src/acidbase/solve.ts        bisection root-find (exactly-specified ops only)
packages/sci/src/acidbase/activity.ts     Davies; sqrt permitted, log is NOT
packages/sci/src/acidbase/species.ts      species inventory and mass balance
packages/sci/src/acidbase/indicator.ts    ratio-based indicator model (empirical category)
packages/sci/src/acidbase/index.ts        the adapter implementation
packages/sci/test/reference/*.json        REF-1..REF-8 as data, not as literals in test code
tools/oracle/pyproject.toml               add PHREEQC invocation
tools/oracle/phreeqc/run_batch.py         generate .pqi, run PHREEQC CLI, parse output
tools/oracle/phreeqc/cases/*.pqi.in
tools/oracle/tests/test_reference.py      oracle vs published standards
tools/oracle/tests/test_cross_check.py    oracle vs TS solver over a swept curve
docs/research/constants-provenance.md     pin every constant to a citable source
```

### Contracts changed

`acidbase-exact@1.0.0` registered. Constants table finalized — this enters replay
identity.

### Implementation

1. Port the spike's formulation. **Constraint (ADR-0007 §1): the root-find uses
   only `+ - * /` and comparisons.** No `Math.pow`, no `Math.log`, no `sqrt`.
   `sqrt` appears only in Davies, in the activity correction.
2. `Ka` stored as a value; never derive `10^-pKa`. Add a lint ban on `Math.pow`
   and `Math.log` inside `packages/sci` (the log calls belong to presentation).
3. Constants pinned with sources into `docs/research/constants-provenance.md`,
   resolving `SPEC-0001` AC-S7 and open question 1. **Owner sign-off required**
   before M4 closes, since these enter replay identity.
4. Reference cases loaded from `packages/sci/test/reference/*.json`. **These files
   are hand-authored from the published sources and are never written by the code
   under test** — the spike's own harness produced two wrong reference values on
   the first run (finding F7), and only the independent derivation caught them.
5. PHREEQC oracle: drive the **PHREEQC CLI in batch mode**, generating `.pqi`
   input and parsing the selected output. Do not use `phreeqpython` — its license
   is unverified (`docs/research/scientific-solver-landscape.md`). Vendor the
   database locally rather than fetching at runtime.
6. Cross-check the TS solver against PHREEQC over a **swept titration curve**
   including the equivalence region. **Report disagreement; never average it.**

### Tests and evidence

| Test | Proves |
|---|---|
| REF-1..REF-8 within stated tolerances | AC-S1 |
| Charge residual < 1e-15 mol/L over the sweep | AC-S2 |
| Element totals (Na, Cl, acid group) conserved over 100 transfers | AC-S3 |
| Domain matrix: T≠25 °C, I=0.6, polyprotic, non-aqueous → `MODEL_OUT_OF_DOMAIN` | AC-S4 |
| 1e-6 M acetic acid: exact solve matched; HH divergence (0.65 pH) reproduced and asserted | AC-S5 |
| PHREEQC vs TS within ±0.02 pH **including the equivalence region** | AC-S6 |
| Every constant has a citable source in `constants-provenance.md` | AC-S7 |
| Indicator ratio is continuous across the transition; no threshold branch | AC-V2 precursor |
| Above pH 12, the monoprotic indicator approximation reports reduced validity | `SPEC-0001` failure mode 10 |

### The PHREEQC fallback

If PHREEQC cannot be installed and driven in CI:

1. **Do not silently drop the oracle.** Record the failure in
   `docs/research/` with the exact error.
2. Degrade to literature anchors plus the independent closed form, and
   **annotate the tolerance table in `SPEC-0001` to say the equivalence region is
   unvalidated by an independent solver.**
3. The equivalence-region gap stays open and is reported in the M10 evidence
   packet as a known limitation. It does not become "covered" by a weaker check.

### Stop condition

AC-S1 through AC-S7 evaluated. **If PHREEQC disagrees with the TypeScript solver
by more than ±0.02 pH in the equivalence region, stop and investigate before
proceeding.** A disagreement is a finding, not an inconvenience. Proceeding with
an unexplained discrepancy means every downstream milestone is built on an
unknown.

---

## M5 — Observable state

**Target stage:** S3
**Addresses:** ADR-0006, ADR-0007; `SPEC-0001` AC-V1..AC-V4, AC-V6

### Purpose

Build the science-to-pixels pipeline as pure, browser-free TypeScript, so it can
be tested at all.

### Files and modules

```
packages/render/src/observable/index.ts       ScientificState → ObservableModel
packages/render/src/observable/level.ts       volume + volume profile → liquid level
packages/render/src/observable/color.ts       indicator ratio → colour (empirical)
packages/render/src/observable/burette.ts     derived reading
packages/render/src/observable/curve.ts       state sequence → pH–volume points
packages/render/src/observable/species.ts     composition projection (micro view)
packages/render/src/observable/symbolic.ts    equilibrium expressions with substitutions
packages/render/src/observable/format.ts      display precision rules
packages/render/src/state/scene.ts            ObservableModel → RenderState
```

**No PixiJS import anywhere in this milestone.** Everything here runs in Node.

### Contracts changed

`ObservableModel`, `RenderState`, `ObservableModelVersion`.

### Implementation

1. `level.ts` consumes a vessel's published interior volume profile
   (`docs/visual/apparatus-standard.md` §1). Fixture vessels provide profiles.
2. `color.ts` consumes `Ka_in / [H⁺]` — **one division, no logarithm**
   (ADR-0007 §2). Colour mixing between declared acid-form and base-form
   endpoints. No threshold branch.
3. `burette.ts` derives `reading = initialVolume − Σ delivered`. Add the
   invariant test that it always equals that expression (failure mode 14).
4. `curve.ts` takes the **state sequence**, not one state.
5. `format.ts` enforces 2 decimal places for pH from the ±0.02 tolerance, and
   2 dp for burette volume from the instrument resolution. **This is where the
   `GOAL.md` §5.2 fake-precision rule is enforced**, so it needs a test.
6. `symbolic.ts` emits the equilibrium expressions **actually used**, with the
   neglected terms named. It may also emit the Henderson–Hasselbalch form
   **flagged `label: "shortcut"`** alongside the exact solve (SPEC open question 4).
7. Colour values come from a token module, not literals.

### Tests and evidence

| Test | Proves |
|---|---|
| Colour varies continuously with the ratio; no discontinuity at any threshold | AC-V2 |
| Grep/lint fixture: no chemical colour literal in `packages/render` | AC-V3 |
| Liquid level matches a hand-computed fixture for a known profile | AC-V4 |
| `reading == initial − Σ delivered` under randomized transfer sequences | Failure mode 14 |
| pH formatted to exactly 2 dp; `formatPh(4.7447123) === "4.74"` | AC-V6 |
| Observable output is a pure function: same input → deep-equal output, no DOM, no PixiJS | Testability of the whole layer |
| Curve points derive from a state sequence, not from a stored array | No pre-authored curves |

### Stop condition

The entire observable layer is exercisable in Node with no browser, and no
chemistry decision is made anywhere in it.

---

## M6 — First final-quality apparatus slice

**Target stage:** S3
**Addresses:** `GOAL.md` §5.7, §15; ADR-0006; `SPEC-0001` AC-V5, AC-F1, AC-X1, AC-X2

### Purpose

Produce apparatus that meets the written standard, and capture the visual
baseline. **This is a gate, not a task.** If the bar cannot be met, that is a
finding about the rendering choice, and it must surface here rather than after
the product is built on it.

### Files and modules

```
packages/render/src/pixi/             PixiJS renderer consuming RenderState
apps/web/src/scene/                   wiring
assets/apparatus/                     burette, conical flask, beaker, stand, clamp
assets/tokens/                        colour tokens
tests/visual/baselines/               approved screenshots
tests/visual/capture.spec.ts          Playwright capture at the four named viewports
docs/visual/review-m6.md              the completed checklist from the standard
```

### Contracts changed

`RenderState` will likely need to change once a real renderer consumes it. That
is expected and is why M6 exists as a gate.

### Implementation

1. Author assets against `docs/visual/apparatus-standard.md`. Orthographic, one
   world unit = one millilitre of liquid volume. Self-host everything; any font
   or texture is a bundled asset, never a runtime fetch (AC-P5).
2. **Every volumetric asset publishes an interior volume profile.** Assets
   without one are marked `non_volumetric` and accept approximate liquid level.
3. Renderer consumes `RenderState` only. Verify by inspection that no chemistry
   value (a `Ka`, a `pH` used as logic) crosses the boundary.
4. Capture at `desktop-primary`, `desktop-compact`, `tablet`, `narrow`.
5. Complete `docs/visual/review-m6.md` using the standard's checklist.

### Tests and evidence

| Test | Proves |
|---|---|
| Screenshots at all four viewports from a deterministic fixture world | AC-V5 |
| Owner visual review against the standard, recorded in `review-m6.md` | `GOAL.md` §15 |
| Originality check: no traced or copied asset; side-by-side benchmark screenshot included | The standard's originality section |
| 60 fps at `desktop-primary` over a 30 s scripted interaction | AC-F1 |
| WCAG AA contrast on all readouts | AC-X1 |
| Numeric readout accompanies every colour change | AC-X2 |
| `pnpm depcruise` still clean | AC-V1 holds after real code lands |

### Stop condition

Owner has reviewed the baseline and accepted it as the v1 visual bar. **If
PixiJS cannot reach the bar, stop and reconsider the renderer here** — this is
the cheapest point at which that decision can be made, and it is why the gate
exists.

---

## M7 — Interactive titration end to end

**Target stage:** S3
**Addresses:** `SPEC-0001` §UX, AC-F2

### Purpose

The first moment the product exists: a learner delivers titrant and watches a
real curve appear from real chemistry.

### Files and modules

```
apps/web/src/routes/               sandbox scenario view
apps/web/src/commands/             UserIntent → Command translation
apps/web/src/panels/               readouts, curve, macro/micro/symbolic switch
content/titration/hcl-naoh.v1.json
content/titration/ch3cooh-naoh.v1.json
tests/e2e/titration.spec.ts
```

### Contracts changed

No new persisted contracts. Command wiring is finalized.

### Implementation

1. Deliver: slider sets a volume; **no event until commit** (`SPEC-0001`
   §Interaction semantics). Dragging emits nothing.
2. Compose the four cores in `apps/web` only.
3. Render the curve incrementally; a commit adds exactly one point.
4. Rejection path: delivering more than the burette holds is refused with a
   visible reason and no event.
5. `MODEL_OUT_OF_DOMAIN` rendered as an explicit unavailable state with the
   reason — never a number.
6. Content files declare the two scenarios and contain **no chemistry logic**.

### Tests and evidence

| Test | Proves |
|---|---|
| Playwright: full flow deliver → observe → repeat → inspect | Interaction acceptance |
| Dragging the slider emits zero events; committing emits exactly one | The core interaction-semantics decision |
| Commit → updated curve in < 100 ms | AC-F2 |
| Over-delivery refused with a reason and zero events | Error path |
| Content file contains no equilibrium arithmetic | AC-C1 |
| Unknown species in content fails loudly | AC-C2 |
| pH readout shows at most 2 dp in the live DOM | AC-V6 end to end |

### Stop condition

A learner can produce a complete weak-acid titration curve from scratch, and the
curve came from the solver.

---

## M8 — Branch, replay, persistence

**Target stage:** S3
**Addresses:** ADR-0002, ADR-0005; `SPEC-0001` AC-R4, AC-R6, AC-R8, AC-P3, AC-P4

### Purpose

Make counterfactual comparison real, and make the world survive a page reload.

### Files and modules

```
packages/world/src/store/indexeddb.ts    typed wrapper, migrations
packages/world/src/store/schema.ts       store definitions, versions
packages/world/src/export.ts             chemrealm.export v1 writer/reader
packages/world/src/migrate.ts            forward-only migration runner
apps/web/src/panels/compare.ts           two-branch comparison view
tests/e2e/fork-compare.spec.ts
tests/e2e/persistence.spec.ts
```

### Contracts changed

IndexedDB record shapes; `chemrealm.export` v1; migration registry entries.

### Implementation

1. Stores per ADR-0005: `worlds`, `events`, `snapshots` in one database;
   `learnerEvidence` and `aceState` in a **separate** database, so "delete my
   learner data, keep my worlds" is one operation (ADR-0005 open question 2).
2. Fork UI with an explicit fork-point confirmation.
3. Comparison aligns on **cumulative titrant volume**, not step index
   (`SPEC-0001` §Replay, undo/redo, branch).
4. Export/import round-trip. Bundle carries `schemaVersion` and `solverConfig`,
   contains no identifiers, and states whether learner evidence is included.
5. Quota handling: estimate before writing; on a likely failure, warn and offer
   export. **A full store must not corrupt an existing world.**
6. Downgrade detection: a newer `schemaVersion` is refused with a clear message,
   never partially migrated.

### Tests and evidence

| Test | Proves |
|---|---|
| Fork, mutate child heavily, parent hash unchanged, in the browser | AC-R4 end to end |
| Reload the page; world replays to the same hash | Persistence |
| Export → import → identical state hash | AC-R8 |
| Export bundle contains no identifier field and declares evidence inclusion | AC-P4 |
| IndexedDB inspection: no identifier, name, or contact field in any store | AC-P3 |
| Replay under a mismatched solver version is refused; re-solve offered and labelled as a new world | AC-R6 |
| Simulated quota exhaustion leaves existing worlds intact | No-corruption requirement |
| Migration failure leaves the world untouched and reports it | Loud, non-destructive failure |

### Stop condition

Two branches can be created and compared without the parent being affected, and
a world survives a reload with its replay hash intact.

---

## M9 — Minimal ACE

**Target stage:** S3
**Addresses:** `GOAL.md` §6.4, §8; `AGENTS.md` §12; `SPEC-0001` AC-A1..AC-A5

### Purpose

Implement one guided interaction that demonstrates the control loop, and — more
importantly — demonstrates the *restraint* the loop requires.

### Files and modules

```
packages/ace/src/evidence.ts       evidence event types
packages/ace/src/hypotheses.ts     the ≥5 hypotheses, with uncertainty
packages/ace/src/policy.ts         intervention selection and escalation
packages/ace/src/fade.ts           scaffold-fading state machine
packages/ace/src/store.ts          ACE-local persistence (separate DB)
apps/web/src/panels/predict.ts     prediction UI
apps/web/src/panels/contrast.ts    branch-based contrasting case
```

### Contracts changed

ACE evidence events. **No world contract changes** — this is a boundary test.

### Implementation

1. Evidence events per `SPEC-0001` §Learning design. Never written to the world log.
2. Hypothesis set with **explicit uncertainty**. The model must be able to
   represent "I don't know which of five things happened", because that is the
   honest state after one wrong prediction.
3. Intervention escalation: nothing → representation switch → contrasting branch
   → escalate only on learner request or two consecutive same-signed errors.
   **No intervention reveals the answer.**
4. Fading: prompt on the first 5 deliveries; after 3 consecutive in-tolerance
   predictions, becomes an opt-in toggle defaulting off.
5. **Challenge mode: no intervention of any kind, fully usable.**
6. ACE reads world state; it never calls the solver to produce an answer for the
   learner and never writes to the world log.
7. **ACE emits `InterventionIntent` as plain data; `apps/web` maps it to UI.**
   ACE must not import `packages/render` (ADR-0001, `forbidden: ace → render`).
   The app decides whether to honour an intent and may decline. This keeps every
   intervention assertable as a data structure rather than as a rendered widget,
   which is what makes AC-A5 ("challenge mode emits zero interventions")
   mechanically checkable.

### Tests and evidence

| Test | Proves |
|---|---|
| Prediction emits `PredictionRecorded` and `PredictionResolved` | AC-A1 |
| No ACE write ever reaches the world event log | AC-A2 |
| After one wrong prediction, ≥2 hypotheses remain with non-zero uncertainty | AC-A3 |
| 3 consecutive in-tolerance predictions flip the prompt to optional | AC-A4 |
| Challenge mode emits zero interventions and the flow completes | AC-A5 |
| Sandbox play (10 random deliveries, no prediction) produces zero learner inference | `GOAL.md` §8 low-information rule |
| No intervention path contains the correct pH value | No-answer-reveal, asserted structurally |

### Stop condition

ACE demonstrably declines to over-infer, and a learner can complete the whole
titration with ACE entirely disabled.

---

## M10 — Integrated verification

**Target stage:** S3
**Addresses:** `AGENTS.md` §17; `CLAUDE.md` §14, §15, §16

### Purpose

Assemble the evidence packet, run the acceptance matrix, and — critically —
write down what is *not* verified.

### Implementation

1. Run every acceptance criterion from `SPEC-0001` and record result + evidence
   location. **No averaging.** One critical FAIL means the stage is not accepted
   (`CLAUDE.md` §16).
2. Produce the evidence packet in the `CLAUDE.md` §15 format.
3. Re-run the full regression suite; confirm no test was weakened to reach green.
4. Confirm every temporary scaffold is either removed or explicitly excluded
   from acceptance.
5. Decide the fate of `spikes/solver-validation/`: keep as documentation, or
   delete now that M4 supersedes it. **Record the decision either way.**
6. Update ADR statuses from `Proposed` to `Accepted` where implementation has
   confirmed them; mark superseded any that were decided differently than
   expected.

### Tests and evidence

A complete acceptance matrix with one row per criterion and a resolvable
evidence path. Plus:

- a scientific evidence section (reference cases, tolerances, solver versions);
- a runtime evidence section (replay hashes, branch isolation, persistence);
- a visual evidence section (baseline paths, viewports);
- a privacy evidence section (network log, storage inspection);
- an explicit known-limitations section.

### Stop condition

Every acceptance criterion has a recorded result. **The known-limitations section
is non-empty and honest** — if M10 produces a stage with no limitations, the most
likely explanation is that the review was not adversarial enough.

---

## Execution notes for the implementing agent

- **Read order:** `GOAL.md` → `CLAUDE.md` → `AGENTS.md` → the relevant ADRs →
  this spec → this plan. Do not begin from a milestone title.
- **Run:** `pnpm install`, `pnpm build`, `pnpm test`, `pnpm depcruise`,
  `uv sync --project tools/oracle`, `uv run --project tools/oracle pytest`.
- **Never** weaken a test to reach green. If a criterion cannot be met, report it.
- **Never** generate a reference value with the code under test (spike finding F7).
- **Stop and escalate** rather than guessing when:
  - AC-R3 (quantization) fails at M2;
  - PHREEQC disagrees with the solver beyond tolerance at M4;
  - PixiJS cannot reach the visual bar at M6;
  - a constant cannot be traced to a citable source at M4.

## What would invalidate this plan

- `SPEC-0001` being rejected or substantially revised.
- ADR-0003 being reversed toward a server-side solver, which would restructure
  M3–M4 and add a deployment milestone that does not exist here.
- AC-R3 failing, which would reopen ADR-0007 and therefore M2 and M4 together.
- The visual bar proving unreachable at M6, which would reopen the renderer
  choice and M5–M7.
