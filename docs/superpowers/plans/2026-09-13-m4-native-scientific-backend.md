# M4 Native Scientific Backend Supersession Plan

> **Status:** S2 implementation in progress; the Rust host core, raw WASM bridge,
> schema-validated TypeScript facade, expression contract, and local toolchain
> gates are implemented and verified. M4 S3 remains accepted for the TypeScript
> 1.0.0 baseline. M5 remains S2 and M6 is not authorized. Native supersession,
> full REF/ORACLE validation, default identity rollout, and final native M5
> acceptance remain pending. An explicit opt-in native composition/browser
> path is implemented and locally exercised; this plan does not promote either
> stage.

**Spec:** `docs/superpowers/specs/2026-09-13-m4-native-scientific-backend.md`  
**ADR:** `docs/adr/0014-native-scientific-core-and-wasm-deployment.md`  
**Canonical contract:** `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md` revision 26 Candidate

## Problem and scope

The accepted M4 model is currently implemented in TypeScript. This plan creates
a validated Rust/WASM backend without creating a second scientific truth,
silently changing legacy replay, or weakening existing M4 evidence.

## Global constraints

- Work directly in the current shared working tree.
- Use RED → GREEN → refactor for behavior changes.
- Do not change the synchronous World Runtime reducer boundary.
- Do not remove or silently replace the TS 1.0.0 legacy adapter.
- Do not add a C++ or GPU implementation in this plan.
- Do not use native standard transcendental functions in replay-relevant math.
- Do not mark backend supersession or M5 S3 before evidence is complete.
- Do not weaken REF, ORACLE, domain, provenance, or failure tests.

## Step 1 — Freeze governance and backend contract

**Objective:** Make the migration reviewable before implementation.

**Files:** ADR-0014, SPEC-0001, PLAN-0001, new S1 spec, ADR index.

**Implementation detail:** Record revision 26 Candidate, native/legacy identity,
strict no-fallback behavior, complete symbolic requirements, and the M4
backend-supersession gate. Keep accepted M4 S3 evidence historical.

**Tests/evidence:** Run document consistency and acceptance mapping; inspect the
diff for any accidental new S3 claim.

**Stop/go:** Stop if a subordinate document changes an accepted `AC-*` criterion
without a canonical SPEC amendment. Go when the documents have one stage and
backend interpretation.

## Step 2 — Complete the Scientific Core expression contract

**Objective:** Describe the actual self-consistent activity solve before porting.

**Files:** `packages/schema/src/scientific.ts`, generated artifacts,
`packages/sci/src/expressions.ts` and tests, M5 evidence/guards.

**Implementation detail:** Add equation IDs and producer output for the
ionic-strength fixed point, Davies relation, and activity definition. Use a
candidate expression schema/producer revision when the wire meaning changes.

**Tests/evidence:** RED tests require all applicable equations, substitutions,
identity, and omissions. HCl and weak-acid fixtures must distinguish applicable
equations. Keep M5 symbolic evidence PARTIAL until composition uses the producer.

**Stop/go:** Stop if a generic natural-language sentence can still be labelled
`exact`, or if render can author an exact expression.

## Step 3 — Create the Rust host scientific core

**Objective:** Port the accepted v0 model into a separately testable Rust crate.

**Files/packages:** `native/sci-core/Cargo.toml`, Rust source/tests, build
metadata, native fixtures.

**Implementation detail:** Use strict serde wire DTOs at the host boundary and
separate model/domain code from the bridge. Port deterministic math from the
specified algorithm, not platform transcendental calls. Preserve quantities,
constants, domains, failure codes, provenance, and expressions. The backend
payload must carry both the state and the Scientific Core-produced expression
records; the TypeScript facade may validate and bind them but may not author
replacement exact expressions.

**Tests/evidence:** Cargo format/check/test; ULP vectors; charge/mass/component
invariants; REF/adversarial fixtures; malformed request/result tests; expression
producer tests.

**Stop/go:** Stop on unclassified TS/native difference or any web/UI dependency.

## Step 4 — Build the WASM bridge

**Objective:** Expose the same native core to the browser through an explicit
async adapter.

**Files/packages:** Rust WASM bridge, generated self-hosted JS/WASM artifacts,
`@chemrealm/sci` loader/adapter, package/build scripts.

**Implementation detail:** Use the strict UTF-8 JSON bridge first. Validate on
both sides. Keep initialization explicit and promise-based. No silent TS
fallback. Bundle locally without a new server or third-party origin.

**Tests/evidence:** Node/browser WASM smoke tests; malformed wire/version tests;
initialization failure and no-fallback tests; artifact/network inspection.

**Stop/go:** Stop if the browser receives a number without identity, or WASM
failure invokes TS silently.

## Step 5 — Register identities and preserve replay

**Objective:** Introduce native identity without corrupting old worlds.

**Files/packages:** `packages/sci/src/registry.ts`, native adapter, model/config
identity, genesis composition, replay/legacy tests, docs.

**Implementation detail:** Register the TypeScript and Rust/WASM identities as
separate candidates. Legacy genesis uses its exact recorded backend. A native
v2 genesis/replay path must be explicitly demonstrated before any rollout
policy can select native as the default for new worlds; lookup remains exact.

**Tests/evidence:** Old-world replay; native-genesis identity; unavailable
backend; mismatch/provenance; no silent re-solve; stable content hash tests.

**Stop/go:** Stop if an old world loads under another backend without explicit
migration/re-solve.

## Step 6 — Differential and oracle validation

**Objective:** Demonstrate preserved accepted scientific behavior.

**Files:** reference runners/reports, native differential scripts/tests,
`docs/evidence/M4.md`, backend evidence packet.

**Implementation detail:** Run REF-1…REF-10, adversarial cases, domain/boundary
matrix, deterministic math, provenance/diagnostics, and PHREEQC ORACLE sweep
against native host and WASM where applicable. Report signed differences and
offsets; never average or relabel disagreement as equivalence. The native
PHREEQC comparison is a separate execution path in the shared oracle report;
it must carry native model identity and pinned toolchain identity.

**Tests/evidence:** The real release WASM now runs the canonical REF-1…REF-10
matrix and checks the independent values, identities, projections, invariants,
and native expression set. The Rust-host ↔ WASM differential matrix and the
native WASM ↔ pinned PHREEQC comparison are now locally executable and
machine-checked. Remaining evidence is native adversarial/domain completeness,
all M4 criteria rerun on native, the default-backend gate, complete native
browser composition, and hosted-CI attestation. Keep the original TS M4 packet
unchanged.

**Stop/go:** Stop on unexplained disagreement, missing reference input, or
unclassified failure.

## Step 7 — Re-run M5 production composition

**Objective:** Prove the browser path consumes native and preserves identity.

**Files:** `apps/web/src/composition.ts`, `@chemrealm/sci` facade, M5 tests,
browser tests, `docs/evidence/M5.md`.

**Implementation detail:** Route World → Sci request → explicit WASM adapter →
ScientificFrame → ObservableModel → DOM. Burette, curve, expressions, volume,
and qualification flags share world/sequence identity. The opt-in route is now
implemented; the explicit v2 world/replay, artifact, hosted-CI, and default
rollout decisions remain separately gated.

**Tests/evidence:** Browser fixture; native backend identity; DOM readouts;
frame/curve/symbolic identity; initialization/domain/failure states; privacy
network check.

**Stop/go:** Stop if any M5 output is hand-authored or comes from hidden TS
fallback. Native supersession still requires the complete REF/ORACLE and
committed hosted-CI evidence from Steps 5–6.

## Step 8 — Final attestation and gate decision

**Objective:** Leave an auditable handoff without overstating stage status.

**Files:** M4/M5 evidence, PLAN, SPEC/ADR status, CI workflow, artifact manifests.

**Implementation detail:** Record exact commit, hosted CI, Rust/WASM artifact
identity, differential reports, PHREEQC identity, legacy replay evidence, and
limitations. M4 S3 historical acceptance and native supersession remain separate
decisions.

**Commands:** `cargo fmt --check`, `cargo test`, `cargo clippy -- -D warnings`,
native/WASM build and smoke commands, then existing `pnpm` and `uv`/PHREEQC
acceptance commands.

**Stop/go:** Complete only when all relevant checks pass, no P0/P1 remains, and
the evidence packet distinguishes verified, partial, and unrun criteria.
