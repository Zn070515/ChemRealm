# M4 Runtime and Evidence Remediation

> **Status:** In progress. This round addresses the cross-system audit of the
> `1b56b1d` baseline. It does not promote M4 to S3 and does not authorize M5.

## Context

The M4 scientific evidence infrastructure is now executable, but the latest
cross-system audit found two P1 defects that are independent of the PHREEQC
results:

1. A legal full-volume transfer can quantize its transfer delta above the
   source's unquantized authoritative amount and make the reducer construct a
   negative amount.
2. The deterministic-math guard can be bypassed through the public schema
   package, and it does not reject every native logarithm route required by the
   numeric policy.

The same audit found two bounded governance defects: M4's acceptance list still
owns presentation/UI evidence that belongs to M5, and several historical plan
documents repeat stale AC-S10…AC-S16 status claims.

## Goal

- Make every accepted World Runtime transfer total over valid command output,
  including high-precision full transfers, while preserving the accepted
  transfer-delta-once and zero-sum policy.
- Make the deterministic scientific-math boundary cover every in-scope source
  package and reject native logarithm/exponential calls, including obvious
  wrapper forms, with a negative guard test.
- Split M4 scientific evidence from M5 presentation evidence without changing
  the scientific/runtime ownership boundary.
- Make `docs/evidence/M4.md` the status authority for current M4 criteria and
  prevent the contract guard from accepting stale merged status language.

## Non-goals

- No PHREEQC model changes, reference fixture renumbering, or oracle tolerance
  changes in this round.
- No async World Runtime reducer, no M5 observable/UI implementation, and no
  new chemistry model.
- No clamping of negative inventory values and no independent source/target
  quantization that would reintroduce the rejected Strategy B.

## Architecture and ownership

| Concern | Owner | Boundary |
|---|---|---|
| Authoritative amounts/water/volume | World Runtime | canonical contents and reducer transitions |
| Deterministic transcendental policy | Scientific Reality Core | `packages/sci` math plus static boundary guard |
| Cross-boundary quantity types | Schema | typed constructors only; no scientific logarithm algorithm |
| Acceptance ownership | PLAN/SPEC/evidence governance | M4 science, M5 presentation |

## Implementation sequence

### Task 1 — Reproduce and close full-transfer state totality

**Objective:** Prove the failure with a high-precision fixture, then make the
authoritative canonical-state invariant explicit and preserve the accepted
quantize-once transfer policy.

**Files:**

- `packages/world/src/reduce.test.ts`
- `packages/world/src/command.test.ts`
- `packages/world/src/reduce.ts`
- `packages/world/src/state.ts`
- `tools/check_world_runtime_contract.mjs`
- `docs/adr/0007-deterministic-numeric-and-replay-policy.md`
- `docs/evidence/M2.md` if the invariant wording needs a cross-stage update

**Implementation detail:**

1. Add a regression fixture whose source contains more than 12 significant
   digits and whose accepted command transfers exactly the source volume.
   Capture the pre-transfer source/target snapshot and assert that the reducer
   returns a state rather than throwing.
2. Define the full-transfer boundary explicitly. When canonical transfer
   volume equals source volume, move the pre-transfer independent water mass and
   component amounts exactly, leave semantic zero in the source, and apply the
   same values to the target. Do not use `Math.max`, silently discard a
   residual, or create a second conservation policy.
3. Ensure normal charge/load paths establish the same canonical independent
   quantity policy, and ensure every reducer result has finite, non-negative
   authoritative water mass and component amounts.
4. Keep partial transfer deltas quantized exactly once and shared by source and
   target. Preserve the perturbed arithmetic regression that proves the delta
   is derived from the pre-transfer snapshot.
5. Update the static guard from a brittle exact count to structural assertions
   that protect the required boundaries without preventing the valid full
   transfer path.
6. Keep snapshot cache integrity separate from semantic replay identity:
   snapshots preserve the exact paired fold representation and carry an
   `exactStateHash` over their serialized state in addition to the quantized
   `stateHash`. A cache mutation must be rejected even when both values would
   have the same replay projection.

**Tests/evidence:**

- high-precision full transfer for component amount;
- high-precision full transfer for water mass;
- command acceptance followed by reducer application;
- exact semantic zero source after full transfer;
- no negative authoritative inventory after a legal transfer sequence;
- existing 100-transfer relative conservation and wrong-strategy-fails tests;
- snapshot mutation that preserves `stateHash` but fails `exactStateHash` and
  falls back to event-log replay;
- `pnpm verify:world` and the targeted World Runtime tests.

**Stop/go:** Stop if the only way to pass is clamping, dropping a delta, or
independently rounding source and target. Go only when legal command output is
closed under reducer application and conservation evidence remains green.

### Task 2 — Close the deterministic-math module boundary

**Objective:** Remove scientific arithmetic from the schema package and make the
guard fail on native transcendental calls anywhere in the actual scientific
source boundary.

**Files:**

- `packages/schema/src/units.ts`
- `packages/schema/src/units.test.ts`
- `packages/schema/src/units.guarantees.ts`
- `packages/sci/src/deterministic-math.ts`
- `tools/check_scientific_math.mjs`
- guard fixture/test files discovered under `tools/`
- relevant ADR/design wording

**Implementation detail:**

1. Search all consumers before removing `log10ActivityCoefficient`. If it is
   only a schema convenience export, delete it and retain only the typed
   activity-coefficient constructors/operators in schema. Scientific logarithm
   belongs to `packages/sci`.
2. Expand the guard's source roots to include the schema source that can be
   imported by scientific code, while excluding only test/fixture text through
   explicit file selection rather than filename-based production whitelists.
3. Reject `Math.log`, `Math.log10`, `Math.exp`, and `Math.pow` calls after comment
   stripping. Add a self-test fixture with a wrapper function and the
   `Math.log(x) / Math.LN10` bypass shape; assert the guard detects every call.
4. Keep `Math.sqrt` permitted as explicitly accepted by ADR-0007. Do not claim
   that static scanning proves arbitrary dynamic dispatch safety; document the
   actual covered boundary.

**Tests/evidence:**

- schema unit/guarantee tests no longer expose a scientific log helper;
- guard self-test catches native log, log10, exp, pow and wrapper expression;
- a deliberately injected forbidden call in each scanned production root makes
  the guard fail, then is removed;
- `pnpm verify:scientific-math`, typecheck, and full test suite.

**Stop/go:** Stop if schema still owns a scientific log algorithm or if a
production package can import a native-log wrapper without a failing guard.

### Task 3 — Separate M4 science criteria from M5 presentation criteria

**Objective:** Preserve every scientific acceptance obligation while allowing
M4 to be independently verifiable without implementing the M5 UI.

**Files:**

- `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`
- `docs/superpowers/specs/2026-09-12-m4-acid-base-engine-design.md`
- `docs/plans/PLAN-0001-world-foundation-acid-base-titration.md`
- `docs/evidence/M4.md`
- `docs/evidence/M5.md` if present, otherwise the M5 section of PLAN
- `tools/check_m4_contract_consistency.mjs`
- `tools/oracle/tests/test_cross_check.py`

**Implementation detail:**

1. Keep M4-owned science criteria for model-pH semantics, validity flags,
   provenance and accuracy-envelope data. Move copy/DOM/inspection presentation
   claims to explicitly named M5 visual/observable criteria.
2. Do not mark any new criterion PASS merely by moving its owner. Preserve
   `NOT RUN`/`HOLD` where the actual evidence is absent.
3. Add a candidate governance note/revision if the accepted SPEC numbering must
   change. Do not silently rewrite an accepted criterion without recording the
   amendment and its owner decision state.
4. Make the M4 evidence matrix keep one row per criterion and reference the
   M5 criterion for deferred presentation evidence.

**Tests/evidence:**

- consistency guard verifies M4 does not require DOM evidence for an M4-only
  S3 decision;
- acceptance coverage still sees every criterion exactly once;
- M4 evidence explicitly lists science-side status and M5 deferred status.

**Stop/go:** Stop if a criterion loses its scientific half, or if M4 can only
reach S3 by implementing renderer/observable code.

### Task 4 — Synchronize evidence status and enforce the canonical matrix

**Objective:** Remove stale merged-status prose and make future status drift
fail a hard check.

**Files:**

- `docs/evidence/M4.md`
- `docs/research/m4-evidence-integrity.md`
- `docs/superpowers/plans/2026-09-13-m4-reference-oracle-validation.md`
- `docs/superpowers/plans/2026-09-12-m4-acid-base-engine.md`
- `tools/check_m4_contract_consistency.mjs`
- `tools/oracle/tests/test_cross_check.py`

**Implementation detail:**

1. Replace stale `S10…S16` pending ranges with the exact still-open set
   (`S3`, `S7`, `S11…S14`, plus any explicitly deferred M5 presentation rows).
2. Treat the M4 evidence matrix as the current status source; historical plans
   may describe prior state only when they label it as historical.
3. Extend the guard/test to reject the known stale phrases and require the
   current matrix to have exactly one row per criterion, including PASS/NOT
   RUN/HOLD status and a non-empty evidence field.
4. Record this round's verification baseline only after the final commit and
   hosted CI result; do not create a self-referential evidence loop.

**Tests/evidence:**

- deliberate stale phrase fixture fails the status guard;
- current docs pass `pnpm verify:m4-contracts` and Python evidence tests;
- final M4 packet remains S2 and does not claim S3.

**Stop/go:** Go to final verification only when all code, docs and guards agree
on the same bounded M4 status. This task does not authorize M5.

## Final verification and handoff

Run the targeted suites after each implementation task, then the complete
repository gate:

```text
pnpm typecheck
pnpm typecheck:tests
pnpm test
pnpm verify:world
pnpm verify:scientific-math
pnpm verify:m4-contracts
pnpm verify:guarantees
pnpm build
pnpm depcruise
pnpm guards
pnpm lint
uv run pytest
pnpm test:browser
```

Inspect the diff and working tree, commit the completed round, and push the
current branch to its configured upstream. The handoff must report the new
commit, hosted CI run, remaining M4 evidence, and any P2/P3 findings. M4 stays
S2 until independent acceptance evidence is complete and owner review occurs.
