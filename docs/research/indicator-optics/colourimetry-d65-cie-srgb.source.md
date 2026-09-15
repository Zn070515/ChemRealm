# CIE D65 / CIE 1931 2° / sRGB production reference packet

## Status

- candidate: colourimetry-d65-cie-srgb
- review status: admitted production colourimetry artifact
- indicator spectra: not supplied by this packet
- local artifact: packages/render/src/observable/colourimetry-cie-d65-1931-2deg-5nm.json

This packet admits only the colourimetry transform. It does not turn a colour
word, a swatch, or a reported wavelength maximum into an indicator spectrum.
The indicator-specific profile remains a separate, source-reviewed artifact.

## Citation and source data

The local table is derived from the CIE machine-readable data sets:

- CIE, CIE standard illuminant D65, DOI 10.25039/CIE.DS.hjfjmt59,
  https://files.cie.co.at/Publications-datasets/CIE_std_illum_D65.csv;
  source MD5 03d4eb9b837c60671627c946fb534deb.
- CIE, CIE 1931 standard colorimetric observer colour-matching functions,
  DOI 10.25039/CIE.DS.xvudnb9b,
  https://files.cie.co.at/Publications-datasets/CIE_xyz_1931_2deg.csv;
  source MD5 17cca777db64b17170f06f67ce9d3ab7.
- The output encoding is the IEC 61966-2-1 sRGB D65 transform.

The source data was accessed on 2026-09-15. The repository artifact selects
the exact 1 nm source rows at a uniform 5 nm interval from 380 through 780 nm
(81 rows). It does not interpolate the CIE arrays and does not copy any
indicator spectrum.

## Numerical convention

For transmittance T(lambda), the Representation Engine integrates
T(lambda) times D65(lambda) times each CIE 1931 colour-matching function with
trapezoidal quadrature. Each transmitted component is normalized by the
corresponding blank integral from the same table, then scaled to the IEC D65
reference white (0.95047, 1, 1.08883) before the standard XYZ-to-linear-sRGB
matrix and sRGB transfer function. Therefore a transparent blank is white
within the declared quadrature/transform tolerance.

This packet is a numerical reference for a deterministic local transform. It
does not claim that the 5 nm quadrature is identical to a 1 nm integration;
the source datasets and local sampling interval are explicit so the difference
can be reproduced.

An independent numerical oracle is recorded in
`colourimetry-independent-oracle.json` and described in
`colourimetry-independent-oracle.source.md`. Its Python standard-library
derivation is separate from the TypeScript Representation Engine and covers
transparent, neutral-grey, narrow-band, and admitted phenolphthalein vectors.

## Rights and boundary

The CIE files remain the external source records. The local artifact records
dataset identifiers and checksums and is used only as the checked-in
colourimetry reference. A quantitative indicator profile must separately
declare its source conditions, absorptivity convention, uncertainty, and
content hash. Missing indicator data remains a refusal, never a colourimetry
fallback.
