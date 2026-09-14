# Phenolphthalein multiform reference matrix — candidate

> This is an independent reference plan, not production solver output. It
> contains no copied spectrum and no unreviewed equilibrium constants.

## Scope

The matrix covers the candidate ordinary aqueous forms:

```text
H₂In (neutral-lactone) ⇌ H⁺ + HIn⁻ (intermediate-monoanion)
HIn⁻ (intermediate-monoanion) ⇌ H⁺ + In²⁻ (quinoid-base)
```

The `strong-acid-cation` candidate is a refusal case, not an expected ordinary
aqueous result. The matrix must never make a renderer colour decision.

## Required independent cases

| Case | Input regime | Expected scientific assertion |
|---|---|---|
| MF-1 | ordinary acidic aqueous, finite indicator dose | ordinary form set only; fractions finite, non-negative, sum to one |
| MF-2 | first-transition neighbourhood | H₂In/HIn⁻ balance responds continuously to `Ka_In_1`; no threshold branch |
| MF-3 | second-transition neighbourhood | HIn⁻/In²⁻ balance responds continuously to `Ka_In_2`; quinoid form is not inferred from a colour token |
| MF-4 | alkaline ordinary aqueous within declared domain | quinoid fraction and all balances remain source/model consistent |
| MF-5 | zero or invalid indicator dose | explicit invalid-input/refusal result; no fabricated fractions |
| MF-6 | missing `Ka_In_1` or `Ka_In_2` provenance | `FORM_DATA_MISSING`; no partial `OK` result |
| MF-7 | strong-acid regime requiring the cation | `FORM_OUT_OF_DOMAIN`; no `strong-acid-cation` fraction and no orange optical result |
| MF-8 | same accepted request in TypeScript and Rust/WASM | identical status, model identity, source replay identity, and declared numerical agreement |
| MF-9 | committed world replay with current content removed | same accepted/refused result from persisted identity and world inputs |
| MF-10 | ordinary chemical result with no admitted spectrum | chemical result may be `OK`, downstream optical result is `OPTICAL_MODEL_DATA_MISSING` |

## Assertions required for accepted cases

For every accepted case, the independent reference implementation must record:

- canonical input quantities and source/provenance identifiers;
- `m_In,total`, each active form amount, and each fraction;
- charge-balance residual;
- indicator mass-balance residual;
- ionic-strength fixed-point residual;
- temperature, solvent, and model/config identity;
- numerical tolerance and deterministic-math policy;
- whether the result is inside the proposed domain.

The independent implementation must not import `packages/sci`, call the
production adapter, or read a production expected-output file. It may consume
the accepted constant manifest after owner review, but its calculations must
remain independently implemented and reviewable.

## Refusal assertions

The matrix must fail if any implementation:

- emits a three-form `OK` result for the strong-acid cation regime;
- omits a required form while returning `OK`;
- reuses the old monoprotic constant without an explicit model mapping;
- converts a refusal to a qualitative endpoint colour;
- reports a result whose fractions do not sum within the declared tolerance;
- accepts a source/profile whose provenance or identity is missing.
