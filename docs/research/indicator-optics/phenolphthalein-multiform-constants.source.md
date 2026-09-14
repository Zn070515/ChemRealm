# Phenolphthalein ordinary multiform equilibrium constants

## Status

- candidate model: ordinary aqueous H₂In/HIn⁻/In²⁻
- implementation scope: accepted ordinary three-form chemistry only
- quantitative optical profile: **not admitted by this record**
- strong-acid cation/orange chemistry: **documented refusal-only; not implemented**

## Source

Tamura et al., “Spectrophotometric Analysis of the Relationship between
Dissociation and Coloration, and of the Structural Formulas of Phenolphthalein
in Aqueous Solution” (1996), *Analytical Sciences* 12, 927–931, DOI
10.2116/analsci.12.927.

Source URL: <https://www.jstage.jst.go.jp/article/analsci1985/12/6/12_6_927/_article>.
Accessed on 2026-09-14. The source reports the ordinary phenolphthalein
dissociation values as pK₁ = 9.05 and pK₂ = 9.50 in an aqueous buffer context.

## Admitted numerical derivation

The language-neutral contract at
[`contracts/scientific/indicator-multiform.json`](../../../contracts/scientific/indicator-multiform.json)
stores the derived canonical values used by the candidate model:

```text
Ka_In_1 = 10^(-9.05) = 8.912509381337459e-10
Ka_In_2 = 10^(-9.50) = 3.1622776601683795e-10
```

The pKa values are logarithmic source values reported to two decimal places.
The last displayed decimal therefore carries approximately ±0.005 pKa
rounding uncertainty; the derived Ka values retain a deterministic decimal
representation for identity, but the source precision is not claimed to be
more than the propagated uncertainty supports. Runtime code does not recompute
from a different rounded pKa.

The charged-form activity coefficients use the accepted Davies model at the
model's declared ionic-strength domain. The neutral lactone coefficient is
explicitly pinned to γ = 1 as a candidate approximation. It is not borrowed
from acetic acid and is not presented as an experimentally universal value.

## Boundary and non-goals

This record supports only the ordinary three-form equilibrium network:

```text
H₂In ⇌ H⁺ + HIn⁻
HIn⁻ ⇌ H⁺ + In²⁻
```

It does not provide a quantitative spectrum, molar absorptivity, colour
palette, endpoint threshold, or strong-acid cation constant. The literature
record for extreme-acid phenolphthalein orange/yellow behaviour remains a
separate qualitative research packet. The current implementation must return
an explicit refusal rather than invent that form or colour.

## Machine-readable identity

The JSON contract records the source citation and derived constants. The model
ID and model version used in runtime identity are read from
`contracts/version-manifest.json`; the JSON contract deliberately does not
duplicate a model version. Any change to a constant or source derivation is a
scientific contract change and requires a new review/evidence baseline.
