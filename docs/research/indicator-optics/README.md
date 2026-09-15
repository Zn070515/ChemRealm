# Indicator optical evidence registry

This directory is the evidence boundary for indicator colour observation. It
is not a palette shortcut and it is not a claim that a cited paper has been
converted into a universal spectrum.

## Policy

The registry is refusal-first:

- a candidate is qualitative-only until a reviewer admits a reproducible,
  multi-point optical profile;
- a single reported lambda maximum is never enough to create a profile;
- a quantitative profile requires source conditions, rights/permission,
  machine-readable or reviewed digitised data, precision/uncertainty metadata,
  at least two samples per chemical form, and a content hash;
- production colourimetry is a separate checked-in CIE D65 / CIE 1931 2° /
  sRGB transform artifact. It cannot supply missing indicator spectra;
- the strong-acid phenolphthalein cation is recorded as a research candidate,
  not silently promoted to the ordinary aqueous endpoint model.

The registry currently admits exactly one bounded quantitative profile:
phenolphthalein-ordinary-aqueous. Its full 380–780 nm profile is paired with
the production CIE table, but the profile is only valid at its declared source
conditions. The five other candidates remain qualitative-only.

profile-registry.json is the index. Each entry points to a source packet. The
source packets record what the source establishes, what it does not establish,
and why no unsupported precision or usage right is being claimed.

The current runtime therefore remains conservative: an optical observation is
OPTICAL_MODEL_DATA_MISSING or OPTICAL_MODEL_OUT_OF_COVERAGE unless an
independently reviewed profile passes the schema, provenance, condition, grid,
and hash gates. A visually plausible RGB value is not evidence of a valid
indicator observation.

## Reference layers

1. Indicator form evidence: molecular form and qualitative colour behaviour.
2. Quantitative optical profile: wavelength/concentration/path-length samples,
   with an explicit Beer–Lambert logarithm convention and uncertainty.
3. Production colourimetry transform: CIE D65, CIE 1931 2° integration, blank
   normalization, and IEC sRGB encoding.

Only layer 2 may admit an indicator spectrum. Layer 1 remains qualitative-only,
and layer 3 cannot substitute for layer 2.

The historical optics-reference-vectors.json is deliberately test-only. It
proves small Beer–Lambert arithmetic cases; it is never imported by production
optics and never represents CIE data.

Run the registry gate with:

    pnpm verify:indicator-profiles

The gate checks registry/source correspondence, refusal-first status, source
fidelity fields, production CIE coverage, quantitative profile conditions,
epsilon convention, and content hashes. It does not replace scientific review
of a future profile.
