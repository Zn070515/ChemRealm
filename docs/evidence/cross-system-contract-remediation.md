# Cross-System Contract Remediation Evidence

**Status:** **S2 — remediation implemented; local verification complete; no
milestone promotion claimed**

**Scope:** This packet records the whole-system contract fixes made before M4
REF-1…REF-10 and PHREEQC execution. It does not claim M4 scientific acceptance.
The current M4 packet remains the stage truth for M4 and deliberately keeps
reference/oracle criteria pending.

**Implementation baseline:** to be pinned after the remediation commit is
created. No hosted CI result is claimed by this packet until that workflow has
completed.

## Acceptance matrix

| Finding / invariant | Result | Evidence |
|---|---|---|
| Equilibrium species and accepted input components are distinct | PASS | `ModelDescriptor.validity.species` and `.components`; acid-base registry compatibility and component-acceptance tests |
| Every adapter result crosses the runtime schema boundary | PASS | malformed OK, out-of-domain, not-converged, and invalid-input outputs are rejected in `packages/sci/src/registry.test.ts` |
| New-world creation cannot bypass authored scenario resolution | PASS | `createWorld()` accepts authored `scenario` only; resolved-snapshot bypass regression in `apps/web/src/world-creation.test.ts` |
| Authored quantities resolve to canonical, self-contained genesis data | PASS | `resolveScenario()` and initial `MaterialCharged` event tests in `apps/web/src/world-creation.test.ts` |
| Missing provenance is rejected at genesis, without inventing citations | PASS | missing-provenance scenario test; snapshot datum provenance schema |
| Initial-content failures do not expose a partial event log | PASS | unknown-material and capacity-overflow tests in `apps/web/src/world-creation.test.ts` |
| Resolved material snapshots are semantically coherent | PASS | forged inventory, identity-set, positivity, and mass-balance rejection tests in `packages/world/src/state.test.ts` |
| Persisted solver requirements match the authored aqueous-water domain | PASS | schema negatives for non-water/non-aqueous requirements and regenerated artifact |
| Nested branches replay from their actual prefix tip | PASS | nested branch and flattened grandchild replay tests in `packages/world/src/replay.test.ts` |
| Test sources are statically checked | PASS | `pnpm typecheck:tests`; package test tsconfigs cover package source/test files |
| Production M4 calculations use the frozen solver configuration | PASS | config decoder and acid-base model/adapter tests; no arbitrary public constants override |
| Current M4 contract wording is internally consistent | PASS | `pnpm verify:m4-contracts` |
| REF/PHREEQC scientific evidence | NOT RUN | intentionally remains the next M4 work; no result is claimed here |

## Local verification

The following checks passed in the shared working tree:

- `pnpm typecheck`
- `pnpm typecheck:tests`
- `pnpm build`
- `pnpm test` — 24 files, 321 tests
- `pnpm verify:guarantees`
- `pnpm verify:schema-artifacts`
- `pnpm depcruise`
- `pnpm guards`
- `pnpm verify:scientific-math`
- `pnpm verify:m4-contracts`
- `pnpm verify:world`
- `pnpm artifacts`
- `pnpm lint`
- `pnpm test:browser`
- `uv sync`
- `uv run pytest` — 82 tests
- `uv run python tools/check_acceptance_coverage.py` — 71/71 criteria claimed and evidenced
- `git diff --check`

## Known limitations and next gate

- M4 remains **S2**. REF-1…REF-10, independent reference review, actual
  PHREEQC installation/execution, equivalence-region comparison, and the full
  AC-S1…AC-S16 evidence matrix are not closed.
- `ScenarioSchema` permits draft authoring records without source provenance so
  content can be parsed/migrated; `resolveScenario()` is the mandatory genesis
  gate and rejects missing provenance. Resolved `MaterialSnapshot` records
  require provenance structurally.
- The remediation does not freeze the M6 semantic apparatus asset API and does
  not change World Runtime into a scientific or asynchronous core.
