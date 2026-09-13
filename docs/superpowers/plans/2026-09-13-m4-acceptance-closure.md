# M4 Scientific Acceptance Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining M4 scientific acceptance gaps with reproducible world/science conservation, numerical-domain, provenance, and PHREEQC attribution evidence without changing the M4 model boundary.

**Architecture:** The Scientific Reality Core owns acid-base residual diagnostics, validity flags, model constants, and component-to-conserved-total composition. The World Runtime remains chemistry-agnostic; an apps/web composition test will exercise its event stream and project component inventories through the scientific model declaration. Oracle tooling remains test-only and reports controlled attribution evidence without averaging engines.

**Tech Stack:** TypeScript, Vitest, Python 3.12, pytest, checked-in JSON fixtures, PHREEQC 3.8.6-17100, Markdown evidence and JSON provenance records.

**Spec:** `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`; `docs/superpowers/specs/2026-09-12-m4-acid-base-engine-design.md`; `docs/adr/0012-m4-domain-and-constant-semantics.md`.

## Global Constraints

- M4 remains S2 until every required scientific criterion and owner decision is explicitly verified.
- World Runtime remains synchronous, pure, and independent of `@chemrealm/sci`.
- All equilibrium calculations remain on reduced molality and use the pinned Davies domain `I_m <= 0.5 mol/kg`.
- `stateHash`/semantic replay identity and exact cache integrity remain separate contracts.
- PHREEQC is an independent test oracle; disagreement is reported, never averaged or hidden.
- M5 presentation criteria AC-V10/AC-V11 remain deferred and are not implemented here.
- The v0 stock inputs used by acceptance evidence are read from
  `docs/research/v0-scientific-inputs.json`; tests must not maintain a second
  scientific-input catalog.

### Task 1: Add the failing M4 integration and domain acceptance tests

**Files:**
- Create: `apps/web/src/m4-acceptance.test.ts`
- Modify: `packages/sci/src/acidbase/adapter.test.ts`
- Modify: `packages/sci/src/acidbase/solve.test.ts`

**Interfaces:**
- Consumes: `createWorldFromScenario`, `emitCommand`, `reduce`, `ACID_BASE_COMPONENT_CATALOG`, `createAcidBaseAdapter`, and the proposed `evaluateOuterResidual` test diagnostic.
- Produces: executable evidence for AC-S3, AC-S11, AC-S13, and AC-S14.

- [x] **Step 1: Write tests for 100-transfer component/element conservation, residual monotonicity, the 0.15/0.30 envelope flag, and the 0.1002 scenario maximum.**
- [x] **Step 2: Run the targeted tests and confirm each missing behavior fails for the expected reason.**
- [x] **Step 3: Implement only the smallest Scientific Core diagnostic/export needed for the tests; do not import sci into world.**
- [x] **Step 4: Run the targeted suites and record measured maxima in the evidence packet.**

### Task 2: Make scientific constant and indicator provenance evidence complete

**Files:**
- Modify: `docs/research/constants-provenance.md`
- Modify: `docs/research/constants-provenance.json`
- Create: `docs/research/v0-scientific-inputs.json`
- Create: `docs/research/v0-scientific-inputs.md`
- Modify: `tools/oracle/tests/test_constants_provenance.py`
- Modify: `packages/world/test/fixtures.ts`

**Interfaces:**
- Consumes: the current fixed solver identity and scenario-frozen phenolphthalein datum.
- Produces: citable primary-source records, source precision/uncertainty propagation, and machine-checked solver, indicator, and v0 material provenance for AC-S7/AC-S16.

- [x] **Step 1: Add the failing provenance assertions for indicator records and remove the provisional-source allowance from the fixture.**
- [x] **Step 2: Run the Python provenance tests and confirm the new assertions fail before the record is added.**
- [x] **Step 3: Add primary-source citations, logarithmic derivation metadata, and the exact fixture provenance.**
- [x] **Step 4: Run provenance tests and inspect the rendered record for approximation/source distinctions.**
- [x] **Step 5: Make AC-S14 consume the same manifest and require both v0 scenario families and every equivalent factor.**

### Task 3: Produce explicit PHREEQC attribution disposition

**Files:**
- Modify: `tools/oracle/reference/run_m4_validation.py`
- Modify: `tools/oracle/tests/test_cross_check.py`
- Modify: `docs/research/m4-phreeqc-offset-investigation.md`
- Regenerate: `docs/evidence/M4-oracle-sweep-report.json`

**Interfaces:**
- Consumes: the pinned ORACLE namespace and PHREEQC runner identity.
- Produces: a signed-difference report plus controlled-factor disposition that states what is and is not isolated.

- [x] **Step 1: Add failing report assertions for controlled attribution status, signed offset summary, and an explicit non-equivalence disposition.**
- [x] **Step 2: Run the report tests and observe the missing attribution disposition.**
- [x] **Step 3: Add only evidence-backed attribution metadata; do not claim a causal factor without a controlled run.**
- [ ] **Step 4: Run the pinned PHREEQC validation and Python report tests.** The Python report tests pass locally; the pinned executable is CI-installed and is not present in this Windows working tree, so the hosted required run remains the attestation boundary.

### Task 4: Close M4 evidence and governance without claiming M5

**Files:**
- Modify: `docs/evidence/M4.md`
- Modify: `docs/plans/PLAN-0001-world-foundation-acid-base-titration.md`
- Modify: `docs/superpowers/specs/2026-09-12-m4-acid-base-engine-design.md`
- Modify: `docs/research/m4-evidence-integrity.md`
- Create: `tools/check_scientific_quantity_boundary.mjs`
- Modify: `tools/check_acceptance_coverage.py`
- Modify: `package.json`, `.github/workflows/ci.yml`
- Modify: `docs/adr/README.md`

**Interfaces:**
- Consumes: actual test/report outputs from Tasks 1–3.
- Produces: one-row-per-criterion evidence mapping, no stale status claims, explicit limitations, and an honest S2 or owner-approved S3 handoff.

- [x] **Step 1: Update evidence rows only from completed commands and measured artifacts.**
- [x] **Step 2: Run acceptance coverage and M4 consistency checks to catch stale or duplicated claims.**
- [x] **Step 2a: Add a criterion-specific scientific quantity boundary guard and state that mapping coverage does not prove semantic sufficiency.**
- [x] **Step 3: Run the complete local gate, inspect the diff and generated artifacts, then commit and push the round.**

## Stop/Go Conditions

- Stop and leave M4 at S2 if a criterion lacks a reproducible artifact, PHREEQC identity is unavailable, or any result is outside its stated tolerance.
- Stop if a test passes without first demonstrating the missing behavior or if a report changes acceptance IDs rather than adding evidence.
- Go only when the evidence packet names exact commands, fixture IDs, measured maxima, and the remaining owner verdicts without inflating the stage.
