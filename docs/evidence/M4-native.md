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
| Native governance boundary | PASS locally | `pnpm verify:native-governance` |

## Still required for native supersession S3

The following evidence is intentionally not claimed by this packet:

- native PHREEQC oracle execution and disagreement disposition;
- native backend as the default new-world path after the supersession gate;
- complete native World → ScientificFrame → Observable → DOM/browser acceptance packet;
- final native artifact and hosted-CI attestation for the supersession gate.

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
pnpm exec vitest run apps/web/src/composition.test.ts
pnpm test:browser
```
