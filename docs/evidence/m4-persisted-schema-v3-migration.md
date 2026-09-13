# M4 Persisted Schema v3 Migration Evidence

**Status:** **Historical S2 remediation record** — the current M4 gate is
recorded in [`M4.md`](M4.md), which is S3 Verified / Accepted.

**Scope:** Preserve the historical persisted World/Event v2 contract while
introducing v3 canonical snapshot temperature, and keep authored Scenario
migration in a separate namespace. This packet does not claim REF-1…REF-10 or
PHREEQC validation.

This companion records the pre-M4-S3 remediation state. Its old stop condition
is historical and does not override the current M4 evidence packet.

**Implementation baseline:** `04bf65ed1c4f48e6da281704eb800fb925605cc7` —
Migrate persisted worlds to schema v3. Hosted CI run `34705233550` completed
successfully on this baseline. The later evidence-pin commit only updates this
bookkeeping and does not change the implementation baseline.

**Plan:** [`2026-09-13-persisted-schema-v3-migration.md`](../superpowers/plans/2026-09-13-persisted-schema-v3-migration.md)

## Acceptance matrix

| Criterion | Result | Evidence |
|---|---|---|
| Persisted schema v2 is not redefined as the current schema | PASS locally | Current World/Event contracts require v3; migration tests operate on a legacy v2 fixture rather than parsing it as v3 |
| Persisted v2 temperature migrates to canonical v3 Kelvin | PASS locally | `packages/world/src/state.test.ts` migrates `{ value: 25, unit: "degC" }` to `{ value: 298.15, unit: "K" }` |
| Migrated genesis checksum is rebuilt | PASS locally | The migrated checksum equals `scenarioSnapshotHash(migratedSnapshot)` and matches the canonical equivalent fixture |
| Persisted v1→v2→v3 chain is forward-only and non-destructive | PASS locally | `packages/schema/src/contracts.test.ts` checks `[2, 3]`, future/broken-chain refusal, and legacy-object immutability |
| Nested event envelopes advance to v3 | PASS locally | Persisted event-log migration regression checks nested event schema version and canonical temperature |
| Authored Scenario and persisted World/Event namespaces are separate | PASS locally | `migrateWorld` refuses top-level authored records; `migrateScenario` has an explicit independent registry and no unsafe `fullyDissociated` rewrite |
| REF-1…REF-10 and PHREEQC oracle execution | NOT RUN | Deferred to the next M4 work |

## Reproduction

```text
pnpm build
pnpm exec vitest run packages/schema/src/contracts.test.ts packages/world/src/state.test.ts packages/world/src/log.test.ts packages/world/src/replay.test.ts packages/world/src/reduce.test.ts packages/world/src/branch.test.ts apps/web/src/App.test.ts
pnpm verify:schema-artifacts
pnpm verify:m4-contracts
uv run python tools/check_acceptance_coverage.py
```

## Migration policy

- Persisted World/Event records migrate through `1 → 2 → 3`.
- v1→v2 adds only the explicit empty indicator block when absent.
- v2→v3 converts valid legacy temperature units to canonical Kelvin.
- Any migrated genesis loaded through the World Runtime migration boundary
  causes it to rebuild `WorldCreated.payload.contentHash` after the snapshot
  changes. Schema-level migration of a generic event-log/export container does
  not rewrite derived hashes; complete log/export import migration is an M8
  responsibility and must use a Runtime-owned boundary before replay.
- Authored Scenario shape v3 is independent. The removed `fullyDissociated`
  field is not silently deleted or reinterpreted.

## Historical stop condition

At the time this packet was written, M4 could not be promoted until the
independent reference matrix, pinned PHREEQC toolchain execution,
equivalence-region sweep, constants/provenance review, and complete AC-S1…AC-S16
matrix were run. Those conditions were subsequently closed and accepted in
[`M4.md`](M4.md).
