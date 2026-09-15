# Independent colourimetry oracle packet

## Purpose

`colourimetry-independent-oracle.json` is a frozen numerical oracle for the
Representation Engine's CIE/Beer–Lambert transform. It is not a second
production implementation and it does not grant any indicator spectrum
admission. Its purpose is to catch a production transform regression when the
expected vector was calculated outside the TypeScript runtime.

## Independent derivation

`tools/research/build_indicator_colourimetry_oracle.py` uses only Python's
standard library, the checked-in CIE table, and the admitted phenolphthalein
profile. It implements trapezoidal integration, the production method's
per-channel blank XYZ normalization, an independent single-common-k CIE XYZ
calculation, the IEC D65 XYZ-to-linear-sRGB matrix, the sRGB transfer
function, and a separate standard-library Beer–Lambert calculation. It does
not import `@chemrealm` packages or call `observeIndicatorOptics`.

The production/reference transform is intentionally named an
**abridged-grid D65 whitepoint-corrected transform**. The method-level
cross-check uses one common normalization constant,
`k = Yn / integral(blank × D65 × y-bar)`, for all three tristimulus
components. For each vector, the artifact records common-k XYZ/sRGB values,
chromaticity x/y, and deltas defined as **common-k minus production**. This
answers whether the per-channel blank correction introduces a material
difference on the exact admitted grid instead of allowing the independent
oracle to silently repeat the production formula.

The frozen vectors cover four different failure surfaces:

- transparent white transmission;
- wavelength-independent neutral 50% transmission;
- a synthetic narrow absorber at 550 nm;
- the admitted phenolphthalein quinoid profile at its stated source condition.

Each vector records its complete 81-point transmittance trace, XYZ values, and
sRGB values. The artifact also records SHA-256 hashes of the exact CIE and
phenolphthalein inputs. `--check` recomputes the independent derivation and
rejects stale or hand-edited output.

The Vitest oracle test then passes independently constructed profiles through
the production adapter and compares the result with these frozen vectors. The
test uses tolerances appropriate to the production deterministic double
arithmetic; it does not import the Python implementation to calculate its
expected values at assertion time.

The maximum absolute method differences over the four vectors are frozen in
the artifact: `0.0001049657309100116` in XYZ,
`0.000017477921710418176` in chromaticity x/y, and
`0.00005637158019111688` in encoded sRGB. This packet validates numerical
agreement with the declared abridged table and records the bounded difference
between two normalization conventions. It does not claim equivalence with a
1 nm colour-science library or with PHREEQC, and it does not remove the
ordinary-profile coverage/refusal boundary. Strong-acid phenolphthalein orange
remains refusal-only.
