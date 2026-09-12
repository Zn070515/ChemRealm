# M4 Cross-System Compatibility Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining cross-system and domain-boundary defects before M4 reference cases and PHREEQC execution begin.

**Architecture:** The composition root derives actual input component requirements from the resolved scenario and passes them as resolver context; authored content carries component identity but not chemistry semantics. The Scientific Reality Core owns component catalog semantics and performs all Davies calculations strictly within the declared ionic-strength domain. Scenario resolution canonicalizes every persisted quantity, including temperature, before hashing genesis truth.

**Tech Stack:** TypeScript 5.9, Zod, Vitest, generated JSON Schema artifacts, pnpm workspaces, Markdown SPEC/ADR/evidence documents, Python JSON Schema tests.

**Spec:** `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`, `docs/superpowers/specs/2026-09-12-m4-acid-base-engine-design.md`, `docs/adr/0003-scientific-solver-adapter-boundary.md`, `docs/adr/0012-m4-domain-and-constant-semantics.md`.

## Global Constraints

- World Runtime remains synchronous, deterministic, and chemistry-free.
- New-world creation accepts authored `Scenario` only; it resolves a canonical snapshot before emitting `WorldCreated`.
- `SolverRequirements` remains a model constraint and does not gain a manually authored component list.
- Actual scenario components are derived once from the resolved snapshot and participate in solver selection before genesis.
- `fullyDissociated` is not authored content truth; component identity and chemistry mode are owned by the Scientific Reality Core catalog.
- Davies activity evaluation must never receive an ionic strength above the model's declared `0.5 mol/kg` domain.
- M4 remains S2 during this remediation; REF-1…REF-10, PHREEQC installation/execution, and cross-engine acceptance remain out of scope.
- Every production behavior change follows RED → GREEN → REFACTOR with a targeted regression test.
- Work directly in the shared tree; complete work is verified, committed, and pushed to `main` without a pull request.

## Review checklist before coding

- User/system problem: a scenario can currently select a solver without proving that its actual material components are accepted; authoring contains a silently ignored chemistry field; equivalent temperatures hash differently; and the solver probes Davies outside its declared domain.
- Scope: this is a cross-system boundary closure required before independent scientific references, not a new chemistry feature.
- Owning cores: composition root for scenario-to-genesis compatibility; schema for authoring contract; Scientific Reality Core for catalog and numerical domain; evidence/docs for contract truth.
- Persistent changes: authoring schema removes `fullyDissociated`; scenario schema version must be versioned separately from world event schema; resolved snapshots canonicalize temperature. No existing `WorldCreated` payload gains a new solver source.
- Privacy: no change; no network, account, telemetry, or learner data is introduced.
- Evidence: component mismatch must reject genesis; old authoring field must be refused; `25 degC` and `298.15 K` must produce identical snapshots/hashes; no-Davies-extrapolation boundary tests must pass; REF/PHREEQC must remain explicitly NOT RUN.

---

### Task 1: Bind actual scenario components into solver resolution

**Files:**
- Modify: `packages/sci/src/registry.ts`, `packages/sci/src/registry.test.ts`.
- Modify: `apps/web/src/world-creation.ts`, `apps/web/src/world-creation.test.ts`.
- Modify: `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`, `docs/adr/0003-scientific-solver-adapter-boundary.md` if required by the exact API wording.

**Interfaces:**
- Add a resolver-only context such as `SolverResolutionContext { requiredComponents: readonly string[] }`; it is derived by the composition root and is not serialized in `ModelRequirements`.
- `checkModelCompatibility(requirements, model, context?)` checks `requiredComponents ⊆ model.validity.components` and reports every missing component.
- `SolverRegistry.resolve(requirements, context?)` and `SolverResolver.resolve(requirements, context?)` pass that context through all candidate checks.

- [x] **Step 1: Write the failing regression.** Clone the valid authored scenario, change its material solute to `HNO3`, keep `modelRequirements.species = ["H+"]`, and use a solver descriptor whose components contain only `HCl`. Assert `createWorld()` returns `{ accepted: false, status: "incompatible" }`, contains `HNO3` in the reason, and exposes no `event`. Add a direct registry test proving component context rejects the adapter while species-only resolution remains unchanged when no context is supplied.

- [x] **Step 2: Run the focused tests and observe RED.** Run:

```text
pnpm exec vitest run apps/web/src/world-creation.test.ts packages/sci/src/registry.test.ts
```

Expected: the forged HNO3 scenario is currently accepted because resolver checks only species/temperature/solvent/phase.

- [x] **Step 3: Implement the smallest boundary change.** Derive sorted unique component IDs from `snapshot.materials[].composition[].soluteId` after `resolveScenario()`. Pass them as resolver context before constructing `WorldCreated`. Include missing component IDs in the incompatible reason. Do not add `components` to authored or persisted `ModelRequirements`, and do not import Scientific Core into World Runtime.

- [x] **Step 4: Verify GREEN and regression.** Re-run the focused tests, then `pnpm typecheck`, `pnpm test`, and `pnpm depcruise`. Stop if a solver can still emit `WorldCreated` for a component absent from its model descriptor.

---

### Task 2: Remove the ignored `fullyDissociated` authoring field

**Files:**
- Modify: `packages/schema/src/content.ts`, `packages/schema/src/contracts.test.ts`.
- Modify all TypeScript/Python fixtures found by `rg -n "fullyDissociated"`.
- Regenerate: `packages/schema/json-schema/scenario.schema.json` and any artifact whose version metadata changes.
- Modify: `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`, `docs/superpowers/specs/2026-09-12-m4-acid-base-engine-design.md`, and current M4 evidence.

**Interfaces:**
- `MaterialDefinition` carries `soluteId`, basis, quantity, molar mass, and datum provenance; it does not declare dissociation mode.
- Scientific Core catalog remains the only owner of component mode/stoichiometric contributions.
- Introduce `SCENARIO_SCHEMA_VERSION` distinct from `CURRENT_SCHEMA_VERSION`, bump the authoring Scenario shape version for this incompatible field removal, and keep world event schema versioning unchanged. Existing legacy authored records with the removed field must fail rather than silently change chemistry.

- [x] **Step 1: Write the failing contract tests.** Add a TypeScript and Python artifact test showing a scenario with `fullyDissociated` is rejected as an unknown key. Update valid fixtures only after the RED test exists. Add a test/documentation assertion that the content schema does not contain the field and the catalog still defines modes for `HCl`, `NaOH`, `HOAc`, and `NaOAc`.

- [x] **Step 2: Run the focused schema tests and observe RED.** Run:

```text
pnpm exec vitest run packages/schema/src/contracts.test.ts apps/web/src/world-creation.test.ts
uv run pytest tools/oracle/tests/test_json_schema_contract.py
```

Expected: the old field is accepted by the current authoring schema and current fixtures still depend on it.

- [x] **Step 3: Remove the field and version the authoring shape.** Delete `fullyDissociated` from both basis-specific schemas, update comments to state that chemistry mode is catalog-owned, add the separate scenario schema version constant, and update all fixtures/content examples to the new version. Do not add a resolver default and do not copy mode into `ScenarioSnapshot`.

- [x] **Step 4: Regenerate and verify.** Run `pnpm emit:schema`, focused TypeScript/Python tests, `pnpm verify:schema-artifacts`, and `pnpm typecheck:tests`. Confirm the generated artifact rejects the removed field and no production code reads it.

---

### Task 3: Canonicalize model requirement temperature at scenario resolution

**Files:**
- Modify: `apps/web/src/world-creation.ts`, `apps/web/src/world-creation.test.ts`.
- Modify: `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md` if the canonical snapshot rule needs explicit wording.

**Interfaces:**
- `resolveScenario()` writes `ScenarioSnapshot.modelRequirements.temperature` as `{ value: Kelvin, unit: "K" }` using the shared `toCanonical()` bridge.
- `ScenarioSnapshot` remains self-contained and `scenarioSnapshotHash()` sees only canonical temperature representation.

- [x] **Step 1: Write the failing equivalent-temperature assertion.** Extend the existing equivalent-authoring-unit test with one scenario using `25 degC` and another using `298.15 K`; assert the resolved snapshots and `scenarioSnapshotHash()` values are equal.

- [x] **Step 2: Run the focused web tests and observe RED.** Run:

```text
pnpm exec vitest run apps/web/src/world-creation.test.ts
```

Expected: the resolved snapshots differ because the current resolver copies the temperature quantity unchanged.

- [x] **Step 3: Canonicalize and keep the bridge single-owned.** Convert the authored temperature through `toCanonical()`, round only conversion noise using the existing resolver normalization policy, and construct the Kelvin quantity. Do not change `parseSolverRequirements()` into a second snapshot normalization path.

- [x] **Step 4: Verify.** Re-run focused tests, `pnpm test`, `pnpm typecheck`, and `pnpm verify:schema-artifacts`.

---

### Task 4: Remove Davies extrapolation from boundary classification

**Files:**
- Modify: `packages/sci/src/acidbase/solve.ts`, `packages/sci/src/acidbase/solve.test.ts`, `packages/sci/src/acidbase/adapter.test.ts`.
- Modify: `docs/adr/0012-m4-domain-and-constant-semantics.md` and M4 design only to describe the resulting boundary algorithm.

**Interfaces:**
- `solveInner()` evaluates Davies only on `0 <= I <= IONIC_STRENGTH_UPPER`.
- A fixed-point residual at the exact upper boundary may classify an infinitesimal boundary crossing without evaluating any `I > 0.5` chemistry.
- Explicitly established fixed-point roots above the declared domain return internal `OUT_OF_DOMAIN`; ordinary bracket/iteration failures remain `NOT_CONVERGED`.

- [x] **Step 1: Write boundary and no-extrapolation tests.** Add exact `0.5 mol/kg` HCl and NaOH tests if needed, retain `0.49` success tests, and add a test fixture that proves the inner upper evaluation is exactly `0.5` rather than the old `1.25` exploratory bound. The exact boundary cases must classify from a converged/established boundary result as `MODEL_OUT_OF_DOMAIN`, never `NOT_CONVERGED`.

- [x] **Step 2: Run the scientific focused tests and observe RED.** Run:

```text
pnpm exec vitest run packages/sci/src/acidbase/solve.test.ts packages/sci/src/acidbase/adapter.test.ts
```

Expected: the current solver still declares and uses `EXPLORATORY_IONIC_STRENGTH_UPPER = 1.25`.

- [x] **Step 3: Implement domain-bounded inner solving.** Remove the exploratory upper bound and boundary probe. Evaluate the fixed-point function at `I=0.5` only. If the fixed-point residual establishes the root above the limit, return `OUT_OF_DOMAIN`; if a candidate is within the boundary tolerance, retain the boundary candidate and let the final recomputed-I check classify exact `0.5` cases. Update outer bracketing so a domain refusal is not converted into a bracket failure when the boundary proves the root is outside.

- [x] **Step 4: Verify no scientific extrapolation.** Re-run focused tests and inspect the solver source/guard for any `daviesActivities()` call with an upper argument above the descriptor domain. Run `pnpm verify:scientific-math`, `pnpm verify:m4-contracts`, and `pnpm test`.

---

### Task 5: Reconcile contract/evidence documents

**Files:**
- Modify: `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`, `docs/superpowers/specs/2026-09-12-m4-acid-base-engine-design.md`, `docs/adr/0012-m4-domain-and-constant-semantics.md`, `docs/evidence/M4.md`.
- Modify: `tools/check_m4_contract_consistency.mjs` if the new component-resolution or scenario-version assertions need a hard gate.
- Create/modify: `docs/evidence/m4-cross-system-closure.md`.

**Interfaces:**
- Documents state that component compatibility is derived from resolved scenario data before `WorldCreated`.
- Documents state that authored dissociation flags do not exist; the catalog owns model semantics.
- Documents state that canonical snapshot temperature is Kelvin.
- M4 evidence remains S2 and says REF/PHREEQC are not run.

- [x] **Step 1: Add documentation/guard tests first.** Extend the consistency check or its test fixture to fail if M4 docs claim a manually authored `fullyDissociated` field, a resolver that checks only species, or Davies exploratory chemistry above `0.5`.

- [x] **Step 2: Reconcile without promoting M4.** Update the relevant contract prose and add a closure packet with a binary matrix for component compatibility, removed field, temperature normalization, and domain-bounded activity evaluation. Keep ADR-0012 Proposed until reference/oracle evidence is complete.

- [x] **Step 3: Verify document/evidence consistency.** Run `pnpm verify:m4-contracts` and `uv run python tools/check_acceptance_coverage.py`; confirm no REF/PHREEQC result is claimed.

---

### Task 6: Full verification and direct integration

**Files:**
- Modify: this plan and the closure evidence packet with final reproducibility data.

- [x] **Step 1: Run the full local gate.** Run `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm typecheck:tests`, `pnpm build`, `pnpm test`, `pnpm verify:guarantees`, `pnpm verify:schema-artifacts`, `pnpm depcruise`, `pnpm guards`, `pnpm verify:scientific-math`, `pnpm verify:m4-contracts`, `pnpm verify:world`, `pnpm artifacts`, `pnpm lint`, `pnpm test:browser`, `uv sync`, `uv run pytest`, and `uv run python tools/check_acceptance_coverage.py`. All must exit zero; REF/PHREEQC remain explicitly unexecuted.

- [x] **Step 2: Run original audit reproductions.** Confirm an HNO3 scenario cannot emit `WorldCreated` for the HCl-only model, old dissociation fields are refused, equivalent Celsius/Kelvin snapshots have equal hashes, `0.49` cases solve, and exact `0.5` cases return domain refusal without an extrapolated Davies evaluation.

- [x] **Step 3: Review and commit.** Run `git diff --check`, inspect staged diff/status, commit `Close M4 cross-system compatibility gaps before references`, and push `main` directly without force-push or pull request. Baseline: `fce95dad513e40ee07fc748dc608281a7a338337`.

- [x] **Step 4: Handoff.** Report current gate, exact local commands/counts, pushed commit and hosted CI state, remaining REF/PHREEQC work, and any unresolved owner decision. Do not label M4 S3 until independent scientific evidence is complete. Hosted CI: `34703646857` success; REF/PHREEQC remain not run.

## Acceptance matrix

| Criterion | Result | Evidence |
|---|---|---|
| Actual resolved scenario components constrain solver selection before genesis | PASS | World-creation and registry negative tests |
| `fullyDissociated` cannot be authored or silently ignored | PASS | TypeScript/Python strict schema rejection and catalog ownership test |
| Equivalent temperature units yield identical canonical snapshots/hashes | PASS | Resolver equivalence test and canonical persisted-snapshot schema |
| Davies is never evaluated above `I=0.5 mol/kg` | PASS | Solver boundary test and source/guard inspection |
| REF-1…REF-10 and PHREEQC oracle execution | NOT RUN | Explicitly deferred to the next M4 work |
