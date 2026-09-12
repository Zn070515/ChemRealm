# Persisted Schema v3 and Migration Namespace Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the persisted world/event schema version 3 without changing the meaning of schema version 2 in place, migrate legacy temperature units to canonical Kelvin, and separate Scenario authoring migrations from persisted migrations.

**Architecture:** `@chemrealm/schema` will expose independent world/event and authored-Scenario migration registries. The persisted migration chain will be `1 → 2 → 3`: v1 gains the explicit indicator block, then v2 temperature quantities are canonicalized to Kelvin. `WorldCreated` migration will re-hash the changed snapshot before parsing it. The authoring namespace will not silently reinterpret the removed `fullyDissociated` field; legacy records containing that field are refused by the current strict v3 schema unless an explicit, reviewed authoring migration is later added.

**Tech Stack:** TypeScript 5.9, Zod, Vitest, generated JSON Schema artifacts, pnpm workspaces, Markdown ADR/SPEC/evidence.

**Spec:** `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`, `docs/adr/0005-local-first-persistence.md`, `docs/adr/0011-scenario-scientific-input-freezing.md`.

## Global Constraints

- Persisted World/Event schema version 2 retains its old accepted shape; version 3 requires canonical snapshot temperature in Kelvin.
- Persisted migration is forward-only, loud on failure, and non-destructive.
- A migrated `WorldCreated` whose snapshot bytes change must receive a newly computed `contentHash`.
- Authoring Scenario shape versioning is independent from persisted world/event versioning.
- No migration may invent chemistry or silently preserve an ignored `fullyDissociated` assertion.
- World Runtime remains synchronous and chemistry-free; migration only normalizes serialized contract data.
- M4 remains S2; REF-1…REF-10, PHREEQC execution, and cross-engine validation are out of scope.
- Work directly in the shared tree and finish with verification, commit, and push to `main`; no PR or worktree.

---

### Task 1: Define the persisted v3 migration chain

**Files:**
- Modify: `packages/schema/src/world.ts`, `packages/schema/src/migrate.ts`.
- Modify: `packages/world/src/state.ts`, `packages/world/src/state.test.ts`.
- Modify: persisted fixtures/tests under `packages/world/src`, `packages/world/test`, and `packages/schema/src/contracts.test.ts`.
- Regenerate: `packages/schema/json-schema/*.json` as affected.

**Interfaces:**
- `CURRENT_SCHEMA_VERSION` becomes `3` for persisted world/event/state/export contracts.
- The persisted migration registry exports an explicit name such as `WORLD_MIGRATIONS` and `migrateWorld(record, targetVersion)`.
- `1 → 2` adds `indicators: []` where the legacy snapshot has no indicator block.
- `2 → 3` canonicalizes every persisted `scenarioSnapshot.modelRequirements.temperature` from a valid temperature quantity to `{ value, unit: "K" }`, without modifying unrelated quantities.

- [x] **Step 1: Write failing v3 contract and migration tests.**

  Add tests that:

  ```ts
  expect(CURRENT_SCHEMA_VERSION).toBe(3);
  expect(WorldCreatedSchema.safeParse({ ...v2World, schemaVersion: 2 })).toBe(false);
  expect(migrateWorld({ ...v2World, schemaVersion: 2 }, 3)).toMatchObject({
    status: "OK",
    applied: [3],
  });
  ```

  The v2 fixture must contain `scenarioSnapshot.modelRequirements.temperature = { value: 25, unit: "degC" }`; after migration it must contain `298.15 K`, have schema version `3`, and parse as `WorldCreated`.

- [x] **Step 2: Run the focused tests and observe RED.**

  Run:

  ```text
  pnpm exec vitest run packages/schema/src/contracts.test.ts packages/world/src/state.test.ts packages/world/src/log.test.ts
  ```

  Expected failures: the current schema still declares version 2, the migration target has no `2 → 3` path, and the v2 non-canonical snapshot is rejected without a migration route.

- [x] **Step 3: Implement the minimal persisted version bump and chain.**

  Set `CURRENT_SCHEMA_VERSION = 3`. Refactor the migration implementation so it does not hard-code nested event version `2`; each persisted migration step must set the event envelope to its destination version. Keep the existing v1 indicator migration as `1 → 2`, add a `2 → 3` step that clones the record and canonicalizes nested snapshot temperatures with the shared quantity conversion (`toCanonical`), and preserve all other data byte-for-byte except the required version fields and derived hash handled by World Runtime.

  Do not make `migrateWorld` process authored Scenario records as a generic convenience. Its traversal is for persisted world/event containers only.

- [x] **Step 4: Make `migrateWorldCreated()` target v3 and rebuild the checksum.**

  Update `packages/world/src/state.ts` to use the renamed persisted migration API and `CURRENT_SCHEMA_VERSION`. If any migration was applied, recompute `payload.contentHash` from the migrated snapshot before `WorldCreatedSchema.parse()`. Update all current persisted fixtures and state/event assertions to version 3.

- [x] **Step 5: Verify persisted v1→v2→v3 and round-trip behavior.**

  Add an end-to-end test for a legacy v2 `WorldCreated` with `25 degC`:

  ```text
  legacy v2 event accepted by the legacy fixture shape
      ↓ migrateWorldCreated
  current v3 event with 298.15 K
      ↓ createInitialState / replay
  valid state; contentHash == scenarioSnapshotHash(migrated snapshot)
  ```

  Also assert the original legacy object is unchanged, a future version is refused, and a broken chain is loud. Run focused tests, `pnpm typecheck`, and `pnpm emit:schema`.

---

### Task 2: Separate authoring Scenario migrations from persisted migrations

**Files:**
- Create: `packages/schema/src/scenario-migrate.ts`.
- Modify: `packages/schema/src/index.ts`, `packages/schema/src/content.ts`.
- Modify: `packages/schema/src/contracts.test.ts`, `tools/oracle/tests/test_json_schema_contract.py` if authoring fixtures need explicit version assertions.
- Modify: `docs/adr/0005-local-first-persistence.md`, `docs/adr/0011-scenario-scientific-input-freezing.md`, and current SPEC/PLAN wording.

**Interfaces:**
- `SCENARIO_SCHEMA_VERSION` remains `3` and is never compared against `CURRENT_SCHEMA_VERSION`.
- `SCENARIO_MIGRATIONS` is a separate registry; its public entry point is `migrateScenario(record, targetVersion)`.
- Current authoring v3 has no `fullyDissociated`. Legacy authoring records with that field are rejected as incompatible/unsupported rather than silently deleting a user-authored scientific assertion.
- There is no test named “migrates a v1 authored scenario” that calls the persisted migration API.

- [x] **Step 1: Add failing namespace tests.**

  Replace the misleading authored-scenario migration test with tests that prove:

  ```ts
  expect(migrateWorld({ schemaVersion: 1, scenarioRef: "authoring" }, 3)).toBe(...);
  expect(migrateScenario({ schemaVersion: 1, ...legacyScenario }, SCENARIO_SCHEMA_VERSION))...
  expect(migrateScenario({ schemaVersion: 2, fullyDissociated: true, ... }, 3)).toMatchObject({ status: "NO_PATH" });
  ```

  The exact result for legacy authoring with the removed field must be an explicit refusal, and the test must show that no world migration can make it look like a current Scenario.

- [x] **Step 2: Run tests and confirm the old namespace is exposed.**

  Run:

  ```text
  pnpm exec vitest run packages/schema/src/contracts.test.ts
  ```

  Expected RED until the separate `migrateScenario` API exists and the old generic authored test is removed.

- [x] **Step 3: Implement the independent authoring migration boundary.**

  Move only authoring-specific structural helpers into `scenario-migrate.ts`. If no reviewed authoring path exists for the removed field, expose an empty/explicitly unsupported `SCENARIO_MIGRATIONS` chain and return `NO_PATH` for v2→v3 rather than deleting the field. Keep strict `ScenarioSchema` as the final validator.

  Update imports so World Runtime only imports the persisted migration function. Do not add a compatibility alias that lets callers unknowingly use one namespace for another.

- [x] **Step 4: Verify namespace and schema-version separation.**

  Assert the generated Scenario artifact has `schemaVersion: 3`, persisted world/event artifacts have `schemaVersion: 3`, and tests use the correct constant in each namespace. Run `pnpm typecheck:tests`, focused schema tests, Python artifact tests, and `pnpm verify:schema-artifacts`.

---

### Task 3: Reconcile contracts, documentation, and evidence

**Files:**
- Modify: `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`.
- Modify: `docs/adr/0005-local-first-persistence.md`, `docs/adr/0011-scenario-scientific-input-freezing.md`.
- Modify: `docs/plans/PLAN-0001-world-foundation-acid-base-titration.md`, `docs/evidence/M4.md`, and the current closure evidence packet.
- Modify: `tools/check_m4_contract_consistency.mjs` if a hard assertion is needed.

**Interfaces:**
- Persisted rollout is `v1 → v2 → v3`, with v2 temperature units canonicalized in the `2 → 3` step and `contentHash` rebuilt.
- Authoring Scenario shape version 3 is a separate namespace and has no promised migration for the removed dissociation field unless explicitly implemented and tested.
- Scientific wire schema remains independently versioned and must not be described as the persisted world/event version.
- M4 evidence remains S2; no REF/PHREEQC result is claimed by this remediation.

- [x] **Step 1: Add documentation assertions before editing prose.**

  Extend the contract consistency check or tests so it fails when current docs claim persisted v2 accepts non-canonical snapshot temperature, when migration docs say authored Scenario uses `CURRENT_SCHEMA_VERSION`, or when current scientific schema prose says the present version is 2 instead of recording v2 as the historical diagnostic change and v3 as current.

- [x] **Step 2: Update SPEC/ADR/PLAN/evidence to the actual version domains.**

  Record the v3 amendment, the exact migration path, checksum rebuild rule, and explicit authoring migration policy. Remove all wording that treats `migrate()` as a universal migration namespace or says the current persisted version is 2.

- [x] **Step 3: Verify documentation and acceptance coverage.**

  Run `pnpm verify:m4-contracts` and `uv run python tools/check_acceptance_coverage.py`; confirm REF-1…REF-10 and PHREEQC remain `NOT RUN`.

---

### Task 4: Full verification and direct integration

**Files:**
- Modify: this plan and the migration evidence packet with final reproducibility data.

- [x] **Step 1: Run the full local gate.**

  Run `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm typecheck:tests`, `pnpm build`, `pnpm test`, `pnpm verify:guarantees`, `pnpm verify:schema-artifacts`, `pnpm depcruise`, `pnpm guards`, `pnpm verify:scientific-math`, `pnpm verify:m4-contracts`, `pnpm verify:world`, `pnpm artifacts`, `pnpm lint`, `pnpm test:browser`, `uv sync`, `uv run pytest`, and `uv run python tools/check_acceptance_coverage.py`. All must exit zero.

- [x] **Step 2: Run the migration-specific reproductions.**

  Verify all of the following:

  ```text
  v2 persisted WorldCreated + 25 degC → v3 + 298.15 K + rebuilt hash + replayable
  v1 persisted WorldCreated → v2 indicators [] → v3 canonical temperature
  v2 authoring/removed dissociation field → explicit authoring refusal, not silent rewrite
  current Scenario v3 and persisted World/Event v3 use separate constants/registries
  ```

- [ ] **Step 3: Review, commit, and push.**

  Run `git diff --check`, inspect staged diff/status, commit `Migrate persisted worlds to schema v3`, then push `main` directly without force-push or pull request.

- [ ] **Step 4: Handoff.**

  Record the pushed commit, hosted CI run, exact test commands, current gate, and remaining REF/PHREEQC work. Do not promote M4 to S3.

## Acceptance Matrix

| Criterion | Result | Evidence |
|---|---|---|
| Persisted v2 remains historically valid and is not redefined in place | PASS locally | v2 fixture plus v3 schema/migration tests |
| Persisted v2 temperature migrates to canonical v3 Kelvin | PASS locally | `migrateWorldCreated` regression and rebuilt content hash |
| Persisted v1→v2→v3 chain is forward-only and non-destructive | PASS locally | migration chain/future/broken-chain tests |
| Authored Scenario and persisted World/Event namespaces are separate | PASS locally | `migrateScenario` vs `migrateWorld` tests and version assertions |
| Removed `fullyDissociated` is not silently reinterpreted | PASS locally | strict v3 authoring rejection and explicit migration refusal |
| REF-1…REF-10 and PHREEQC oracle execution | NOT RUN | Explicitly deferred to subsequent M4 work |
