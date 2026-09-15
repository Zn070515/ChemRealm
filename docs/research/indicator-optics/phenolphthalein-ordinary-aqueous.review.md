# phenolphthalein-ordinary-aqueous review

decision: quantitative

## Decision

The ordinary aqueous profile is admitted for a narrow, explicitly labelled
production observation envelope. It is not a universal phenolphthalein
spectrum and it does not admit the strong-acid cation/orange regime.

The profile uses the central manifest's indicator optical profile version. Its
profile hash is:

sha256:8d02fca6fbf715f9a15ee6366e981afde9a68b5062ac8f9cffae3bdcfb03a872

The hash must equal the canonical SHA-256 of
phenolphthalein-ordinary-aqueous.profile.json with profileHash removed. The
registry, schema parser, and optical adapter reject a stale or tampered
payload.

## Evidence and transformation

The source authors are Constantine Kouderis, Stefanos Tsigoias, Panagiota
Siafarika, and Angelos G. Kalampounias. The ordinary visible trace is from
Figure 1 of the cited Molecules paper and is sampled/derived on the complete
380–780 nm, 5 nm grid. The numerical scale is tied to the independent UCRL
epsilon_N(552 nm)=2.935×10^4 anchor. The source figure is not copied into the
repository; the checked-in samples are a digitised derived record with
approximately 20% relative shape/transfer uncertainty.

The runtime uses the declared Napierian convention (exp(-epsilon_N c l)).
Neutral lactone and intermediate monoanion visible absorption are
below-sensitivity zero only inside this bounded observation model.

## Runtime limits and colour review

- solvent: water/sodium-carbonate medium;
- temperature: 293.15 K only;
- indicator concentration: 5×10^-5 mol/L only;
- optical path: 10 mm only;
- ionic strength: 0.02–0.06 mol/kg transfer-approximation range;
- pH: 9.5–10.5 transfer-approximation range;
- strong-acid phenolphthalein orange: documented, not implemented/refusal-only.

The production transform uses the checked-in CIE D65 / CIE 1931 2° table,
blank XYZ normalization, and IEC sRGB encoding. The fully coloured quinoid
fixture is reviewed against a broad pink/fuchsia chromatic region; this is a
QA disposition for the admitted empirical spectrum, not an RGB endpoint
fallback or a first-principles colour law.

No pH threshold, endpoint palette, or swatch is used as a fallback. The
production result is accepted only when the Beer–Lambert and CIE/sRGB pipeline
returns OPTICAL_MODEL_OK inside the declared coverage.
