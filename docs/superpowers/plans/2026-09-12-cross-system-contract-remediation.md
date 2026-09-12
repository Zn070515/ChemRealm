# Cross-System Contract Remediation Implementation Plan

> For agentic workers: use the executing-plans or subagent-driven-development skill to implement this plan task by task. Steps use checkbox syntax for tracking.

**Goal:** Close the cross-system contract gaps found before M4 reference validation so authored content, genesis events, world runtime, solver adapters, and evidence share one executable contract.

**Architecture:** packages/schema remains the wire-contract authority; packages/sci owns scientific identity and result validation; packages/world remains synchronous and chemistry-agnostic; apps/web owns authored-content resolution and solver selection. This round prepares M4 reference execution but does not start REF-1 through REF-10 or claim PHREEQC evidence.

**Tech Stack:** TypeScript 5.9, Zod 4, Vitest 3, pnpm, Python 3.12/pytest, committed JSON Schema artifacts.

**Spec:** docs/specs/SPEC-0001-world-foundation-acid-base-titration.md, docs/superpowers/specs/2026-09-12-m4-acid-base-engine-design.md, AGENTS.md, docs/adr/0011-scenario-scientific-input-freezing.md, and docs/adr/0012-m4-domain-and-constant-semantics.md.

## Global Constraints

- Preserve the four-core boundary. World Runtime must not import Scientific Core; authored resolution belongs in the composition root.
- Preserve v0 chemistry: HCl, NaOH, HOAc, and NaOAc components; one common acetate family; Kw = a_H · a_OH; unit water-activity convention.
- Every serialized quantity carries a dimension-valid unit; resolved genesis quantities use canonical units.
- Solver lookup remains exact by id plus version; adapter/model/config identity is immutable and result provenance must match it.
- World reduction remains synchronous, deterministic, append-only, replayable, and independent of asynchronous solving.
- No REF fixture or PHREEQC acceptance claim is added in this remediation round.
- Work directly in the shared tree; do not create a worktree or pull request. At completion, verify, inspect, commit, and push the current branch.

---

### Task 1: Separate required equilibrium species from accepted input components

Files:
- Modify packages/schema/src/scientific.ts, packages/sci/src/identity.ts, packages/sci/src/registry.ts, packages/sci/src/acidbase/model.ts, packages/sci/src/acidbase/index.ts, packages/sci/src/stub.ts.
- Modify descriptor fixtures in packages/sci/src tests and apps/web tests.
- Modify packages/sci/src/registry.test.ts, packages/sci/src/acidbase/model.test.ts, packages/sci/src/acidbase/adapter.test.ts.
- Regenerate packages/schema/json-schema.

Interfaces:
- ModelRequirements.species means required equilibrium species.
- ModelValidity.species means equilibrium species emitted or covered by the model.
- ModelValidity.components means accepted SolveRequest.soluteId component identities.

- [x] Step 1: Write failing tests. Register the production acid-base adapter and parse the existing world fixture requirements H2O, H+, OH-, Cl-, Na+; expect compatible resolution. Add a request test proving HCl is accepted as an input component even though it is not an equilibrium species.
- [x] Step 2: Run pnpm exec vitest run packages/sci/src/registry.test.ts packages/sci/src/acidbase/adapter.test.ts and confirm failure because one array currently serves both meanings.
- [x] Step 3: Add required components to ModelValidity and its DTO bridge. Keep species as equilibrium species. For the acid-base model use components HCl, NaOH, HOAc, NaOAc and species H2O, H+, OH-, HOAc, OAc-, Na+, Cl-. Registry compares requirements against validity.species; acid-base and stub request checks use validity.components. Freeze both arrays. Increment SCIENTIFIC_SCHEMA_VERSION from 2 to 3 and update fixtures and contract documentation.
- [x] Step 4: Run focused tests, pnpm build, and pnpm verify:schema-artifacts. Expect compatibility and clean generated artifacts.

---

### Task 2: Validate every adapter result at the runtime boundary

Files:
- Modify packages/schema/src/scientific.ts and packages/sci/src/identity.ts.
- Test packages/sci/src/registry.test.ts and packages/sci/src/adapter.test.ts.

Interfaces:
- An adapter may return a domain-form SolveResult.
- The registry wrapper returns a newly validated domain-form result or throws a solver-contract TypeError; no status bypasses validation.

- [x] Step 1: Write failing registry tests for malformed domain results: OK with only provenance, MODEL_OUT_OF_DOMAIN without nearestSupported, NOT_CONVERGED without code, and INVALID_INPUT with non-array violations. Keep one valid result test.
- [x] Step 2: Run pnpm exec vitest run packages/sci/src/registry.test.ts and confirm malformed results reach the caller.
- [x] Step 3: Add schema-owned domain-to-wire serializers for species state, scientific state, model descriptor, and solve result. Each emits the current scientific schema version and canonical units. Change assertSolveResultIdentity(result: unknown, ...) to serialize, parse with SolveResultSchema, convert with parseSolveResult, then compare successful-state provenance with model/config identity. Wrap malformed bridge failures as TypeError.
- [x] Step 4: Run focused adapter tests and pnpm test. Malformed outputs must reject; valid production outcomes must remain valid.

---

### Task 3: Resolve authored scenarios into self-contained genesis

Files:
- Modify packages/schema/src/content.ts and authored fixtures in packages/schema/src/contracts.test.ts.
- Implement the composition boundary in apps/web/src/world-creation.ts.
- Modify apps/web/src/world-creation.ts and apps/web/src/world-creation.test.ts.
- Update the genesis/provenance sections of SPEC-0001.

Interfaces:
- Authored density, concentration/molality, molar mass, and indicator constants carry their own DataProvenance.
- resolveScenario(input: unknown): ScenarioSnapshot produces canonical resolved data.
- createWorldFromScenario(registry, input) returns a genesis event, initial charge events, complete event log, and final state, or an explicit rejection with no partial log.

- [x] Step 1: Write failing tests for a 1.002 kg/L, 0.100 mol/L HCl material with 0.03646 kg/mol molar mass. The resolver calculates 0.998354 kg water per litre and a 25 mL initial charge becomes a MaterialCharged event. Add negative tests for missing provenance, non-positive water, unknown initial material, capacity overflow, and incompatible requirements.
- [x] Step 2: Run pnpm exec vitest run apps/web/src/world-creation.test.ts packages/schema/src/contracts.test.ts and confirm the resolver API is absent and incomplete fixtures are exposed.
- [x] Step 3: Keep draft authoring provenance optional for parse/migration compatibility, but require it at the resolver boundary. Implement resolveScenario: validate ScenarioSchema, canonicalize quantities, reject duplicate solute ids and non-finite or non-positive results, use waterMass = density - sum(c_i times M_i) for molarity, and waterMass = density divided by (1 + m times M) with soluteAmount = m times waterMass for the single molality case. Copy each datum's provenance to its snapshot sibling; never invent citations.
- [x] Step 4: Implement createWorldFromScenario in the composition root. Resolve first, call existing requirements-first createWorld, create the log, emit one MaterialCharged command per initialContents entry in declaration order, reduce each immediately, and return rejection on the first failed command without returning a partial log. The new-world createWorld entry point accepts authored Scenario only, so a schema-valid resolved Snapshot cannot bypass resolution. Do not import Scientific Core into World Runtime.
- [x] Step 5: Run resolver tests and verify replay of the returned log does not consult authored content.

---

### Task 4: Enforce semantic coherence of resolved snapshots and persisted requirements

Files:
- Modify packages/schema/src/world.ts, packages/world/src/state.ts.
- Test packages/world/src/state.test.ts, packages/world/src/reduce.test.ts, packages/schema/src/contracts.test.ts.

Interfaces:
- A resolved MaterialSnapshot is accepted only when its recipe, molar masses, density, and frozen inventory agree.
- ScenarioSnapshot.modelRequirements has the same required species, water, and aqueous constraints as authored ModelRequirements.

- [x] Step 1: Write failing tests using the forged snapshot: 0.1 mol/L HCl but 999 kg water and 999 mol resolved amount; duplicate or missing matching solute records; non-positive values; empty or non-water persisted requirements. Expect rejection before state or charging.
- [x] Step 2: Run pnpm exec vitest run packages/world/src/state.test.ts packages/world/src/reduce.test.ts packages/schema/src/contracts.test.ts and confirm the forged snapshot is accepted.
- [x] Step 3: Implement validateMaterialSnapshotSemantics at the world state boundary. Require unique IDs, exact composition/molar-mass/inventory matching, finite positive values, and waterMass plus sum(amount times molarMass) equal to density within a documented relative tolerance. Reject, never repair. Invoke it from parseMaterialSnapshot.
- [x] Step 4: Align persisted requirement schema with authored requirements: species minimum one, solvent water, phase aqueous. Regenerate artifacts and run focused tests.

---

### Task 5: Repair nested branch replay and typecheck package tests

Files:
- Modify packages/world/src/replay.ts and packages/world/src/branch.test.ts.
- Create packages/schema/tsconfig.tests.json, packages/sci/tsconfig.tests.json, packages/world/tsconfig.tests.json.
- Modify root/package scripts and any uncovered test-only undefined identifiers.
- Update ADR-0002 only if nested branch scope wording changes.

- [x] Step 1: Write a failing nested branch test: fork root, append to child one, fork child one, flatten child two prefix and suffix, and replay child two identity.
- [x] Step 2: Run pnpm exec vitest run packages/world/src/branch.test.ts packages/world/src/replay.test.ts and confirm the root-genesis comparison rejects it.
- [x] Step 3: Fold the prefix to obtain its current worldId and compare the first suffix parentWorldId with that tip identity, preserving fork sequence/hash and shared-prefix storage.
- [x] Step 4: Add no-emit test tsconfigs including src test files, add pnpm typecheck:tests, and fix uncovered fixture identifiers without weakening assertions.
- [x] Step 5: Run branch tests, pnpm typecheck, and pnpm typecheck:tests.

---

### Task 6: Remove duplicate M4 constant sources

Files:
- Modify packages/sci/src/acidbase/index.ts, packages/sci/src/acidbase/solve.ts, packages/sci/src/acidbase/model.ts.
- Test packages/sci/src/acidbase/model.test.ts, activity.test.ts, solve.test.ts, adapter.test.ts.
- Update M4 design documentation.

- [x] Step 1: Write a failing test around the internal constants decoder: calculations and state construction must use the selected frozen SolverConfig parameter record, or reject an unsupported identity-changing record.
- [x] Step 2: Run focused tests and confirm current code uses DEFAULT_ACID_BASE_CONSTANTS independently of the passed config.
- [x] Step 3: Add one exact-key, finite/positive parameter decoder and pass its typed constants through reduced solving, Davies activities, species-state construction, and indicator equilibrium. Keep the public factory fixed; do not add a public arbitrary override.
- [x] Step 4: Run focused scientific tests and verify provenance parameters equal the constants actually used.

---

### Task 7: Reconcile M4 contracts and preserve honest evidence

Files:
- Modify SPEC-0001, ADR-0011, ADR-0012, the M4 design, PLAN-0001, and docs/evidence/M4.md.
- Create tools/check_m4_contract_consistency.mjs.
- Modify CI only to run the new check.

- [x] Step 1: Write the consistency check so it fails on stale constants wording, a global indicator Ka_in claim, a missing component/species distinction, or waterActivity being multiplied into v0 Kw.
- [x] Step 2: Run node tools/check_m4_contract_consistency.mjs and confirm it detects the stale claims.
- [x] Step 3: Reconcile exact semantics: validity.species is equilibrium species, validity.components is input components, indicator Ka_in is frozen in ScenarioSnapshot, waterActivity is identity/audit only, Kw = a_H times a_OH, and authored Scenario resolves before genesis. Retain Proposed/owner-pending ADR status unless the owner separately accepts it.
- [x] Step 4: Add the cross-system evidence packet, keep M4 evidence at S2, and keep REF/PHREEQC criteria pending. Run consistency and acceptance coverage.

---

### Task 8: Full verification and direct integration

Files:
- Modify docs/evidence/M4.md and this plan only with final reproducibility data and completed checkboxes.

- [x] Step 1: Run pnpm install --frozen-lockfile, pnpm typecheck, pnpm typecheck:tests, pnpm build, pnpm test, pnpm verify:guarantees, pnpm verify:schema-artifacts, pnpm depcruise, pnpm guards, pnpm verify:scientific-math, pnpm verify:m4-contracts, pnpm verify:world, pnpm artifacts, pnpm lint, pnpm test:browser, uv sync, uv run pytest, and uv run python tools/check_acceptance_coverage.py. Every command exited zero; REF and PHREEQC remain explicitly unexecuted.
- [x] Step 2: Re-run the original audit reproductions: production adapter plus world requirements is compatible; malformed result is rejected; forged snapshot is rejected; nested flattened branch replay reconstructs identity.
- [x] Step 3: Run git diff --check, inspect git status --short, git diff --stat, and the contract/evidence diff. Confirm no REF or PHREEQC result is claimed.
- [x] Step 4: Commit with message Close cross-system contract gaps before M4 references and push with git push. Do not force-push or create a PR. Implementation commit `91620c9` and evidence pin `a804745` were pushed to `main`.
- [x] Step 5: Handoff the stage gate, verified commands/counts, pushed commit, remaining REF/oracle work, and any unresolved owner decision. M4 remains S2; REF/PHREEQC work is the next gate.

## Self-review checklist

- [x] Each P1 from the audit has a failing test and an implementation task.
- [x] Genesis semantics cannot be bypassed through the public composition path.
- [x] World Runtime does not import Scientific Core.
- [x] Scientific schema changes are versioned and generated artifacts are checked.
- [x] REF execution and PHREEQC evidence remain explicitly out of scope for this remediation.
- [x] Candidate ADRs remain owner-pending unless explicitly accepted.
- [x] Final verification includes the original audit reproductions and test-source typechecking.
