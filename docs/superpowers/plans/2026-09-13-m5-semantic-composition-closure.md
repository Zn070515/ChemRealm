# M5 Semantic Composition Closure Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: use `superpowers:executing-plans` to execute this plan task-by-task with review checkpoints.

**Goal:** Close the current M5 semantic-composition findings without weakening the accepted scientific or representation contracts: produce real scientific expressions, move acid-base request assembly into the Scientific Reality Core, derive the curve from committed titrant transfers, bind display metadata to the ObservableModel, verify burette provenance against the world, and add a deterministic out-of-envelope browser fixture.

**Architecture:** Keep `apps/web` as orchestration only. Model-specific component aggregation and SolveRequest construction belong in `@chemrealm/sci`; World Runtime supplies canonical plain data and committed event facts; `@chemrealm/sci` produces bound scientific frames and expressions; `@chemrealm/render` only validates and presents source-bound records; the DOM adapter consumes ObservableModel/RenderState values rather than chemistry constants.

**Tech Stack:** TypeScript, Zod, Vitest, Playwright, pnpm workspace, existing world replay/state-hash APIs, existing canonical quantity types.

**Spec:** `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md` and M5 composition evidence remain authoritative. Any changed cross-boundary meaning must receive a candidate SPEC revision; subordinate M5 documents may refine but not redefine `AC-*` criteria.

**Handoff:** Implemented in commit `fdfec91` with local and hosted verification;
M4 remains S3 accepted, M5 remains S2, and M6 is not authorized. The remaining
M5 visual/owner evidence is intentionally not claimed by this plan.

## Global Constraints

- Work directly in the current shared working tree; do not create a worktree.
- Use RED → GREEN → refactor for each behavior change.
- Do not alter M4 implementation or claim M5 S3.
- Do not introduce a second chemistry catalog or constants source in `apps/web`.
- Do not use a pre-authored curve, hand-authored exact scientific expression, or hard-coded activity-model display copy.
- Preserve replay-equivalence `sourceStateHash` semantics and existing profile content-hash validation.
- Update evidence to `PARTIAL` whenever an acceptance criterion remains unverified.

## Tasks

### Task 1: Make Scientific Core expressions actual model equations

**Objective:** Replace the current natural-language sentence labelled `exact` with structured, current-state-bound equations and substitutions produced by `@chemrealm/sci`.

**Files/packages:** `packages/schema/src/scientific.ts`, `packages/schema/src/scientific-expression.test.ts`, generated schema artifacts, `packages/sci/src/expressions.ts`, `packages/sci/src/expressions.test.ts`, `packages/render/src/observable/symbolic.test.ts`, M5 evidence/contract guard.

**Interfaces:** Version the ScientificExpression wire shape only if required by the new structured fields; add a schema-owned substitution/term representation with explicit equation identity, unit, and value. Keep producer/model/source replay identity mandatory.

**Implementation detail:** Generate expressions for the implemented acid-base model from the bound frame: charge balance, water auto-protolysis, acid-family equilibrium, and component balance where the required species exist. Include current numerical substitutions and explicitly list the v0 approximation/omitted terms. The producer must reject unsupported state shapes rather than emit a misleading “exact” sentence.

**Tests/evidence:** RED tests require equation identifiers, numeric substitutions from the frame, model identity, source hash, and non-empty honest omitted-term metadata; reject a generic natural-language-only expression as the production output. Keep render tests focused on re-presenting schema-valid records. Update the M5 symbolic status to `PARTIAL` until composition evidence proves the producer path.

**Stop/go:** Go when tests prove the expression is an actual scientific-core output for the current frame and all generated schema artifacts are synchronized. Do not mark M5-SYMBOLIC PASS yet.

### Task 2: Move acid-base SolveRequest assembly out of web composition

**Objective:** Prevent the web composition root from owning the acid-base component catalog, Ka constants, or mode selection.

**Files/packages:** `packages/sci/src/acidbase/request.ts` (new or existing), `packages/sci/src/acidbase/index.ts`, acid-base tests, `apps/web/src/composition.ts`, `tools/check_m5_contract_consistency.mjs`.

**Interfaces:** Add a Sci-owned builder accepting canonical world-content data plus frozen scenario indicator inputs and returning `SolveRequest`. It may depend on the model-owned catalog/config; it must not import World Runtime. Keep world-to-Sci mapping as a small plain-data adapter in web.

**Implementation detail:** Use the persisted snapshot temperature and indicators, canonical target component amounts, water mass, and liquid volume. Resolve component mode/Ka only inside Sci. Remove `ACID_BASE_COMPONENT_CATALOG`, `DEFAULT_ACID_BASE_CONSTANTS`, and direct chemistry-specific mode/Ka logic from `apps/web/src/composition.ts`.

**Tests/evidence:** RED static composition test rejects model catalog/constants imports and duplicated mode-selection logic. GREEN Sci tests cover HCl, NaOH, HOAc, NaOAc and frozen indicator constants. Composition tests prove the production path still solves the same world.

**Stop/go:** Go when web has no acid-base assembly logic and the Sci builder is the only production owner of that mapping.

### Task 3: Correct curve x-axis and committed-transfer selection

**Objective:** Make curve points represent delivered titrant volume, not final flask volume, and derive only from the initial target state plus relevant committed source-to-target transfers.

**Files/packages:** `packages/render/src/observable/curve.ts`, curve tests, `apps/web/src/composition.ts`, composition tests, `apps/web/src/App.tsx`, browser tests, M5 spec/plan/evidence.

**Interfaces:** Rename `CurveFrame.volume` to `deliveredTitrantVolume`. Add a composition helper that identifies the source/target transfer facts and returns initial target prefix plus one point per relevant committed transfer.

**Implementation detail:** Filter `TransferCommitted` by exact `fromVesselId` and `toVesselId`; compute cumulative delivered titrant volume from those event payloads; replay each relevant prefix; use the target state and frame identity at that prefix. Do not add points for unrelated transfers or arbitrary non-transfer prefixes.

**Tests/evidence:** RED test expects `[0, 0.010, 0.020, 0.025] L`, not `[0.025, 0.035, ...]`; test that unrelated transfer facts do not add curve points; test strict sequence/source/model identity. Browser exposes the x values and asserts them.

**Stop/go:** Go when the curve has the accepted titration x-axis semantics and no pre-authored values are involved.

### Task 4: Bind AC-V10 display data and add AC-V11 out-of-envelope browser evidence

**Objective:** Make displayed activity-model copy come from ObservableModel and provide a deterministic production fixture whose qualification flag is false and visibly rendered.

**Files/packages:** `apps/web/src/App.tsx`, `apps/web/src/composition.ts`, `apps/web/src/production-scenario.ts`, browser tests, composition tests, M5 evidence and contract guard.

**Interfaces:** Render `composition.observable.readouts.activityModel`; add a deterministic composition mode/fixture for a valid but proposed-envelope-outside acid solution, without changing the default fixture or solver domain contract.

**Implementation detail:** Remove hard-coded `Davies` from JSX. Add a query-selected or test-selected out-of-envelope scenario that uses the same World → Sci → Frame → Observable path. Keep the fixture provenance honest as a pedagogical composition fixture where it is not a scientific reference.

**Tests/evidence:** RED source/DOM test rejects hard-coded activity model text and browser test asserts the rendered model name. Add browser coverage for the probe route asserting `accuracy-qualification` and `withinProposedAccuracyEnvelope === false`. Update AC-V10 and AC-V11 only to the evidence level actually demonstrated.

**Stop/go:** Go when copy is data-derived and a real browser DOM visibly qualifies the out-of-envelope result.

### Task 5: Harden burette provenance against the committed world

**Objective:** Ensure burette deliveries are derived only from the intended source-to-target facts and agree with the final source vessel state.

**Files/packages:** `apps/web/src/composition.ts`, `apps/web/src/composition.test.ts`, render burette tests if needed, M5 evidence.

**Interfaces:** Keep `BuretteInput` source hash/sequence contract; add composition-level validation that the filtered delivery sum and derived contained volume agree with the final source `WorldState` within the declared roundoff policy.

**Implementation detail:** Filter exact source/target IDs, locate the source initial charge for the same vessel, reject missing/multiple incompatible initial charges, and compare derived state against the final canonical source liquid volume. Do not derive a burette from all transfer events.

**Tests/evidence:** Add unrelated-transfer regression, source/target mismatch regression, final contained-volume consistency assertion, and ensure the full production composition still passes.

**Stop/go:** Go when a valid composition cannot silently use unrelated transfers or disagree with world truth.

### Task 6: Align M5 documentation and evidence without false closure

**Objective:** Record the new semantics and truthful evidence state, including remaining composition limitations.

**Files/packages:** `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`, `docs/superpowers/specs/2026-09-13-m5-production-composition.md`, `docs/superpowers/plans/2026-09-13-m5-production-composition.md`, `docs/evidence/M5.md`, `tools/check_m5_contract_consistency.mjs`.

**Implementation detail:** Add a candidate revision only for changed canonical meanings (scientific expression content, curve x-axis, any explicit ownership correction). Keep M5-SYMBOLIC/FRAME/CURVE PARTIAL until production composition evidence is genuinely sufficient. Change AC-V11 from NOT RUN only after browser evidence exists. Explicitly state that mapping/coverage checks do not prove semantic sufficiency.

**Tests/evidence:** Run the M5 consistency guard and inspect all `AC-*` rows against the canonical SPEC. Add stale-text guards for old curve `volume` and hard-coded activity model copy.

**Stop/go:** Go when docs, code, and tests describe one contract and no criterion is marked stronger than its evidence.

### Task 7: Full verification and handoff

**Objective:** Verify the complete repository after the cross-system changes and leave a reproducible handoff.

**Commands:** `pnpm typecheck`, `pnpm typecheck:tests`, `pnpm test`, `pnpm verify:guarantees`, `pnpm verify:schema-artifacts`, `pnpm depcruise`, `pnpm guards`, `pnpm verify:scientific-math`, `pnpm verify:scientific-quantities`, `pnpm verify:m4-contracts`, `pnpm verify:m5-contracts`, `pnpm verify:world`, `pnpm artifacts`, `pnpm lint`, `pnpm test:browser`, and the repository’s Python/PHREEQC acceptance commands as configured in CI.

**Evidence:** Inspect `git diff`, confirm no weakened tests, record exact HEAD/CI only after hosted CI succeeds, and update handoff with M5 S2 status, verified criteria, unverified criteria, commands, and the remaining M6 boundary.

**Stop/go:** The round is complete only if all relevant checks pass and no unresolved P0/P1 remains. Otherwise preserve the working tree and report the blocker.
