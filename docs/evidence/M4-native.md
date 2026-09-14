# M4-B — Native Scientific Core / WASM Evidence

**Status:** **S2 — implementation and local contract checks verified; native
supersession S3 remains open**

**Authority:** `SPEC-0001` current candidate revision and ADR-0014. This packet
is separate from [`M4.md`](M4.md), which records the accepted historical
TypeScript `1.0.0` M4 S3 baseline.

## Verified in this handoff

| Criterion | Result | Evidence |
|---|---|---|
| Central version distribution | PASS locally | `pnpm verify:versions`; active versions originate in `contracts/version-manifest.json` |
| Native bridge schema boundary | PASS locally | `pnpm verify:native-schema`; committed schema artifacts, Rust bridge roots, and `build.rs` are mechanically checked together |
| Rust host bridge | PASS locally | `pnpm native:fmt`, `pnpm native:test`, `pnpm native:clippy` |
| WASM compilation | PASS locally | `pnpm native:check-wasm` and the release artifact build |
| Source/request identity separation | PASS locally | native host and facade tests require distinct `sourceStateHash` and `requestHash` |
| Scientific execution capability | PASS locally | adapter/registry tests preserve and safely narrow the expression-producing capability |
| Refusal identity | PASS locally | adapter and registry tests reject mismatched `nearestSupported` model identity |
| Explicit solver selection | PASS locally | reversed registry-order tests preserve the explicitly selected identity |
| Explicit native production composition | PASS locally | `apps/web/src/composition.test.ts` and `tests/browser/m5-composition.spec.ts?backend=native` prove a registered WASM adapter drives World → ScientificFrame → Observable → DOM without TS expression substitution |
| Native WASM canonical REF matrix | PASS locally | `packages/sci/src/native-reference.test.ts` runs REF-1…REF-10 through the real release WASM and checks independent values, analytic identities, charge conservation, scale bound, projection, and the complete native expression set |
| Native adversarial semantic fixture | PASS locally | `packages/sci/src/native-reference.test.ts` verifies the dilute HOAc water-equilibrium result and rejects the recorded Henderson–Hasselbalch shortcut |
| Native host ↔ WASM differential matrix | PASS locally | `pnpm verify:native-differential` compares the complete host/WASM payload for 42 requests across REF, ORACLE, and adversarial fixture groups |
| Native WASM ↔ accepted TypeScript differential matrix | PASS locally | `pnpm verify:native-ts-differential` compares status, species, activities, projections, and indicators across every REF, ORACLE, and adversarial request; backend identities remain distinct |
| Native WASM ↔ PHREEQC oracle comparison | PASS locally | `M4-oracle-sweep-report.json` records 10/10 native-WASM-to-pinned-PHREEQC comparisons, signed differences, model identity, toolchain identity, and the bounded-offset/no-equivalence disposition |
| Native governance boundary | PASS locally | `pnpm verify:native-governance` |

## Still required for native supersession S3

The following prerequisites must be evidenced before any separate rollout
decision. They are not satisfied merely by saying that native will become the
default after the gate:

- explicit v2 native WorldCreated creation and replay, with v1 exact lookup
  still preserved;
- complete native World → ScientificFrame → Observable → DOM/browser acceptance packet;
- final native artifact identity and hosted-CI attestation for that exact
  committed baseline.

Only after those prerequisites pass may a subsequent owner decision choose a
native-default rollout policy for new worlds. Default selection is an outcome
of supersession acceptance, never one of its prerequisites.

The native PHREEQC comparison is an independently executed bounded comparison,
not a claim that the native model and PHREEQC are equivalent. Its signed offset
and non-equivalence disposition are recorded in the shared oracle report.

Native initialization and solve failures remain explicit. There is no silent
fallback to the accepted TypeScript backend. M4 legacy S3 is preserved; this
packet does not promote M4-B, M5, or M6.

## Reproduction

```text
pnpm verify:versions
pnpm verify:native-schema
pnpm verify:native-governance
pnpm native:fmt
pnpm native:test
pnpm native:clippy
pnpm native:check-wasm
pnpm build
pnpm verify:native-differential
pnpm verify:native-ts-differential
CHEMREALM_REQUIRE_PHREEQC=1 uv run python tools/oracle/reference/run_m4_validation.py \
  --output docs/evidence/M4-oracle-sweep-report.json
pnpm exec vitest run apps/web/src/composition.test.ts
pnpm test:browser
```
