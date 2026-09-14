# Indicator optical evidence registry

This directory is the evidence boundary for indicator colour observation. It is
not a palette shortcut and it is not a claim that a cited paper has been
converted into a production spectrum.

## Policy

The registry is refusal-first:

- a candidate is `qualitative-only` until a reviewer admits a reproducible,
  multi-point optical profile;
- a single reported `lambdaMax` is never enough to create a profile;
- a quantitative profile requires source conditions, rights/permission,
  machine-readable or reviewed digitised data, precision/uncertainty metadata,
  at least two samples per chemical form, and a content hash;
- colourimetry is a separate transform/reference packet. D65, the CIE 1931 2°
  observer, and sRGB are not themselves indicator spectra;
- the strong-acid phenolphthalein cation is recorded as a research candidate,
  not silently promoted to the ordinary aqueous endpoint model.

`profile-registry.json` is the index. Each entry points to a source packet. The
source packets record what the source establishes, what it does not establish,
and why no unsupported precision or usage right is being claimed. At this
stage all five candidates remain qualitative-only; no optical profile artifact
is admitted into the production path.

The current runtime therefore remains conservative: an optical observation is
`OPTICAL_MODEL_REFUSED` unless a later, independently reviewed profile passes
the schema, provenance, condition, and hash gates. This is intentional. A
visually plausible RGB value is not evidence of a scientifically valid
indicator observation.

## Reference layers

1. Indicator form evidence: molecular form and qualitative colour behaviour.
2. Quantitative optical profile: wavelength/concentration/path-length samples,
   with an explicit Beer–Lambert interpretation and uncertainty.
3. Colourimetry transform: illuminant, observer, spectral integration, and
   sRGB encoding.

Only layer 2 may be admitted as an optical profile. Layer 1 alone remains
qualitative-only, and layer 3 cannot supply missing indicator spectra.

Run the registry gate with:

```text
pnpm verify:indicator-profiles
```

The gate checks registry/source correspondence, refusal-first status, source
fidelity fields, quantitative admission prerequisites, and content hashes. It
does not replace scientific review of a future quantitative profile.
