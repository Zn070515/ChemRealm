# M4-B — Native Scientific Core / WASM Evidence

**Status:** **S3 — verified locally; owner/hosted supersession acceptance
remains open**

**Authority:** `SPEC-0001` current candidate revision and ADR-0014. This packet
is separate from [`M4.md`](M4.md), which records the accepted historical
TypeScript `1.0.0` M4 S3 baseline.

## Verified in this handoff

| Criterion | Result | Evidence |
|---|---|---|
| Central version distribution | PASS locally | `pnpm verify:versions`; active versions originate in `contracts/version-manifest.json` |
| Native bridge schema boundary | PASS locally | `pnpm verify:native-schema`; committed schema artifacts, Rust bridge roots, and `build.rs` are mechanically checked together |
| Language-neutral native model contract | PASS locally | `contracts/scientific/acidbase-monoprotic-davies-2.0.0.json` is selected from `contracts/version-manifest.json`; generated TS and Rust derive identity, domain, species/components, and solver parameters from that artifact |
| Native identity artifacts | PASS locally | Model contract payload `sha256:eaeecd4104f2c14bab55be8158ddb105f68367df15d5b677e0b37604093207a5`; persisted solver-config identity `sha256:deb6fcfff06ea915adee034789e7d74535fef5f920ff95997d311f9c02665c6b`; local release WASM `sha256:c03fc50d7fb8aa6bae79dd9638b14095f1cf919bdfb8e31c64bda93ce05c3887` |
| Rust host bridge | PASS locally | `pnpm native:fmt`, `pnpm native:test`, `pnpm native:clippy` |
| WASM compilation | PASS locally | `pnpm native:check-wasm` and the release artifact build |
| Source/request identity separation | PASS locally | native host and facade tests require distinct `sourceStateHash` and `requestHash` |
| Scientific execution capability | PASS locally | adapter/registry tests preserve and safely narrow the expression-producing capability |
| Refusal identity | PASS locally | adapter and registry tests reject mismatched `nearestSupported` model identity |
| Explicit solver selection | PASS locally | reversed registry-order tests preserve the explicitly selected identity |
| Persisted solver-config identity | PASS locally | `packages/sci/src/registry.test.ts` rejects changed parameters through both exact lookup capabilities; production composition passes the frozen `WorldState.solverConfig` into adapter lookup and request construction |
| Explicit native production composition | PASS locally | `apps/web/src/composition.test.ts` and `tests/browser/m5-composition.spec.ts?backend=native` prove a registered WASM adapter drives World → ScientificFrame → Observable → DOM without TS expression substitution |
| Native WASM canonical REF matrix | PASS locally | `packages/sci/src/native-reference.test.ts` runs REF-1…REF-10 through the real release WASM and checks independent values, analytic identities, charge conservation, scale bound, projection, and the complete native expression set |
| Native adversarial semantic fixture | PASS locally | `packages/sci/src/native-reference.test.ts` verifies the dilute HOAc water-equilibrium result and rejects the recorded Henderson–Hasselbalch shortcut |
| Native host ↔ WASM differential matrix | PASS locally | `pnpm verify:native-differential` compares the complete host/WASM payload for 42 requests across REF, ORACLE, and adversarial fixture groups |
| Native WASM ↔ accepted TypeScript differential matrix | PASS locally | `pnpm verify:native-ts-differential` compares all shared scientific semantics across every REF, ORACLE, and adversarial request, including species quantities, validity, provenance parameters, diagnostics, projections, indicators, and expression substitutions; backend identities and human-readable numeric formatting remain intentionally distinct |
| Native deterministic math / numeric-policy corpus | PASS locally | `pnpm native:test` checks the Rust implementation against the shared pinned arbitrary-precision ULP corpus used by the TypeScript tests |
| Native WASM ↔ PHREEQC oracle comparison | PASS locally | `M4-oracle-sweep-report.json` records 10/10 native-WASM-to-pinned-PHREEQC comparisons, signed differences, model identity, toolchain identity, and the bounded-offset/no-equivalence disposition |
| Explicit v2 native WorldCreated creation and replay with v1 exact lookup | PASS locally | `apps/web/src/composition.test.ts` creates legacy v1 and native v2 worlds, replays both logs without changing solver identity, resolves both exact versions, and confirms a v1 lookup is unavailable when only v2 is registered |
| Native governance boundary | PASS locally | `pnpm verify:native-governance` |

## Native supersession criterion matrix

This is a native-specific handoff matrix, not a second definition of the
canonical M4 criteria. `SHARED` means the accepted legacy evidence is
backend-independent but is not silently counted as a native rerun. `PENDING`
rows remain native S3 blockers.

| Criterion | Native handoff status | Evidence / remaining work |
|---|---|---|
| AC-S1 | PASS locally | Native REF-1…REF-10 matrix checks independent expected results |
| AC-S2 | PASS locally | Native REF matrix checks unquantized charge residuals |
| AC-S3 | PASS locally | `apps/web/src/composition.test.ts` and the native v2 composition/browser path attach WorldCreated, replay, native solve, frame, and observable evidence |
| AC-S4 | PASS locally | Native request/domain tests cover component, temperature, ionic-strength, high-acid, and boundary refusal semantics |
| AC-S5 | PASS locally | Native adversarial dilute weak-acid fixture rejects the Henderson–Hasselbalch shortcut |
| AC-S6 | PASS locally | Native WASM ↔ pinned PHREEQC bounded comparison with no equivalence claim |
| AC-S7 | SHARED | Provenance is schema/model-owned and carried through native identity; source records remain common evidence |
| AC-S8 | PASS locally | Native differential/reference tests and the scientific-quantity boundary verify molality thermodynamics and the projection-only molarity boundary |
| AC-S9 | PASS locally | Native projection and model-pH identity are exercised by the native REF matrix |
| AC-S10 | PASS locally | Rust and TypeScript use the shared pinned arbitrary-precision ULP corpus |
| AC-S11 | PASS locally | Native reference and boundary sweep tests verify monotonicity and valid-domain edge classification |
| AC-S12 | PASS locally | Native result expressions and provenance carry the activity-based model identity |
| AC-S13 | PASS locally | Native domain-matrix tests assert measured `I_m` at `0.15` and `0.30 mol/kg` and the accuracy-envelope flag |
| AC-S14 | PASS locally | Native acceptance tests traverse the complete v0 Scenario → WorldCreated → WorldState → SolveRequest sweep for both scenario families |
| AC-S15 | SHARED | Required-density schema refusal is backend-independent; native packet must cite the shared contract test |
| AC-S16 | SHARED | Constant provenance and precision evidence is backend-independent; native packet must cite the shared provenance test |

## Still required for hosted/owner supersession acceptance

The following final-packet prerequisites must be evidenced before any separate
rollout decision. The paired v1/v2 WorldCreated test above is a local closure
of the identity/replay behavior; it is not by itself a hosted attestation:

- hosted CI rerun for the exact committed baseline, with the final native
  artifact identity recorded by that run;
- owner review of this packet and the current canonical SPEC candidate;
- an explicit rollout decision before changing the default backend for new
  worlds.

Only after those prerequisites pass may a subsequent owner decision choose a
native-default rollout policy for new worlds. Default selection is an outcome
of supersession acceptance, never one of its prerequisites.

The native PHREEQC comparison is an independently executed bounded comparison,
not a claim that the native model and PHREEQC are equivalent. Its signed offset
and non-equivalence disposition are recorded in the shared oracle report.

Native initialization and solve failures remain explicit. There is no silent
fallback to the accepted TypeScript backend. M4 legacy S3 is preserved; this
packet records a locally verified M4-B S3 candidate and does not by itself
promote M4-B, M5, or M6.

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
