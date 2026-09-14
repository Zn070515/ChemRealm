# Candidate evidence — ordinary phenolphthalein three-form model

**Status:** S2 candidate evidence; owner-facing closure is pending. This packet
does not promote the candidate to a production adapter, M4 replacement, or
optical colour model.

The accepted scope is the ordinary aqueous three-form network:

```text
H₂In ⇌ H⁺ + HIn⁻ ⇌ H⁺ + In²⁻
```

The strong-acid cation/orange and strong-base-altered regimes remain explicit
refusals. The current implementation contains no orange RGB, spectrum, or
colour decision for those regimes.

## Evidence matrix

| Criterion | Current result | Evidence |
|---|---|---|
| Central model identity and constants | PASS locally | `contracts/version-manifest.json`, `contracts/scientific/indicator-multiform.json`, generated TS/Rust contract sources, and `pnpm verify:versions` |
| Ordinary three-form fractions | PASS locally | `packages/sci/src/acidbase/multiform.test.ts`, Rust indicator tests, and the independent Decimal MF-1…MF-4/MF-8…MF-10 matrix |
| Coupled indicator charge and ionic strength | PASS locally | `solveReducedWithDiproticIndicator()` tests plus the fixture-owned `MF-8` coupled request and `pnpm verify:native-indicator-coupled-differential` |
| Native/WASM ordinary fraction differential | PASS locally | `pnpm verify:native-indicator-differential` over the fixture-owned ordinary cases |
| Native/WASM coupled differential | PASS locally | `pnpm verify:native-indicator-coupled-differential` over `MF-8.coupledRequest` |
| Strong-acid cation boundary | PASS locally | `MF-7`, TypeScript refusal test, Rust refusal test; refusal emits no form set and no optical colour |
| Missing form data | PASS locally | `MF-6` and `refuseMissingPhenolphthaleinFormData()` |
| Independent reference ownership | PASS locally | `uv run pytest tools/oracle/tests/test_indicator_multiform.py -q`; fixture IDs, orphan files, source derivation, and absence of expected-output fields are checked |
| Replay/request identity | PASS locally | `MF-9` plus `apps/web/src/composition.test.ts`; the candidate request is rebuilt from replayed committed world contents after the serialized event log is loaded without authored scenario lookup |
| Quantitative optical enablement | REFUSED / NOT ADMITTED | `MF-10` and the source packet require `OPTICAL_MODEL_DATA_MISSING`; no chemical fraction creates RGB output |

## Reproducible commands

```text
pnpm verify:versions
pnpm verify:native-indicator-differential
pnpm verify:native-indicator-coupled-differential
pnpm verify:indicator-multiform-reference
pnpm exec vitest run packages/sci/src/acidbase/multiform.test.ts apps/web/src/composition.test.ts
cargo test --manifest-path native/sci-core/Cargo.toml --test indicator_multiform
uv run pytest -q

## Local artifact ledger

These hashes were recorded after the local package build that produced the
candidate differential artifact. They bind the evidence packet to concrete
inputs without claiming a hosted-CI attestation or S3 acceptance.

| Artifact | SHA-256 |
|---|---|
| `contracts/scientific/indicator-multiform.json` | `sha256:0d5873c449fc01e7232043d8321bbbdcf40698c5c7a09894f74aa1e84ca18498` |
| `packages/sci/test/reference/indicator-multiform/manifest.json` | `sha256:90d08e5ca6a8f97b01f15fbe37735c886d4e87b989929570eafcc0209d62af8f` |
| `packages/sci/dist/wasm/chemrealm_sci_core.wasm` | `sha256:c03fc50d7fb8aa6bae79dd9638b14095f1cf919bdfb8e31c64bda93ce05c3887` |

The central version source is `contracts/version-manifest.json`; generated
sources are checked by `pnpm verify:versions`. Strong-acid orange/yellow is
documented as `CHEMICAL_FORMS_UNAVAILABLE` only; no orange RGB or spectrum is
implemented or enabled by this candidate.
```

The native differential commands require the freshly built
`packages/sci/dist/wasm/chemrealm_sci_core.wasm`; the package build regenerates
the shared native contract source and WASM artifact from the central manifest.

## Boundary and non-claims

- The existing M4 production adapter remains unchanged; this candidate is not
  silently selected by a display option.
- The candidate has no quantitative optical profile and therefore cannot enable
  an `OPTICAL_MODEL_OK` result or a rendered tint.
- Strong-acid orange/yellow is documented as a research boundary and remains
  `CHEMICAL_FORMS_UNAVAILABLE`; its chemistry and optics require a separately
  accepted model and source packet.
- The TypeScript↔WASM differential is an implementation-consistency check, not
  an independent scientific reference. The Decimal derivation is separate from
  `packages/sci` and owns the MF fixture semantics.
- Final schema/spec acceptance, committed-baseline attestation, and any future
  production-adapter rollout require a separate owner review.
