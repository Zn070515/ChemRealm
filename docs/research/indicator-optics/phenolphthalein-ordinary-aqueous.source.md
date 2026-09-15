# phenolphthalein-ordinary-aqueous source packet

Review status: quantitative profile: **ADMITTED** for the explicitly bounded
ordinary-aqueous pedagogical observation path only.

## Source records

The primary open source is Constantine Kouderis, Stefanos Tsigoias, Panagiota
Siafarika, and Angelos G. Kalampounias, The Effect of Alkali Iodide Salts in
the Inclusion Process of Phenolphthalein in beta-Cyclodextrin: A Spectroscopic
and Theoretical Study, Molecules 28 (2023) 1147, Figure 1:

https://pmc.ncbi.nlm.nih.gov/articles/PMC9920586/

The cited measurement used approximately 5×10^-5 mol/L phenolphthalein in an
aqueous sodium-carbonate medium of approximately 0.02 mol/L, around pH 10, at
20.00 ± 0.01 °C, in a 1 cm quartz cell. The ordinary coloured trace has a
visible maximum near 552 nm. These are the source conditions; they are not
evidence for arbitrary temperature, concentration, pH, or ionic-strength
transfer.

An independent UCRL-965470 report provides the scale anchor
epsilon_N(552 nm) = 2.935×10^4 L mol^-1 cm^-1 and defines attenuation with the
Napierian relation ln(I/I0) = -epsilon_N c L:

https://www.osti.gov/servlets/purl/965470

The two sources are not treated as the same experiment. The review records the
cross-source calibration and its uncertainty as an explicit approximation.

## Extraction and limits

The local profile contains 81 samples from 380 through 780 nm at 5 nm spacing.
The visible shape is a reviewed digitisation/derivation from the ordinary
trace in Figure 1, scaled so the 550/555 nm neighbourhood represents the
independent 552 nm UCRL anchor. The values are derived, not source-tabulated
values; the retained shape/transfer uncertainty is approximately 20% relative.
The profile declares epsilonConvention = napierian, so runtime attenuation uses
exp(-epsilon_N c l).

Neutral lactone and intermediate monoanion visible absorptivities are recorded
as below-sensitivity zero only within this narrow model. This is an explicit
approximation, not a claim that their physical absorption is exactly zero.

The admitted envelope is intentionally narrow:

- solvent: water with the cited sodium-carbonate medium;
- temperature: exactly 293.15 K (the cited 20 °C condition);
- phenolphthalein concentration: exactly 5×10^-5 mol/L;
- optical path: exactly 10 mm (the cited 1 cm cell);
- ionic strength: 0.02–0.06 mol/kg as a labelled transfer-approximation range
  around the cited medium;
- model pH: 9.5–10.5 as a labelled transfer-approximation range around the
  cited pH.

The extreme-acid phenolphthalein cation/orange regime is documented as a future
scientific boundary and remains not implemented and refusal-only. The ordinary
profile cannot emit orange merely because a generic acidic pH was provided.

## Quantitative profile

The quantitative profile is admitted only through the content-addressed
artifact and review record. A colour swatch is not a substitute for the
profile, and no render component may override an optical refusal.
