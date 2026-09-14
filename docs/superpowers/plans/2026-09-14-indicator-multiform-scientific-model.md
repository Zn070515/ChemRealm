# Indicator multiform scientific model implementation plan

> **Status:** Steps 1–7 are implemented and attested for the owner-accepted
> ordinary-aqueous three-form candidate at committed baseline
> `1b91dc1afce56c97adc8e9287dedc17169527a58`; hosted CI run
> `34853566212` completed successfully. MF-1…MF-10 fixtures, independent
> checks, coupled TypeScript↔WASM differential evidence, and a real World
> Runtime replay test are present. Formal owner-facing closure, candidate SPEC
> acceptance, production-adapter rollout, and optical enablement remain
> separate pending decisions. Strong-acid cation/orange remains refusal-only
> and is not authorized for implementation.

## Objective

Define and, after explicit owner approval, implement one source-backed
ordinary-aqueous multi-form indicator model. The first candidate is a coupled
three-form phenolphthalein network. Strong-acid cation/orange behaviour is
preserved as an explicit refusal until its own chemistry and optical evidence
are accepted.

## Constraints

- `contracts/version-manifest.json` remains the only manually maintained source
  of active schema/model versions.
- Accepted M4 acid-base behaviour is not changed by implication.
- No copied endpoint colour, `lambdaMax`, or existing monoprotic `Ka_in` may
  stand in for a missing form model.
- TypeScript, native/WASM, world, and representation boundaries remain
  separate.
- Every accepted scientific result needs independent reference, provenance,
  domain, conservation, and differential evidence.

## Step 1 — lock the candidate science and reference matrix

**Files:**

- `docs/superpowers/specs/2026-09-14-indicator-multiform-scientific-model.md`
- `docs/superpowers/plans/2026-09-14-indicator-multiform-scientific-model.md`
- `docs/research/indicator-optics/phenolphthalein-multiform-reference-matrix.md`
- `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`
- `docs/evidence/M4.md`
- `contracts/version-manifest.json` only if the canonical SPEC revision is
  bumped; generated version sources must then be regenerated.

**Implementation detail:**

- Define the ordinary forms and reactions as H₂In/HIn⁻/In²⁻, with explicit
  `Ka_In_1`, `Ka_In_2`, activity coefficients, balances, and validity.
- State that the strong-acid cation and strong-base-altered forms are outside
  this initial model and must return refusal.
- Require full coupling of indicator charged forms into charge balance and
  ionic strength; no unbounded trace-dose shortcut.
- Define the source/provenance, deterministic numerical, identity, and
  TS/WASM differential contracts.
- State that Task 8 currently has no quantitative optical profile, so chemical
  acceptance cannot itself enable a tint.

**Tests/evidence:**

- document consistency and central-version checks;
- `git diff --check`;
- review the independent MF-1…MF-10 matrix for missing refusal or identity
  cases;
- no production solver changes in this step.

**Stop/go:**

- **Go:** candidate spec and reference matrix are internally consistent and
  explicitly subordinate to canonical SPEC-0001.
- **Stop:** any unresolved choice about species, constants, strong-acid scope,
  or coupled/decoupled treatment is hidden in implementation code.

## Step 2 — owner acceptance

**Files:** no solver files may change.

**Commands:**

```text
pnpm verify:m4-contracts
pnpm verify:scientific-math
pnpm verify:versions
git diff --check
```

- **Accepted:** ordinary-aqueous H₂In/HIn⁻/In²⁻ scope, source-backed
  `Ka_In_1`/`Ka_In_2` requirements, coupled charge treatment, refusal-first
  failure semantics, and MF-1…MF-10 evidence matrix.
- **Explicitly not accepted for implementation:** strong-acid cation/orange
  chemistry, strong-base-altered chemistry, and any quantitative optical
  profile. Those remain documented refusal/research cases.

The current production result remains the existing refusal/monoprotic path
until Step 3–6 implementation and independent evidence are complete.

## Step 3 — write failing schema and scientific refusal tests after approval

**Files:** `packages/schema/src/indicator-optics.test.ts`,
`packages/sci/src/acidbase/*.test.ts`, and candidate reference tests.

Write tests first for complete fractions, missing forms, missing constants,
strong-acid refusal, balance/charge invariants, and model identity. Verify RED
against the pre-extension implementation. **Complete:** schema, TypeScript,
Rust, and WASM boundary tests now cover the accepted ordinary form set and
refusal-first paths.

## Step 4 — implement exactly the accepted ordinary network

**Files:** `packages/sci/src/acidbase/model.ts`, `solve.ts`, `species.ts`,
`indicator.ts`, `request.ts`, matching schema/identity contracts.

Implement the accepted reactions with existing deterministic math and quantity
boundaries. Include indicator charged forms in the coupled solve. Return tagged
refusals for unmodelled forms and numerical failures. Do not add optical RGB
logic. **Complete for the candidate slice:** the TypeScript reduced solve now
couples indicator charge and ionic strength; the existing production adapter is
not silently switched to this candidate model.

## Step 5 — implement the native/WASM counterpart

**Files:** `native/sci-core/src/lib.rs`, contract/build artifacts, and native
tests.

Derive the same accepted model/config identity from the central contract. Do
not hand-write a second set of constants. Match result/refusal serialization
and diagnostics. **Complete for the candidate fraction bridge:** native host
and dedicated WASM exports derive constants from the shared contract and are
covered by Rust tests, ordinary and coupled TypeScript↔WASM differential
commands. A full production adapter replacement remains out of scope until
Step 7 evidence is accepted.

## Step 6 — independent reference and differential validation

**Files:** independent reference fixtures/derivation and evidence under
`docs/evidence/`.

Run MF-1…MF-10, including the extreme-acid refusal, full balance/conservation
checks, replay with mutable content removed, and TypeScript↔WASM differential
comparison. Quantitative optical enablement remains blocked until Task 8 has an
admitted profile. **Current progress:** the independent Decimal MF matrix,
fixture-driven 11-point ordinary differential, one-point coupled TS↔WASM
differential, and the real World Runtime request-builder replay test pass
locally. Final committed evidence packaging is recorded in the candidate
packet; owner-facing closure remains separate from implementation.

## Step 7 — evidence and migration closure

Update canonical SPEC revision and central versions only when the accepted
implementation contract actually changes. Record model/config/reference hashes,
source provenance, command output, limitations, and the committed CI baseline.
Existing worlds retain their persisted model identity; no migration invents
historic form fractions or optical data. **Complete for this candidate
handoff:** the evidence packet records the contract, reference-manifest, WASM,
commit, and hosted-CI hashes plus reproducible commands. Formal owner-facing
closure, candidate SPEC acceptance, and any production-adapter rollout remain
separate decisions and are not implied by the attestation.

## Final acceptance matrix

| Criterion | Evidence required | Current status |
|---|---|---|
| Species/reactions explicit | candidate spec + source packets | Step 1 complete |
| Constants/provenance complete | reviewed machine-readable records | candidate contract + source checks pass locally; final owner evidence pending |
| Ordinary form balances | independent MF matrix + solver tests | Decimal MF-1…MF-4/MF-8…MF-10 and coupled TypeScript tests pass locally |
| Strong-acid refusal | adversarial MF-7 + DOM/refusal evidence | MF-7 refusal checks pass locally; no DOM is in this science-only candidate |
| Numerical/domain distinction | tagged failure matrix | ordinary invalid/missing-data/refusal paths are covered; production matrix pending |
| TypeScript/WASM differential | native differential report | fixture-driven ordinary and coupled differentials pass locally |
| Replay identity | committed-world replay fixture | MF-9 plus real World Runtime request-builder replay test |
| Optical profile separation | Task 8 registry + optical refusal | qualitative-only; no quantitative profile |

## Local artifact ledger

The following hashes were recorded after a clean local package build. They are
implementation evidence, not a hosted-CI attestation and not a claim that the
candidate is S3:

| Artifact | SHA-256 |
|---|---|
| `contracts/scientific/indicator-multiform.json` | `sha256:0d5873c449fc01e7232043d8321bbbdcf40698c5c7a09894f74aa1e84ca18498` |
| `packages/sci/test/reference/indicator-multiform/manifest.json` | `sha256:90d08e5ca6a8f97b01f15fbe37735c886d4e87b989929570eafcc0209d62af8f` |
| `packages/sci/dist/wasm/chemrealm_sci_core.wasm` | `sha256:c03fc50d7fb8aa6bae79dd9638b14095f1cf919bdfb8e31c64bda93ce05c3887` |

The central version source remains `contracts/version-manifest.json`; generated
TypeScript/Rust sources are checked by `pnpm verify:versions`. Strong-acid
orange/yellow is documented as a refusal boundary only and has no RGB,
spectrum, or production solver path in this candidate.

## Committed-baseline handoff

The candidate implementation and evidence packet are attested at:

| Item | Value |
|---|---|
| Git baseline | `1b91dc1afce56c97adc8e9287dedc17169527a58` |
| Hosted CI run | `34853566212` — success |
| Hosted CI URL | `https://github.com/Zn070515/ChemRealm/actions/runs/34853566212` |

The hosted run covers installation, TypeScript and test typechecks, build,
native/WASM checks, ordinary and coupled differential checks, full tests,
schema/version/governance guards, browser checks, Python reference tests,
PHREEQC validation, and acceptance-coverage mapping. This is committed
implementation evidence; it is not an owner acceptance or an S3 claim.

## Current stop condition

The owner has accepted the ordinary-aqueous candidate scope, and the local
implementation/evidence handoff is complete. Do not switch the existing
production adapter, claim this candidate as S3, or enable an optical tint
until the owner separately accepts the candidate SPEC/evidence packet and a
production rollout decision is recorded. Strong-acid cation/orange remains
refusal-only.
