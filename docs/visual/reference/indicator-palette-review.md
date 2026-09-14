# Indicator palette contract review

Status: `m5-contract-reviewed`

Reviewed: `2026-09-14`

This record reviews the M5 representation contract, not the final M6 apparatus
art, renderer appearance, or owner visual acceptance. The four endpoint tokens
are qualitative presentation approximations selected to preserve the observed
indicator identity and acid/base direction described by the cited chemistry
references. They are not first-principles colour calculations, calibrated
spectrophotometer values, or a claim that a rendered pixel is an exact physical
measurement.

The reviewed registry is:

- `indicator-palette/phenolphthalein`
- `indicator-palette/methyl-orange`

Each registry entry names its indicator, two labelled swatches, source claims,
and this review record. The render transform may interpolate between the two
declared endpoint tokens using the Scientific Core's protonation ratio; it may
not infer equilibrium, select another indicator's palette, or embed a separate
chemical colour literal.

M6 remains responsible for concrete apparatus assets, final renderer
realization, screenshots, and owner visual review. Those downstream deliverables
do not retroactively change this M5 contract record.
