# M4 Cross-System Compatibility Closure Evidence

**Status:** **S2 remediation complete locally; M4 S3 remains blocked**

**Scope:** Close the pre-reference cross-system contract findings before REF-1…REF-10
and PHREEQC execution. This packet does not claim independent scientific
validation.

**Implementation baseline:** `fce95dad513e40ee07fc748dc608281a7a338337` —
Close M4 cross-system compatibility gaps before references. Hosted CI run
`34703646857` completed successfully on this baseline.

**Plan:** [`2026-09-12-m4-cross-system-compatibility-closure.md`](../superpowers/plans/2026-09-12-m4-cross-system-compatibility-closure.md)

## Acceptance matrix

| Criterion | Result | Evidence |
|---|---|---|
| Actual resolved scenario components constrain solver selection before genesis | PASS locally | `apps/web/src/world-creation.test.ts` rejects an HNO3 scenario for an HCl-only model; `packages/sci/src/registry.test.ts` covers resolver context and missing-component reasons |
| `fullyDissociated` cannot be authored or silently ignored | PASS locally | `packages/schema/src/contracts.test.ts` and `tools/oracle/tests/test_json_schema_contract.py` reject the removed field; the model catalog remains the owner of dissociation/equilibrium mode |
| Authoring and persisted schema versions remain distinct | PASS locally | `SCENARIO_SCHEMA_VERSION = 3`; persisted world/event schema remains `2`; generated `scenario.schema.json` and world contracts are checked independently |
| Equivalent temperature units yield identical canonical snapshots and hashes | PASS locally | `apps/web/src/world-creation.test.ts` compares `25 degC` with `298.15 K`; persisted `ScenarioSnapshot` requires canonical `K` |
| Davies is never evaluated above `I=0.5 mol/kg` | PASS locally | `daviesActivities()` rejects values above the model ceiling; exact `0.5` HCl/NaOH boundaries return domain refusal, `0.49` cases solve, and `tools/check_m4_contract_consistency.mjs` rejects exploratory solver bounds |
| Full independent scientific validation | NOT RUN | REF-1…REF-10, PHREEQC installation/execution, and cross-engine sweep remain the next M4 work; no S3 claim is made |

## Reproduction

```text
pnpm emit:schema
pnpm --filter @chemrealm/sci build
pnpm exec vitest run apps/web/src/world-creation.test.ts packages/schema/src/contracts.test.ts packages/world/src/snapshot.test.ts packages/sci/src/registry.test.ts packages/sci/src/acidbase/activity.test.ts packages/sci/src/acidbase/solve.test.ts packages/sci/src/acidbase/adapter.test.ts
pnpm verify:m4-contracts
pnpm verify:schema-artifacts
uv run pytest tools/oracle/tests/test_json_schema_contract.py -q
```

## Boundary decisions recorded

- `ModelRequirements` does not gain a duplicate component list. The composition
  root derives actual component IDs from the resolved snapshot and passes them
  as resolver-only context.
- Authoring content carries component identity and quantities, not an ignored
  dissociation assertion. Scientific semantics remain in the model catalog.
- Resolved snapshot requirement temperature is canonical Kelvin. Non-canonical
  persisted snapshots are rejected rather than hashing alternate spellings.
- Root bracketing uses only legal Davies evaluations. A legal boundary
  evaluation can establish an out-of-domain root; it does not authorize
  activity extrapolation.

## Remaining M4 stop condition

Do not promote M4 to S3 until the independent reference matrix, pinned PHREEQC
toolchain execution, constants/provenance review, equivalence-region sweep, and
the complete AC-S1…AC-S16 evidence matrix have been run on a committed baseline.
