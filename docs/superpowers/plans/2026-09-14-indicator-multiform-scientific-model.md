# Indicator multiform scientific model implementation plan

> **Status:** Step 2 accepted on 2026-09-14 for the ordinary-aqueous
> three-form scope. Strong-acid cation/orange remains refusal-only and is not
> authorized for implementation.

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
against the pre-extension implementation.

## Step 4 — implement exactly the accepted ordinary network

**Files:** `packages/sci/src/acidbase/model.ts`, `solve.ts`, `species.ts`,
`indicator.ts`, `request.ts`, matching schema/identity contracts.

Implement the accepted reactions with existing deterministic math and quantity
boundaries. Include indicator charged forms in the coupled solve. Return tagged
refusals for unmodelled forms and numerical failures. Do not add optical RGB
logic.

## Step 5 — implement the native/WASM counterpart

**Files:** `native/sci-core/src/lib.rs`, contract/build artifacts, and native
tests.

Derive the same accepted model/config identity from the central contract. Do
not hand-write a second set of constants. Match result/refusal serialization
and diagnostics.

## Step 6 — independent reference and differential validation

**Files:** independent reference fixtures/derivation and evidence under
`docs/evidence/`.

Run MF-1…MF-10, including the extreme-acid refusal, full balance/conservation
checks, replay with mutable content removed, and TypeScript↔WASM differential
comparison. Quantitative optical enablement remains blocked until Task 8 has an
admitted profile.

## Step 7 — evidence and migration closure

Update canonical SPEC revision and central versions only when the accepted
implementation contract actually changes. Record model/config/reference hashes,
source provenance, command output, and limitations. Existing worlds retain
their persisted model identity; no migration invents historic form fractions or
optical data.

## Final acceptance matrix

| Criterion | Evidence required | Current status |
|---|---|---|
| Species/reactions explicit | candidate spec + source packets | Step 1 complete |
| Constants/provenance complete | reviewed machine-readable records | not yet accepted |
| Ordinary form balances | independent MF matrix + solver tests | not run |
| Strong-acid refusal | adversarial MF-7 + DOM/refusal evidence | not run |
| Numerical/domain distinction | tagged failure matrix | not run |
| TypeScript/WASM differential | native differential report | not run |
| Replay identity | committed-world replay fixture | not run |
| Optical profile separation | Task 8 registry + optical refusal | qualitative-only; no quantitative profile |

## Stop condition

Stop after Step 2 until the owner explicitly accepts the candidate scientific
sub-specification. Do not implement or enable a multi-form solver merely
because the current schema can carry a list of forms.
