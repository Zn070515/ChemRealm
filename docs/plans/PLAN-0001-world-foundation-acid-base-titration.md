# PLAN-0001 — World Foundation & Acid-Base Titration

- **Status:** **M0–M4 S3 Verified / Accepted; M5 S2 production composition locally verified; native backend supersession S2 implementation in progress** — the original plan was approved
  on 2026-09-11 at `SPEC-0001` revision 6; revisions 13–20 were accepted
  on 2026-09-13 and revisions 25–26 are candidate amendments for the current
  M5/native-backend closure.
- **Completed:** `M0 — Repository foundation` reached **S3 — Verified** on
  2026-09-11. Evidence: `docs/evidence/M0.md`, commits `1f3dfee`/`565a2e8`,
  CI run `34595967023` (13/13 gate steps on a clean `ubuntu-latest` checkout).
- **Completed:** `M4 — Acid-base reference engine and oracle validation` is
  **S3 — Verified / Accepted** at implementation baseline `bb6a477d` with
  hosted CI `34747266204`; evidence is in `docs/evidence/M4.md`. **Authorized:**
  `M5 — Observable state` is the next milestone. `M1 — Schema and units`
  is **S3 — Verified / Accepted** with evidence in `docs/evidence/M1.md`; `M2 —
  Event runtime and replay` is **S3 — Verified / Accepted** at baseline
  `778fadbd` with CI `34677042056` and evidence in `docs/evidence/M2.md`.
- **M5 composition handoff:** the committed local DOM composition baseline is
  `cad8461bb5654d489234a968bbcfd9aaa99b315c` with hosted CI
  `34761601096` — **success**. M5 remains S2; final visual, interaction, and
  owner acceptance evidence remain open. Native backend work is governed by
  `docs/superpowers/plans/2026-09-13-m4-native-scientific-backend.md`.
- **Coverage check:** `uv run python tools/check_acceptance_coverage.py` — every `AC-*` in
  `SPEC-0001` is required to appear in at least one milestone here. Run it after
  editing either document. This is a mapping/evidence-attachment check only;
  criterion-specific semantic sufficiency is proved by the tests and guards
  named in each milestone's evidence.
- **Date:** 2026-09-12 (revised for M3 acceptance and M4 implementation)
- **Implements:** `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`
- **Related ADRs:** 0001–0009 were accepted at the baseline; ADR-0001 and
  ADR-0003 M1 Final Closure and M3 owner decisions, ADR-0001's M1 amendment,
  and ADR-0010 are accepted. ADR-0011 and ADR-0012 are accepted as part of M4
  S3 on 2026-09-13. Load-bearing here: 0004 (revised), 0007 (revised),
  0008, 0009, and ADR-0010's
  M2 basis-boundary gate.
- **Audience:** an agent that did not participate in the design. Nothing below
  assumes prior context beyond the repository documents.

> **Revision note.** M1, M2, M4, M8, and M9 changed materially after owner
> review. The scientific formulation is now **self-consistent in activity** and
> on the **molality** basis; the numeric policy now permits the transcendentals
> the model needs and ships deterministic implementations of them; canonical
> state stores independent amounts rather than species. **An agent executing an
> earlier copy of this plan would build the wrong thing.**

> **Final-closure note.** DTO→domain bridges canonicalize units before
> construction; every resolved snapshot datum is canonical, carries its own
> `DataProvenance`, and is required structurally; export contracts are aligned
> with the v1 export format, v4 persisted world schema, and v4 authored Scenario shape; persisted v2→v3 temperature and v3→v4 volume-profile migrations are explicit; and v0 rejects mixed composition bases until the Scientific
> Reality Core owns the joint resolver. M1–M4 are S3 verified; M5 is
> authorized.

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

`SPEC-0001` and ADRs 0001–0009 must be `Accepted` before M0 begins. Building
against a `Proposed` ADR is exactly the "assume the decision is made" failure the
ADR status vocabulary exists to prevent.

**Satisfied 2026-09-11** at baseline `8310c685`: `SPEC-0001` accepted at
revision 6 and all nine ADRs accepted. Milestones may proceed.

Additionally, the owner must resolve before their milestones:

| Before | Decision needed |
|---|---|
| M4 | `SPEC-0001` open question 1 — which acetic acid `Ka` is authoritative (enters replay identity) |
| M4 | `SPEC-0001` open question 6 — TypeScript vs WASM for `detLog10`/`detExp10` |
| ~~M5~~ | ~~open question 5~~ — **DECIDED** by owner 2026-09-11: default shows `−lg c(H⁺)` labelled simply as pH; a `科学模型` affordance shows activity-based model pH with the convention caveat |
| M8 | `ADR-0008`'s five open decisions, especially the solver version support window |

## Milestone map

| M | Title | Depends on | Primary risk |
|---|---|---|---|
| M0 | Repository foundation | — | Two toolchains in one CI |
| M1 | Schema and units | M0 | Getting the contract wrong early |
| M2 | Event runtime and replay | M1 | Determinism |
| M3 | Solver adapter contract | M1 | Over- or under-designing the envelope |
| M4 | Acid-base engine and oracle validation | M3 | PHREEQC install; the equivalence-region gap |
| M5 | Observable state | M1, M4 | Observable layer catching chemistry it shouldn't |
| M4-B | Native Scientific Core/WASM backend supersession | M4, M5 S2 | Native/legacy identity, deterministic differential validation, and no silent fallback |
| M6 | First final-quality apparatus slice | M5 | Hitting the visual bar with PixiJS |
| M7 | Interactive titration end to end | M6 | Integration; the first real product moment |
| M8 | Branch, replay, persistence | M2, M7 | Parent immutability; IndexedDB quota |
| M9 | Minimal ACE | M7 | Inferring too much from too little |
| M10 | Integrated verification | all | Assembling honest evidence |

Ordering follows `CLAUDE.md` §6: contracts → validation fixtures → core →
adapter → observable → renderer → ACE → persistence → end-to-end → docs.

---

## M0 — Repository foundation

**Status:** **S3 — Verified**, 2026-09-11 · evidence `docs/evidence/M0.md`
**Target stage:** S3
**Addresses:** ADR-0001; `SPEC-0001` AC-P1, AC-P5, AC-V1

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
pyproject.toml                   THE Python project; environment is .venv (root)
uv.lock
.venv/                           project environment (gitignored)
tools/check_acceptance_coverage.py   already present
tools/oracle/                    oracle SOURCE and tests — not a separate project
docs/adr/, docs/specs/, docs/plans/  already present
```

**One Python project, at the root** (round 6, finding P1-2). An earlier revision
put `pyproject.toml` inside `tools/oracle/` while the environment lived at the
root `.venv`, which left `uv sync` / `uv run` with two plausible resolution
targets. There is now exactly one: `pyproject.toml` at the root, `.venv` at the
root, `tools/oracle/` holds source only. `ADR-0001`'s rule that Python is not a
pnpm workspace member is unaffected.

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
5. Root `pyproject.toml` plus a single smoke test in `tools/oracle/tests/`, so
   the second toolchain is exercised in CI from day one. **No PHREEQC yet** —
   that is M4.

   **The canonical Python commands, used verbatim in README, CI, and every doc.**
   They are platform-neutral on purpose: a Windows-only `py` launcher does not
   exist on the GitHub Actions Ubuntu runner, so any command containing `py`
   would fail CI on the first run.

   ```
   uv sync                                            # create/refresh .venv
   uv run pytest                                      # oracle smoke tests
   uv run python tools/check_acceptance_coverage.py   # acceptance coverage
   ```
6. CI runs both toolchains:

   ```
   pnpm install --frozen-lockfile && pnpm verify:versions && pnpm build && pnpm test && pnpm depcruise
   uv sync && uv run pytest
   uv run python tools/check_acceptance_coverage.py
   ```
6a. **The coverage check is not optional and not cosmetic.** Across four
   consecutive owner-review rounds the defect "a criterion was added to the spec
   and the plan was not updated" was found by a human re-reading the documents,
   while the agent each time reported "no dangling references". Human
   recollection is not evidence; this is. The check fails the build if any
   `AC-*` defined in `SPEC-0001` is absent from every `PLAN-0001` milestone, or
   if the plan references a criterion that does not exist.
7. `README.md` with the same two-toolchain commands, copied from step 5 and
   step 6 — **the same strings, not a paraphrase**, since divergence is what
   round 6 found.

### Tests and evidence

| Test | Proves |
|---|---|
| `pnpm build` succeeds | Workspace is coherent |
| `pnpm test` passes | Vitest is wired across the workspace |
| `pnpm depcruise` passes on the clean tree | Rules are active |
| `pnpm depcruise` **fails** on a deliberately added `render → sci` import (fixture, then reverted) | AC-V1 — the rule actually bites; this is the point of M0 |
| `uv sync && uv run pytest` passes | The second toolchain runs |
| **`uv run python tools/check_acceptance_coverage.py` passes; and exits 1 both when a criterion is deliberately dropped from an `Addresses:` line and when its evidence row is deliberately removed (fixtures, then reverted)** | AC coverage is machine-checked and the check bites on all three conditions, `UNEVIDENCED` included |
| CI green on a clean checkout | Both toolchains coexist (ADR-0001's central claim) |
| Build artifact inspection: the emitted HTML references no server API route | AC-P1 — there is no backend to route to |
| Static scan of the build output for third-party load positions | AC-P5 preventive guard — fast, no browser |
| **`pnpm test:browser`: load the built page in Chromium, capture every request, assert each is same-origin** | AC-P5 acceptance evidence — the network inspection the spec asks for |
| Both of the above, each proven to FAIL on an injected `fonts.googleapis.com` stylesheet (fixture, then reverted) | The checks bite; a guard nobody has seen fire is not a guard |

### Stop condition

CI is green on a clean checkout, and a deliberately-introduced forbidden import
has been observed to fail the build. If the dependency rule can be bypassed, M0
is not complete regardless of everything else passing.

### Rollback

Delete the M0 files. Nothing is persisted and nothing depends on them.

---

## M1 — Schema and units

**Status:** **S3 — Verified / Accepted**, 2026-09-11 · evidence
`docs/evidence/M1.md` · implementation `295908ec` · CI `34611467104`
**Target stage:** S3
**Addresses:** ADR-0001, ADR-0004; `SPEC-0001` AC-C1, AC-C2, AC-R15, AC-R16, AC-R21, AC-P4, AC-U1..AC-U5, AC-V7

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
packages/schema/src/scientific.ts     ScientificState, solver/data provenance, ModelDescriptor
packages/schema/src/content.ts        scenario definition schema
packages/schema/src/export.ts         chemrealm.export v1
packages/schema/src/json-schema.ts    emits JSON Schema into
packages/schema/scripts/emit-json-schema.mjs   packages/schema/json-schema/ (COMMITTED)

Note the artifact path: COMMITTED at `packages/schema/json-schema/`, not under
`dist/`. `dist/` is gitignored, and a drift check against an uncommitted
artifact is vacuous — regenerating during build would always make it
"current". Committing also lets the Python side validate with no Node
toolchain. This resolves `ADR-0001` open question 1, whose leaning had been
self-contradictory. CI gates: `pnpm verify:schema-artifacts`.
```

### Contracts changed

All of them. This is the milestone that creates the public surface.

### Implementation

**Read `docs/science/quantity-ontology.md` first.** It defines the quantities;
this milestone defines their representation.

1. **Representations chosen by which operations have defined physical meaning**
   — the **controlled quantity algebra** of `ADR-0004` §2, not "is arithmetic
   allowed". Activity is multiplied and divided (`Ka = a_H·a_A/a_HA`); mole
   fractions are summed (`Σx = 1`); ionic strengths are summed and compared.
   Blocking arithmetic wholesale on those would block legitimate physics.
   - **Opaque** (`interface` with a `unique symbol` key, **not** `number & …`):
     `Ph`, `Activity`, `ActivityCoefficient`, `MoleFraction`,
     `IonicStrengthMolal`, `IonicStrengthMolar`, `ReducedIonicStrength`,
     **`ReducedMolality`** (dimensionless, distinct from `MolPerKilogram`),
     **`ThermodynamicConstant`** (`Ka`/`Kw` — strictly positive, and its own
     type so that a CONDITIONAL constant cannot be stored where a standard-state
     one belongs; ontology anti-pattern 5).
     Raw operators must be a **type error**, verified by a compile fixture; the
     **defined** operations are supplied as named functions
     (`ratioActivity`, `differencePh`, `sumMoleFractions`, and the per-basis
     ionic-strength sum/scale/compare set).
   - **Branded** (`number & { __unit }`): `Mol`, `Kilogram`, `Litre`,
     `Millimetre`, `MolPerKilogram`, `MolPerLitre`, `Kelvin`, `Kilopascal`,
     `Second`.
   Each branded unit needs a **distinct brand key**. The spike found a real bug
   where `Mol` and `Litre` shared a symbol and became mutually assignable.
   `ReducedIonicStrength` is **dimensionless** and separate from both
   `IonicStrengthMolal` and `IonicStrengthMolar` — Davies accepts only the
   reduced type (`AC-U4`), so the dimensionally illegal `1 + √(mol/kg)` cannot
   be written.
2. **Named operators** returning branded types (`sumAmounts`, `scaleVolume`, …)
   so arithmetic results can be stored, plus the quantity-algebra operators
   above. No scientific-core public signature accepts a bare `number` where a
   physical quantity is meant.
3. Constructors reject `NaN`, infinities, and negatives where non-physical.
4. **One** conversion module. No `* 1000` elsewhere. Round-trip conversions for
   every unit, including the molality↔molarity path, which needs a **sourced
   solution density from the scenario** — never an invented model.
   Every DTO→domain bridge calls `toCanonical()` after schema dimension
   validation; it never discards the wire unit and passes the numeric value
   directly to a branded constructor. This includes request fields, species
   state fields, and `nearestSupported` model descriptors.
5. zod schemas for every contract, with `schemaVersion`.
6. `parseQuantity` rejects a missing **and** an unknown unit. No defaults
   (`SPEC-0001` AC-U3).
7. JSON Schema emission for the Python oracle, with a CI drift check.
8. A no-op `1 → 1` migration in a registry, so the harness predates its need.

### Tests and evidence

| Test | Proves |
|---|---|
| Unit round-trip property test for every unit, incl. molality↔molarity | Conversion module is correct |
| Compile fixture: `Ph + Ph` and `Ph / 2` are type errors | AC-U1 — opaque truly blocks arithmetic |
| Compile fixture: `molA + litreB` **is legal**; its result cannot be stored as a quantity | AC-U1 — the branded guarantee is the honest one, not the overstated one |
| Compile fixture: `IonicStrengthMolal` vs `IonicStrengthMolar` neither assignable nor comparable | AC-U2 |
| Compile fixture: `Mol` and `Litre` are not mutually assignable | Catches the shared-brand-key bug |
| `litre(-1)`, `molPerKilogram(NaN)` throw | Constructors validate |
| `parseQuantity` rejects `{}` and `{"value":1,"unit":"furlong"}` | AC-U3 |
| `Millimetre` is the geometry type; no volume-typed geometry field exists | AC-V7 |
| Compile fixture: `ReducedMolality` and `MolPerKilogram` are not assignable | AC-U5 — the standard-state distinction is a compile-time barrier, because `m0 = 1` makes it invisible numerically |
| Compile fixture: `ReducedIonicStrength` is not assignable to either dimensioned ionic-strength type | AC-U4 |
| Schema test: `Vessel` has no `contents` field; contents exist only under `canonical.byVessel` | AC-R15 |
| Schema test: `CanonicalContents` carries `componentAmounts`, carries **no** material identifier, and the recipe-level `soluteId` is absent from it; the emitted artifact is checked too | AC-R21 |
| Compile fixture: `amount: state.modelPh` does not typecheck, and neither does an `Activity` standing in for an `ActivityCoefficient` | The domain types at the Scientific API boundary are quantities, not bare numbers — the guarantee the DTO/domain split exists to provide |
| `parseSolveRequest` / `parseScientificState` go through the constructors, and a DTO with `{value, unit:"mol/kg"}` where a dimensionless quantity belongs is REJECTED | A dimensionless quantity is not interchangeable with a dimensioned one across the wire |
| DTO bridge cases `g→kg`, `mL→L`, `mmol→mol`, and `degC→K` produce canonical domain values; the nested scientific state and nearest-supported descriptor are covered too | Wire units are validated **and converted**, not merely validated then discarded |
| `MaterialSnapshot` accepts canonical tagged `amountConcentration`/`molarMass` fields, requires provenance beside density and every composition/molar-mass datum, and rejects legacy or non-canonical forms | AC-U3 applies to the persisted world contract, not only the standalone quantity parser; coverage is structural |
| Content artifact accepts multiple molarity solutes but rejects mixed bases and more than one molality solute | v0 does not express a state the resolver cannot safely resolve; the future joint formula is a Scientific Reality Core prerequisite |
| Meta-test: every object that declares `properties` in **every** emitted artifact also sets `additionalProperties: false`; the runtime rejects the same nested unknown key | TypeScript and Python agree on unknown fields, in both directions |
| Compile fixture: summing ionic strength across bases does not compile | AC-U2 — one generic `sumIonicStrength` would have accepted `I_m + I_c` silently |
| `activityCoefficient(0)` and `thermodynamicConstant(0)` throw | γ > 0 and `Ka > 0` are physical invariants, not defaults |
| Export-schema test: a bundle claiming `includesLearnerEvidence: true`, and one carrying a **nested** learner identifier, are both REJECTED | AC-P4 — the check is recursive, not top-level |
| Schema test: the `ScenarioSnapshot` type has no solver-config field; it carries `modelRequirements` | AC-R16 |
| Content-schema test: a scenario carries no equilibrium arithmetic | AC-C1 |
| Negative content test: an unknown species or unit fails loudly, with no default | AC-C2 |
| Export-schema test: the bundle carries no tracking identifier, and does carry `lineage` and an explicit `includesLearnerEvidence` | AC-P4 |
| Golden JSON Schema snapshot | Contract drift is visible in review |
| **Python test loads the committed artifact and validates a fixture against it; a second fixture that violates the contract is REJECTED** | M1 stop condition — `ADR-0001` rule 1's "one source of truth" is demonstrated, not asserted |
| Migration harness passes a current persisted record through and exercises the explicit chain | The migration harness exists before it is needed (`SPEC-0001` §Rollout/migration). **Not `AC-R8`** — that criterion is the export→import round-trip to an identical state hash, evidenced at M2/M8 |

### Note on what this milestone does **not** claim

Branded types do **not** prevent unit-mixing arithmetic; the spike measured that
they do not. The guarantee is that a plain number cannot be assigned to a
quantity, cross-unit assignment is blocked, and arithmetic results cannot be
stored back without an explicit conversion — plus the API-boundary rule above.
Writing the guarantee any more strongly would be a false claim in the document
whose job is preventing false claims.

### Stop condition

Every `SPEC-0001` contract has a schema; every schema has a test; the JSON Schema
artifact is emitted and consumed by at least one Python test that validates a
fixture against it. That last item is what proves ADR-0001's "one source of
truth" claim rather than asserting it.

---

## M2 — Event runtime and replay

**Status:** **S3 — Verified / Accepted**, baseline `778fadbd`, CI
`34677042056` · evidence `docs/evidence/M2.md`
**Target stage:** S3
**Addresses:** ADR-0002, ADR-0007; `SPEC-0001` AC-R1..AC-R5, AC-R7, AC-R9..AC-R16, AC-R18..AC-R19

`AC-R6` (solver-identity refusal) and `AC-R8` (export → import round-trip) are
**not** claimed here. Both were inside the `AC-R1..AC-R16` range and the evidence
for each lands elsewhere — `AC-R6` at M3 (registry foundation) and M8, `AC-R8` at
M8. A range that sweeps in criteria another milestone evidences reads as M2
coverage that M2 does not have.

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
and replay remain synchronous and solver-free. M4 supplies the real adapter only
through composition code after a committed state exists.

### Implementation

1. **`CanonicalContents` is per-vessel, and contains exactly three things:**
   **`waterMass`, `liquidVolume`, and component `amount`s.** Nothing else.

   **`amount`s are COMPONENTS** (`AC-R21`, spec revision 7). Material identity
   belongs only to the genesis recipe snapshot; it is not a conserved field and
   must not appear in conserved world state.

   **`scenarioSnapshot` is NOT part of it.** It is world-level genesis state and
   lives on `WorldState` (`WorldCreated` writes it). Putting it in
   `CanonicalContents` would give a world with eight vessels eight copies of one
   genesis snapshot, and would re-blur the boundary between *world metadata* and
   *per-vessel conserved contents* — the same confusion as the
   `Vessel.contents` / `canonical.byVessel` duplication fixed earlier.

   ```
   WorldState {
     scenarioSnapshot                 // world-level, from genesis
     canonical: {
       byVessel: {
         vesselA: { waterMass, liquidVolume, componentAmounts }
          vesselB: { waterMass, liquidVolume, componentAmounts }
       }
     }
   }
   ```

   `liquidVolume` is easy to omit and was missing from an earlier revision of
   this plan — it drives liquid level, the burette reading, `c(H+)`, and **the
   size of the next transfer**, so it is state, not a display value (AC-R13).
   Species, activities, and ionic strength are **derived** and never quantized
   independently (`ADR-0007` §3).
2. `quantize(v) = Number(v.toPrecision(12))`. Event volumes are canonicalized
   at the command/log boundary; each conserved transfer delta (water mass and
   every component amount) is quantized once and the same delta is applied to
   source and target. Replay identity uses an explicit projection: metadata,
   solver inputs, provenance, and structure remain exact, while only canonical
   independent runtime quantities are quantized.
3. `canonicalJson`: sorted keys, specified shortest round-trip formatting,
   **normalize `-0` to `0`**, **reject `NaN`/`±Infinity`**.
4. Reducer enforces `event.seq === state.sequence + 1`; strict sequential replay.
5. **Two hashes** (`ADR-0007` §5): `replayHash` over the explicit replay-identity
   projection, `scienceHash` over derived science. Exclude wall-clock, cursor,
   presentation.
6. `branch.ts` freezes the fork-point state; add a **runtime** dev assertion that
   the parent object graph is unchanged after a child mutation — an end-of-test
   hash comparison can miss a transient mutation.
7. Snapshot policy with the invariant that snapshots are a cache.
8. `TransferCommitted` handling remains a synchronous world fact; chemistry is
   recomputed by composition-level orchestration after the reducer boundary,
   through the async M3 `SolverAdapter`.

### Tests and evidence

| Test | Proves |
|---|---|
| Replay of a 500-event log: hash identical at every boundary, run twice | AC-R1, AC-R2 |
| Same log replayed through a **perturbed arithmetic path** (an extra `+0.0`, a different but equivalent grouping) yields the same quantized hash | AC-R3 — the cross-engine proxy |
| **Relative conservation after canonicalization ≤ 1e-13 over 100 transfers** | AC-R9 |
| **The "quantize each vessel independently" strategy FAILS the above** (measured 4.0e-12 vs 1.4e-15) | AC-R9 design guard — the wrong design must be caught here, not in production |
| Static check: no derived quantity passes through the quantization call site | AC-R10 |
| `canonicalJson` normalizes `-0`, rejects `NaN`/`Infinity` | AC-R11 |
| Fork, mutate child heavily, assert parent hash unchanged | AC-R4 |
| Replay with all snapshots deleted | AC-R5 |
| 500-event replay under 2 s | AC-R7 |
| Reducer rejects out-of-sequence events | Sequence enforcement |
| `canonicalJson` order-independence | Hash is structural, not incidental |
| **Replay completeness: move `content/` aside entirely, replay a serialized world, `replayHash` unchanged** | AC-R12 — the log is self-contained |
| `liquidVolume` changes only through explicit volume-bearing events (`MaterialCharged`, `TransferCommitted`); changing it changes `replayHash` | AC-R13 |
| Volume, water mass and component amounts conserved over 100 transfers | AC-R14 |
| Transfer deltas computed from the **pre-transfer** snapshot; an implementation that interleaves read/write produces a different result and fails | AC-R18 |
| `WorldCreated` carries `worldId`; `WorldBranched` carries `childWorldId`, `parentWorldId`, `forkSequence`, `forkStateHash`; replay reconstructs the final `worldId` and lineage from the log alone | AC-R19 |
| Schema test: contents exist only under `canonical.byVessel`; the reducer never writes a `Vessel.contents` | AC-R15 |
| Schema test: exactly one resolved `solverConfig` per world, on `WorldState` from genesis | AC-R16 |

### Stop condition

Determinism is *demonstrated*, not argued. If AC-R3 cannot be made to pass,
**stop and revisit ADR-0007 before M4.** Discovering a quantization flaw after
the scientific engine is built means rebuilding both.

---

## M3 — Solver adapter contract

**Status:** **S3 — Verified / Accepted** · evidence
`docs/evidence/M3.md` · verified implementation baseline `573c36f`
with CI `34682646131`
**Authorization:** M4 authorized by owner 2026-09-12 after M3 S3 acceptance
at baseline `573c36f` (CI `34682646131`)
**Target stage:** S3 — complete
**Addresses:** ADR-0003; `SPEC-0001` AC-R20, AC-S4

### Purpose

Fix the interface through which every scientific number enters the world, with
provenance and validity as first-class return values.

### Files and modules

```
packages/schema/src/scientific.ts   DTO/domain bridges, solute and result unions
packages/sci/src/adapter.ts         one-model SolverAdapter + exact SolverConfig
packages/sci/src/request.ts         canonical requirements and request validation
packages/sci/src/identity.ts        frozen identity snapshots and result assertion
packages/sci/src/stub.ts            deliberately-trivial async contract adapter
packages/sci/src/registry.ts        exact identity registration and resolution
packages/world/src/reduce.ts        synchronous world reducer with no solver hook
packages/world/src/replay.ts        synchronous replay and projection/hash callback
apps/web/src/world-creation.ts      composition-level requirements/genesis builder
```

### Contracts changed

`SolverAdapter`, exact `SolverConfig` binding, `SolveRequestSolute`,
`SolveResult`, `Provenance`, `ModelDescriptor`, deep-readonly identity
snapshots, `ReduceOptions`, and the composition-level `createWorld` result
union.

### Implementation

1. The result union has no convenience scalar accessor. `OK` contains a
   `ScientificState`; `MODEL_OUT_OF_DOMAIN` always contains a required
   `nearestSupported` descriptor; all quantities cross the DTO bridge through
   dimension validation, `toCanonical()`, and an opaque constructor.
2. `SolverAdapter.solve(request)` is async from the start. v0 exposes exactly
   one `model` and one `solverConfig`, and registry registration rejects any
   adapter/model/config `id` or `version` mismatch. Compatible resolution returns
   the complete config that genesis persists.
3. `SolveRequest` uses a discriminated solute union: fully dissociated solutes
   have no `ka`, while monoprotic-equilibrium solutes require a positive,
   dimensionless `ka`. Contradictory combinations are rejected by schema and
   defensive runtime validation.
4. The World Runtime reducer and replay remain synchronous, pure, and unaware
   of scientific adapters. Composition code may await a solver only after a
   committed world state exists; async completion order cannot alter world truth.
5. `apps/web/src/world-creation.ts` parses a scenario, canonicalizes and
   resolves model requirements, and returns a reasoned rejection without an
   event when no exact adapter is compatible. A compatible result includes a
   schema-valid `WorldCreated` with the resolver's exact `SolverConfig`.
6. Solver `Provenance` records the model run, not citations for material inputs.
   Genesis `MaterialSnapshot` attaches `DataProvenance` to density and every
   composition and molar-mass datum. Persistence availability tiers, re-solve,
   and archive behavior remain M8 scope under ADR-0008.
7. Defensive validation treats request data as untrusted at runtime: missing or
   malformed constants, non-finite quantities, impossible temperatures, and
   malformed arrays return `INVALID_INPUT` instead of throwing.
8. Model/config identity is copied and deeply frozen at adapter construction
   and registry boundaries. Registered adapters are exposed through a frozen
   wrapper, and a shared result assertion rejects an `OK` state whose
   provenance model id, version, or exact parameter set differs from the
   adapter identity.

### Tests and evidence

| Test | Proves |
|---|---|
| Stub adapter returns each of the four statuses asynchronously | Union is complete and exercisable |
| Registry refuses a version mismatch and identity mismatch | AC-R6 and exact adapter/model/config identity |
| A request outside the declared domain returns `MODEL_OUT_OF_DOMAIN` with a required descriptor | AC-S4 and actionable refusal |
| Schema/runtime tests reject contradictory solute modes and incomplete `ka` data | Scientific request semantics cannot be ambiguous |
| Type test: `SolveResult` has no `ph: number` field | The convenience shortcut cannot be added quietly |
| `Provenance.category` is required, not optional | `GOAL.md` §12 is enforceable |
| Adapter tests feed missing/malformed constants, `NaN`/`Infinity`, negative temperature, and malformed arrays through a cast boundary | Defensive invalid input is always tagged and never leaks a runtime exception |
| Registry tests mutate caller-owned descriptor/config objects after registration and inspect nested freeze state | Exact solver identity cannot drift after registration |
| Adapter and registry-wrapper tests return `OK` with mismatched provenance model id, version, or parameters | Scientific output cannot claim a different producer than the adapter/config that returned it |
| Reducer regression proves a solver callback is not invoked and return remains synchronous | Async orchestration is outside World Runtime |
| `apps/web/src/world-creation.test.ts` proves incompatible requirements return no event and compatible requirements persist the complete config | AC-R20 — requirements reject genesis rather than being overridden |

### Stop condition

The interface can express every v0 scientific outcome and refusal, exact solver
identity is ready for `WorldCreated`, and no world event can be emitted when
requirements are unsatisfiable. M3 evidence is owner-verified at baseline
`573c36f`; M4 is authorized.

---

## M4 — Acid-base reference engine and oracle validation

**Status:** **S3 — Verified / Accepted** on 2026-09-13 at implementation
baseline `bb6a477d` with hosted CI `34747266204`; the complete scientific
matrix and bounded PHREEQC disposition are recorded in `docs/evidence/M4.md`.
Presentation criteria AC-V10 and AC-V11 belong to M5 and are not M4
prerequisites.
**Target stage:** S3
**Addresses:** ADR-0003, ADR-0007; `SPEC-0001` AC-S1..AC-S11, AC-S12..AC-S16

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
packages/sci/src/acidbase/index.ts        the adapter implementation boundary
packages/sci/test/reference/REF-*.json    canonical SPEC REF-1..REF-10 data
packages/sci/test/reference/ORACLE-*.json PHREEQC sweep data; separate namespace
pyproject.toml                            Python oracle tooling only; no runtime PHREEQC dependency
tools/oracle/phreeqc/run_batch.py         generate .pqi, run PHREEQC CLI, parse output
tools/oracle/phreeqc/cases/*.pqi.in
tools/oracle/tests/test_reference.py      oracle vs published standards
tools/oracle/tests/test_cross_check.py    ORACLE vs TS solver over a swept curve
docs/research/v0-scientific-inputs.json   canonical v0 material and sweep inputs
docs/research/v0-envelope-reference.json  digest-bound independent AC-S14 maximum
docs/research/constants-provenance.md     pin every constant to a citable source
```

### Contracts changed

`acidbase-monoprotic-davies@1.0.0` registered. Global model constants, including
the explicit `waterActivity: 1` convention, enter solver replay identity.
Scenario-specific indicator constants are resolved with per-datum provenance into
`ScenarioSnapshot.indicators` and enter genesis content identity under the
accepted revision-13 amendment and `ADR-0011`. The accepted revision-14
amendment and `ADR-0012`
add the analytical total-solute gate, the pinned `Kw = a_H · a_OH`
interpretation, and distinct numerical-failure tagging. Revision 15 records that
scientific wire schema v2 introduced the `NOT_CONVERGED` diagnostic code/reason
contract and assigns solvent,
phase, and required-species compatibility to requirements resolution before
genesis rather than duplicating those fields in `SolveRequest`.
Revision 16 adds the cross-system closure: actual component IDs are derived
from the resolved scenario and participate in solver resolution; authoring
Scenario shape version 3 has no ignored dissociation field; resolved
requirement temperatures are canonical Kelvin; and the Davies activity path
never evaluates outside its declared `Î ≤ 0.5` domain, including boundary
classification.
Revision 17 adds the persisted migration closure: World/Event schema version 3
preserves the historical v2 shape, canonicalizes legacy persisted temperature
in an explicit `2 → 3` step, rebuilds migrated genesis checksums, and keeps
authoring Scenario migration in its own namespace.

### Implementation

**This milestone was re-scoped by the P1-1 and P1-2 remediation. Read the revised
`SPEC-0001` §Scientific design and `spikes/activity-equilibrium/README.md` before
starting; the concentration-only formulation they describe is superseded.**

1. Implement the **self-consistent** solve: nested bisection over the unknowns
   **`(m̂_H, Î)` — REDUCED molality and REDUCED ionic strength, both
   dimensionless** — with activity coefficients inside the equilibrium
   constraints.

   **This is the point most likely to be implemented wrong.** The conditional
   constants `Kw_c` and `Ka_c` are dimensionless, so `m̂_OH = Kw_c/m̂_H` is only
   legal in reduced variables. Writing `m_OH = Kw_c/m_H` with a *physical*
   molality is `dimensionless / (mol/kg)`, and it will produce **correct-looking
   numbers anyway** because `m° = 1 mol/kg`. Three separate review rounds have
   now found dimensioned-when-it-should-be-dimensionless errors of exactly this
   shape.

   **Rule for this milestone: before writing each equation, write the unit of
   every term beside it.** Physical molalities are produced once, at the
   `ScientificState` boundary, as `m = m̂·m°`. `ReducedMolality` and
   `MolPerKilogram` are distinct types (`AC-U5`), and the spike now routes every
   physical input through an explicit `solve_physical()` boundary rather than
   relying on the call site to remember.
2. `deterministic-math.ts`: `detLog10` and `detExp10`, built only from
   `+ - * /` and exactly-specified integer operations. Port from
   `spikes/numeric-policy/check.ts`. **Improve `detExp10`'s argument reduction
   to a two-part Cody–Waite constant** and re-measure: the spike's single-constant
   version is 1.5 ulp in domain but **32.5 ulp outside it**. Until improved, the
   function must **refuse** outside its validated domain.
3. `Math.sqrt` is permitted directly — correctly rounded since the July 2024 spec
   change, measured at 0.000 ulp. Lint-ban native `Math.log10`, `Math.pow`, and
   `Math.exp` inside `packages/sci` and `packages/world`.
4. Inner ionic-strength loop: replace the spike's damped fixed point with a
   **bracketed** solve, so convergence is guaranteed rather than observed.
5. Constants pinned with sources into `docs/research/constants-provenance.md`,
   resolving AC-S7 and open question 1. **Owner sign-off required** — these enter
   replay identity. Note `A` changed 0.5085 → **0.509** with the basis change.
6. Reference cases from `packages/sci/test/reference/*.json`, **hand-authored from
   published sources and never written by the code under test.** The spike's first
   run produced three wrong reference values and had the wrong ion in its
   base-excess analytic relation (F4) — all caught only by independent derivation.
7. PHREEQC oracle: **CLI in batch mode**, in **molality** with constants aligned.
   Not `phreeqpython` (license unverified). Vendor the database locally.
8. Cross-check over a swept curve including the equivalence region. **Report
   disagreement; never average it.**
9. **Both hydrogen-ion quantities** (`−lg c(H⁺)` and `pH = −log10 a(H⁺)`) emitted
   as distinct types and covered by REF-5 and REF-6.
9a. **Ownership, per `SPEC-0001` §Who owns which quantity and `ADR-0003`.**
   The scientific core emits `ScientificState` — molal species, `γ`, activity,
   `I_m`/`Î`, **activity-based model pH**, **indicator protonation ratios**,
   validity, provenance. It does **not** emit molarity or `−lg c(H⁺)`.
   Those come from **`ScientificProjection`**, which takes `ScientificState`
   plus the canonical solution volume (`liquidVolume`) and lives in
   `packages/sci` without importing `packages/world`.
   Getting this wrong here forces every downstream layer to guess.
9b. **Indicator equilibrium is scientific.** Solve it in `packages/sci`
   (`AC-V9`). The observable layer receives `{ indicatorId, protonationRatio }`
   and owns only the mapping ratio → colour. Do **not** put `Ka_in`, an
   activity, or an activity coefficient in `packages/render` — that is the
   P1-C defect.

### Tests and evidence

| Test | Proves |
|---|---|
| REF-1..REF-10 within stated tolerances | AC-S1 |
| Charge residual < 1e-14 **mol/kg** over the sweep, on the unquantized solver state | AC-S2 |
| Element totals (Na, Cl, acid group) conserved over 100 transfers | AC-S3 |
| Domain matrix: T≠25 °C, `I_m`=0.6, polyprotic, non-aqueous, unsupported actual component, or analytical total outside bounds → `MODEL_OUT_OF_DOMAIN`; **and the converged `I_m` re-checked** | AC-S4 |
| 1e-6 mol/kg acetic acid: exact solve matched; HH divergence (0.65 pH) reproduced | AC-S5 |
| PHREEQC vs TS within ±0.02 pH **including the equivalence region**, in molality with aligned constants | AC-S6 |
| Every solver constant, indicator input, and v0 material concentration/density/molar mass has a citable datum-level source | AC-S7 |
| No molarity value reaches `packages/sci` internals outside `ScientificProjection` | AC-S8; AST-based `pnpm verify:scientific-quantities` rejects direct, aliased, namespace, dynamic-property, generic dimension/schema/parser construction, explicit molarity canonicalization including no-substitution template literals, and `molarity`/`mol/L`/`mmol/L` literals |
| `−lg c(H⁺)` and `pH` are distinct types; REF-5 and REF-6 both pass and differ by the expected amount | AC-S9 |
| `detLog10`/`detExp10` ≤1.5 ulp in domain vs arbitrary-precision; **refuse outside domain** | AC-S10 |
| Outer residual strictly increasing in `m_H` across a sweep including the domain boundary | AC-S11 |
| Indicator ratio is activity-coupled, continuous across the transition, no threshold branch | AC-V2 precursor |
| Above pH 12, the monoprotic indicator approximation reports reduced validity | `SPEC-0001` failure mode 10 |
| ScientificState/provenance and scientific-document review identify model pH as activity-based and model-dependent, never as "the true/thermodynamic pH"; inspection copy is AC-V10 in M5 | AC-S12 |
| Domain-matrix test at `I_m` = 0.15 and 0.30: the result carries `withinProposedAccuracyEnvelope: false`; visible qualification is AC-V11 in M5 | AC-S13 |
| Boundary test: both v0 scenario families run through `Scenario → WorldCreated → WorldState → SolveRequest → SolverAdapter`; their maximum `I_m` is checked against the `0.12 mol/kg` envelope and a digest-bound independent reference (`0.09996461252716539 mol/kg`) | AC-S14 |
| Negative content test: a scenario without a declared density is rejected, not defaulted | AC-S15 |
| Provenance review: no constant carries more significant figures than its source; the source's own precision is recorded | AC-S16 |

### Stop condition (revised)

AC-S1 through AC-S16 are evaluated for the M4 scientific scope. AC-V10 and
AC-V11 are explicitly owned by M5 and are not M4 stop conditions.

**Three specific conditions require stopping rather than proceeding:**

1. **If a post-hoc activity correction can reproduce REF-3 and REF-4** (both
   excess regimes, to <1e-9), the self-consistent solve is not actually being
   exercised and M4 is not doing what it claims. Investigate before continuing.
2. **If PHREEQC disagrees beyond ±0.02 pH in the equivalence region**, stop and
   investigate. A disagreement is a finding, not an inconvenience.
3. **If `detExp10` cannot be brought within 2 ulp across the full band it is
   called on**, either widen the reduction or narrow the domain — but say which,
   and test the refusal.

### The PHREEQC fallback

If PHREEQC cannot be installed and driven in CI:

1. **Do not silently drop the oracle.** Record the failure in
   `docs/research/` with the exact error.
2. Degrade to literature anchors plus the independent closed form, and
   **annotate the tolerance table in `SPEC-0001` to say the equivalence region is
   unvalidated by an independent solver.**
3. The equivalence-region gap stays open and is reported in the M10 evidence
   packet as a known limitation. It does not become "covered" by a weaker check.

---

## M5 — Observable state

**Target stage:** S3
**Current stage:** S2 implementation locally verified; replay/profile/frame
closure and a deterministic DOM composition slice are locally verified, while
M5 S3 evidence remains open. The governing scopes are
`docs/superpowers/specs/2026-09-13-m5-contract-remediation.md` and
`docs/superpowers/specs/2026-09-13-m5-production-composition.md`, subordinate to
`SPEC-0001` revision 25 Candidate and not overrides of it.
**Addresses:** ADR-0006, ADR-0007; `SPEC-0001` AC-V2..AC-V4, AC-V6, AC-V8, AC-V9, AC-V10, AC-V11

`AC-V1` (`packages/render` has no import path to `packages/sci`) is **not**
claimed here. It was inside the `AC-V1..AC-V4` range; the rule is created and
first evidenced at M0, and re-verified at M6 once real render code lands. M5
produces no render code to violate it.

### Purpose

Build the science-to-pixels pipeline as pure, browser-free TypeScript, so it can
be tested at all.

### Files and modules

```
packages/render/src/observable/index.ts       ScientificState → ObservableModel
packages/render/src/observable/level.ts       volume + volume profile → liquid level
packages/render/src/observable/color.ts       indicator ratio → colour (empirical)
packages/render/src/observable/tokens.ts      named empirical presentation tokens
packages/render/src/observable/burette.ts     scale/contained/delivered state
packages/render/src/observable/curve.ts       state sequence → pH–volume points
packages/render/src/observable/species.ts     composition projection (micro view)
packages/render/src/observable/symbolic.ts    equilibrium expressions with substitutions
packages/render/src/observable/format.ts      display precision rules
packages/render/src/state/scene.ts            ObservableModel → RenderState
apps/web/src/composition.ts                   committed World → science → observable
apps/web/src/production-scenario.ts           deterministic authored M5 scenario
apps/web/src/App.tsx                          DOM adapter for composition evidence
```

The Scientific Core composition boundary creates the source-identified frame
with `projectScientificFrame(...)`; render consumes its structural output and
does not invent a second projection identity. Burette delivery aggregation uses
a deterministic compensated sum and only treats a full draw as exact when the
discrepancy is within its explicit floating-point round-off bound.

For replayable physical presentation, the genesis snapshot carries a hashed,
serializable `VolumeProfileSnapshot`. The frame owns the committed liquid
volume and profile hash; Observable receives the matching snapshot and
reconstructs its profile adapter internally, so it cannot accept a caller
supplied executable profile or a second liquid-volume source. Legacy
geometry-only persisted worlds require the explicit v3→v4 resolver boundary.

**No PixiJS import anywhere in this milestone.** Everything here runs in Node.
The production composition adds a deterministic local DOM inspection surface;
it does not claim the final M6 renderer or visual acceptance.

### Contracts changed

`ObservableModel`, `RenderState`, `ObservableModelVersion`, persisted vessel
volume-profile identity, and the ScientificFrame physical-input block.

### Implementation

1. `level.ts` consumes a vessel's published interior volume profile
   (`docs/visual/apparatus-standard.md` §1). Fixture vessels provide profiles.
2. `color.ts` consumes only the Scientific Core's already-computed
   `protonationRatio`. The equilibrium expression
   `m(In⁻)/m(HIn) = Ka_in · γ_HIn / (a_H · γ_In)` with `γ_HIn = 1`
   (`SPEC-0001` §Indicator model) is upstream scientific-contract context, not
   code to copy into render. Colour mixing between declared empirical acid-form
   and base-form endpoints has no threshold branch and imports no `Ka`,
   activity, or activity coefficient.
3. `burette.ts` derives three separate values from committed deliveries:
   `currentScaleReading = initialScaleReading + Σ delivered`,
   `deliveredVolume = Σ delivered`, and
   `containedVolume = initialContainedVolume − Σ delivered`. The scale reading
   is not the remaining liquid volume, and is displayed in `mL` at `0.01 mL`.
4. `curve.ts` takes a source-identified **state sequence**, not one hand-authored
   volume table; each point preserves its world replay identity and sequence.
5. `format.ts` enforces 2 decimal places for pH from the ±0.02 tolerance, and
    2 dp for the burette's `mL` scale reading from the instrument resolution. **This is where the
   `GOAL.md` §5.2 fake-precision rule is enforced**, so it needs a test.
5a. **Presentation convention (AC-V8).** Owner-decided 2026-09-11: the default
   view shows the taught quantity `−lg c(H⁺)` and **calls it pH**, because that
   is what the syllabus means by pH. A `科学模型` / "scientific model" affordance
   expands to show **activity-based model pH** (`−log₁₀ a(H⁺)`) with the note
   that high-school treatment uses the concentration approximation and that
   single-ion activity depends on a convention.

   Implement it as a **policy object**, the same discipline `ADR-0009` applies
   to ACE, so the default can be changed without touching anything outside the
   presentation layer (for the format/placement half) or `ScientificProjection`
   (for the value half).

   **What "labelled" means** — the owner's two requirements ("call it pH" and
   "no unlabelled pH anywhere") are only in tension if "labelled" is undefined.
   It means: the *model-pH* number always carries an explicit
   activity-model provenance label wherever it appears, and the two conventions
   never appear in the same view without a visible separator and a distinct
   label on each. It does **not** mean the taught quantity is captioned
   "approximately pH" — that would make the product unusable for its primary
   users. Non-negotiable in every configuration:

   | # | Requirement |
   |---|---|
   | 1 | Both quantities present in every state |
   | 2 | Model pH is never displayed without its activity-model label |
   | 3 | One convention per view; never mixed, never unseparated |
   | 4 | The taught quantity may be called "pH" — it is what the syllabus means |
   | 5 | **The two are never derived from each other**: `−lg c(H⁺)` comes from a genuine `c(H⁺)`, not from `−log₁₀ m(H⁺)` (defect P1-1) |
6. `symbolic.ts` presents schema-owned scientific expressions carrying model,
   version, and source-state identity. It may present the Henderson–Hasselbalch
   form **flagged `label: "shortcut"`** alongside the exact solve, but cannot
   author an untraceable exact expression.
7. Colour values come from a declarative indicator-identity palette catalogue;
   provenance-bearing empirical colour literals are allowed only in that
   catalogue, not in chemistry-specific branches or unlabelled transforms.
8. `toRenderState` receives a replaceable hydrogen-ion presentation policy and
   emits exactly one convention-specific pH readout per view.

### Tests and evidence

| Test | Proves |
|---|---|
| Colour varies continuously with the ratio; no discontinuity at any threshold | AC-V2 |
| Palette-boundary fixture: empirical colour literals are confined to the declared identity-keyed catalogue | AC-V3 |
| Liquid level calls `h(V)` and its `V(h)` inverse round-trips within the declared tolerance | AC-V4 |
| `currentScaleReading == initialScaleReading + Σ delivered`, while `containedVolume` remains separate; compensated full-draw boundary does not false-overdraw | Burette semantics / failure mode 14 |
| pH is formatted to exactly 2 dp and a scale reading such as 0.025 L is `25.00 mL` | AC-V6 |
| Observable output is a pure function: same input → deep-equal output, no DOM, no PixiJS | Testability of the whole layer |
| Curve points derive from a state sequence, not from a stored array | No pre-authored curves |
| Dependency-rule fixture: an equilibrium expression in `packages/render` fails the build | AC-V9 — the indicator ratio is a scientific output |
| DOM assertions: the taught quantity may be labelled plainly "pH"; model pH always carries its activity-model label; no view mixes the two | AC-V8 |
| Inspection copy/DOM assertion never calls model pH true/thermodynamic and names the IUPAC notional convention plus activity model | AC-V10 |
| Deterministic fixture/DOM assertion visibly qualifies results whose `withinProposedAccuracyEnvelope` is false | AC-V11 |

### Stop condition

The pure observable layer remains exercisable in Node with no browser, and the
deterministic web composition additionally proves the committed World →
Scientific Core → ScientificFrame → ObservableModel → DOM path. No chemistry
decision is made in the web adapter.

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
   coordinates in **millimetres (a length)**. Self-host everything; any font or
   texture is a bundled asset, never a runtime fetch (AC-P5).
2. **Every volumetric asset publishes `V(h)` and its inverse `h(V)`.** Assets
   without a profile are marked `non_volumetric` and accept approximate liquid
   level. `ObservableModel` obtains the level by calling `h(V)` — never by
   scaling a volume into a geometry axis.
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
**Addresses:** `SPEC-0001` §UX, AC-F2, AC-P2

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
| **Network capture over the full scripted session: no request leaves the device carrying learner data; only static assets are fetched** | AC-P2 — the first point at which a "full session" exists |

### Stop condition

A learner can produce a complete weak-acid titration curve from scratch, and the
curve came from the solver.

---

## M8 — Branch, replay, persistence

**Target stage:** S3
**Addresses:** ADR-0002, ADR-0005; `SPEC-0001` AC-R4, AC-R6, AC-R8, AC-R17, AC-P3, AC-P4

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
4. Export/import round-trip. Bundle carries `schemaVersion` and lineage ids; the
   resolved `solverConfig` is read from `events[0].payload`, not duplicated at
   the bundle top level. It contains no personal, device, or cross-session
   tracking identifiers and states whether learner evidence is included. v1
   carries `includesLearnerEvidence: false` and no learner-evidence payload.
5. Quota handling: estimate before writing; on a likely failure, warn and offer
   export. **A full store must not corrupt an existing world.**
6. Downgrade detection: a newer `schemaVersion` is refused with a clear message,
   never partially migrated.

### Tests and evidence

| Test | Proves |
|---|---|
| Fork, mutate child heavily, parent hash unchanged, in the browser | AC-R4 end to end |
| Reload the page; world replays to the same `replayHash` | Persistence |
| Export → import → identical `replayHash` | AC-R8 |
| Export bundle contains no personal/device/cross-session tracking identifier and declares evidence inclusion | AC-P4 |
| IndexedDB inspection: no identifier, name, or contact field in any store | AC-P3 |
| Replay under a mismatched solver version is refused; re-solve offered and labelled as a new world | AC-R6 |
| **Tier B**: with the creating solver version deliberately made unavailable, the world opens marked `re-solved`, keeps both provenance records, and does not overwrite the original | `ADR-0008` §2 |
| **Tier C**: with the model unsupported entirely, the world opens read-only, states why, and remains exportable | `ADR-0008` §2 |
| **Flattened branch export**: export a CHILD, delete the parent entirely, import on a clean profile, replay to an identical `replayHash` | AC-R17 — a suffix-only bundle is unreplayable |
| Export bundle contains no **personal, device, or cross-session tracking** identifier (world ids and lineage are required and permitted) | AC-P4 |
| Simulated quota exhaustion leaves existing worlds intact | No-corruption requirement |
| Migration failure leaves the world untouched and reports it | Loud, non-destructive failure |

**Before starting M8, the five open decisions in `ADR-0008` must be settled by
the owner** — in particular the solver version support window, which determines
how often Tier B is reached in practice.

### Stop condition

Two branches can be created and compared without the parent being affected, and
a world survives a reload with its replay hash intact.

---

## M9 — Minimal ACE

**Target stage:** S3
**Addresses:** `GOAL.md` §6.4, §8; `AGENTS.md` §12; `SPEC-0001` AC-A1..AC-A9

### Purpose

Implement one guided interaction that demonstrates the control loop, and — more
importantly — demonstrates the *restraint* the loop requires.

### Files and modules

```
packages/ace/src/evidence.ts       EvidenceModel: interaction -> EvidenceEvent | nothing
packages/ace/src/belief.ts         BeliefUpdater: belief over hypotheses, WITH uncertainty
packages/ace/src/intent.ts         InterventionIntent (plain data)
packages/ace/src/intervention.ts   InterventionPolicy
packages/ace/src/fade.ts           FadingPolicy (separate from intervention)
packages/ace/src/v0Policy.ts       aceV0Policy - the experimental configuration
packages/ace/src/store.ts          ACE-local persistence (separate DB)
apps/web/src/panels/predict.ts     prediction UI
apps/web/src/panels/contrast.ts    branch-based contrasting case
```

### Contracts changed

`EvidenceEvent`, the belief representation, `InterventionIntent`, `AcePolicy`.
**No world contract changes** — this milestone is a boundary test.

### Implementation

**Read `ADR-0009` first.** The four abstractions are the deliverable; the v0
numbers are not.

1. `EvidenceModel` is the **only** place the `GOAL.md` §8 evidence/noise rule
   lives, and it must be able to return **nothing**. A learner playing freely
   produces no learner inference by construction, not by a downstream filter.
2. `BeliefUpdater` returns a belief that can express **`unknown` as a first-class
   state**. If the type cannot say "I do not know which of these happened", the
   honest state after one wrong prediction cannot be stored and the system is
   forced to guess. No point estimates; no permanent labels (`GOAL.md` §8).
3. `InterventionPolicy` returns **data**, never a rendering action. Escalation:
   nothing → representation switch → contrasting branch → only on learner request
   or two consecutive same-signed errors. **No reachable path contains the
   correct answer.**
4. `FadingPolicy` is **separate** from intervention. v0: prompt on the first 5
   deliveries; after 3 consecutive in-tolerance predictions it becomes an opt-in
   toggle defaulting off.
5. **All of the above numbers live in `aceV0Policy`,** with a comment stating
   they are an unvalidated guess. Changing them must not touch the loop.
6. **Challenge mode: no intervention of any kind, fully usable.**
7. ACE reads world state; it never calls the solver for the learner and never
   writes to the world log.
8. **ACE emits `InterventionIntent` as plain data; `apps/web` maps it to UI.**
   `ace → render` and `ace → sci` are forbidden imports (`ADR-0001`). The app
   decides whether to honour an intent and may decline.

### What M9 does not claim

The slice proves the control loop exists and its boundaries hold. It does **not**
prove that any intervention improves learning, that the hypothesis set is correct
or complete, or that the fading schedule is appropriate. No learning-science
claim may be attached to this milestone (`GOAL.md` §5.8, `ADR-0009`).

### Tests and evidence

| Test | Proves |
|---|---|
| Prediction emits `PredictionRecorded` and `PredictionResolved` | AC-A1 |
| No ACE write ever reaches the world event log | AC-A2 |
| After one wrong prediction, ≥2 hypotheses remain with non-zero uncertainty | AC-A3 |
| 3 consecutive in-tolerance predictions flip the prompt to optional | AC-A4 |
| Challenge mode emits zero interventions and the flow completes | AC-A5 |
| Sandbox play (10 random deliveries, no prediction) produces zero learner inference | `GOAL.md` §8 low-information rule |
| No reachable `InterventionIntent` path contains the correct pH | AC-A8 — asserted structurally, not by review |
| `packages/ace` has no import path to `packages/render` or `packages/sci` | AC-A6, with a deliberate violation fixture |
| **Running the loop against a second, different `aceV0Policy` requires no code change** | AC-A7 — this is the test that proves the tuning values are data, not structure |
| `BeliefUpdater` retains an explicit `unknown` mass after one wrong prediction | AC-A9 |

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
5. **Promote the spikes, and record the decision for each.** A spike is not
   evidence once production code exists — the production test is. For each:

   | Spike | Action |
   |---|---|
   | `spikes/activity-equilibrium/` | Its reference cases become `packages/sci/test/reference/*.json` and its checks become package tests. **Keep the directory** as the derivation record for the tolerance table. |
   | `spikes/numeric-policy/` | Its checks become package tests (AC-S10, AC-R9, AC-R11, AC-U1/U2), **including the design guard that the wrong quantization strategy must fail.** Keep the directory as the measurement record. |
   | `spikes/solver-validation/` | **Superseded by M4 and already banner-marked.** Keep only as the origin record for the "references must not come from the code under test" rule. Do not cite it as scientific evidence. |

   **A spike result must never be the only evidence for an acceptance criterion**
   once the corresponding milestone has closed.
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
- **Run:** `pnpm generate:versions` after editing
  `contracts/version-manifest.json`; then `pnpm install`,
  `pnpm verify:versions`, `pnpm build`, `pnpm test`, `pnpm depcruise`,
  `uv sync`, `uv run pytest`.
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
