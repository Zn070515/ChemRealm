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
profile. It implements trapezoidal integration, blank XYZ normalization, the
IEC D65 XYZ-to-linear-sRGB matrix, the sRGB transfer function, and a separate
standard-library Beer–Lambert calculation. It does not import `@chemrealm`
packages or call `observeIndicatorOptics`.

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

This packet validates numerical agreement with the declared abridged table and
transform. It does not claim equivalence with a 1 nm colour-science library or
with PHREEQC, and it does not remove the ordinary-profile coverage/refusal
boundary. Strong-acid phenolphthalein orange remains refusal-only.
