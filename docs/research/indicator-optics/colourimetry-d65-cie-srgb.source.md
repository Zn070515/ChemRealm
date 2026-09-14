# CIE D65 / CIE 1931 2° / sRGB reference packet

## Status

- candidate: `colourimetry-d65-cie-srgb`
- review status: `reference-only`
- quantitative indicator profile: **NOT ADMITTED**

## Citation and source

- Citation: Commission Internationale de l'Éclairage, *Colorimetry — 4th
  Edition* (CIE 015:2018), and the CIE Color Data Registry.
- Source URL: <https://www.cie.co.at/publications/colorimetry-4th-edition>
- Machine-readable registry URL:
  <https://registry.color.org/colorimetry-data/>
- Accessed on: 2026-09-14.

The registry is the reference for the CIE D65 relative spectral power
distribution and CIE 1931 2° colour-matching-function data used by a future
optical integration. The sRGB IEC 61966-2-1 encoding is a declared output
transform, not an indicator spectrum.

## Extraction and precision

No source array is copied into a production profile in this packet. The
reference JSON records wavelength interval and transform metadata only. No
source precision is promoted, no digitisation is performed, and no colour
value is inferred for an indicator without an indicator-specific spectrum.

## Rights and conditions

The external registry remains the source of the reference arrays. Reusable
rights for copied arrays have not been admitted here. Indicator concentration,
optical path length, solvent, temperature, and acidity conditions are not
supplied by this colourimetry packet.

## Review decision

This packet can define the transform boundary after a future review, but it
cannot promote a `lambdaMax`, a palette swatch, or any missing indicator
spectrum into a quantitative observation. The production policy remains
refusal-first.
