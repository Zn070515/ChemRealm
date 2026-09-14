# phenolphthalein-ordinary-aqueous review

decision: quantitative

## Decision

The ordinary aqueous profile is admitted for a narrow, explicitly labelled
production observation envelope. It is not a universal phenolphthalein
spectrum and it does not admit the strong-acid cation/orange regime.

The profile hash is:

`sha256:5f9682e38f9b6608bf3c6dc6d58afa8c7b9becd83b7bd137a8b4833dc10d9975`

The hash must equal the canonical SHA-256 of
`phenolphthalein-ordinary-aqueous.profile.json` with `profileHash` removed.
The registry, schema parser, and optical adapter must all reject a stale or
tampered payload.

## Evidence and transformation

The visible shape is digitised from the ordinary phenolphthalein trace in Alim
et al., Figure 1 (open publication). The numerical scale is calibrated with
the independent UCRL-965470 epsilon(552 nm) anchor. The source figure is not
copied into the repository. The resulting 500/510/520 nm samples retain an
approximately 20% relative digitisation/transfer uncertainty.

The neutral-lactone and intermediate-monoanion spectra are treated as below-
sensitivity zero within this narrow visible observation model. This is a
declared approximation and is not used outside the profile coverage.

## Runtime limits

- solvent: water;
- temperature: 20–25 °C transfer-approximation range;
- indicator concentration: approximately `5e-5 mol/L`;
- optical path: 10 mm;
- pH: 9.5–10.5;
- ionic strength: `I_m <= 0.12 mol/kg`;
- all three ordinary Scientific Core forms must be present;
- strong-acid cation/orange remains refusal-only.

No RGB endpoint palette, pH threshold, or swatch is used as a fallback. The
production result is accepted only when the Beer–Lambert and D65/CIE/sRGB
pipeline returns `OPTICAL_MODEL_OK`.
