# phenolphthalein-ordinary-aqueous source packet

**Review status:** quantitative profile: **ADMITTED** for the explicitly
bounded ordinary-aqueous pedagogical observation path only.

## Source records

The primary open source is Alim et al., *The Effect of Alkali Iodide Salts in
the Inclusion Process of Phenolphthalein in beta-Cyclodextrin: A Spectroscopic
and Theoretical Study*, **Molecules 28 (2023) 1147**, Figure 1:

<https://www.mdpi.com/1420-3049/28/3/1147>

The article reports a UV–Vis measurement with a 1 cm quartz cell, an aqueous
phenolphthalein solution at `5e-5 mol/L`, and a measurement temperature of
`20.00 ± 0.01 °C`. Its visible phenolphthalein trace has a principal peak near
`552.1 nm`. The article is published under an open licence. This repository
stores derived numeric samples only; it does not redistribute the source
figure.

An independent UCRL-965470 report provides the scale anchor
`epsilon(552 nm) = 2.935e4 L mol^-1 cm^-1` with its own uncertainty statement:

<https://www.osti.gov/servlets/purl/965470>

The two sources are not treated as the same experiment. The profile review
records the cross-source calibration and bounds it as an approximation.

## Extraction and limits

The checked-in 500/510/520 nm values are digitised/derived from the ordinary
visible trace in Figure 1 and scaled with the independent 552 nm anchor. They
are not source-tabulated values. The retained uncertainty is approximately
20% relative for the visible-grid shape, plus the limits of transferring the
20 °C source observation to the declared 20–25 °C production range.

The neutral lactone and intermediate monoanion are represented as zero visible
absorptivity in this bounded profile because the cited ordinary visible
observation treats the coloured quinoid form as the visible absorber. This is a
below-sensitivity approximation, not a claim that their physical absorption
is mathematically zero.

The profile is admitted only for ordinary aqueous phenolphthalein around
`pH 9.5–10.5`, approximately `5e-5 mol/L`, a 10 mm path, and
`I_m <= 0.12 mol/kg`. It must refuse outside those conditions. Strong-acid
phenolphthalein cation/orange is a documented scientific boundary and remains
**not implemented** and **refusal-only**.

## Quantitative profile

The quantitative profile is admitted only through the content-addressed
artifact and its review record. A colour swatch is not a substitute for this
profile, and no render component may override an optical refusal.
