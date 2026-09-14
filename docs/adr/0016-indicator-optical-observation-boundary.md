# ADR-0016 — Indicator Optical Observation Boundary

- **Status:** Candidate — subordinate to the current `SPEC-0001` candidate revision
- **Date:** 2026-09-14
- **Decision owners:** Project owner; Scientific Reality and Representation
  maintainers for implementation review
- **Scope:** The data-backed indicator optical observation pipeline. One
  ordinary-aqueous phenolphthalein profile is locally admitted inside its
  bounded source conditions; M5 S3 and owner acceptance remain separate gates.
- **Supersedes:** The implication that the M5 qualitative palette is a
  spectrophotometric model. It does not supersede the historical M5 palette
  evidence.

## Context

The original M5 indicator tint was an identity-keyed qualitative presentation
contract. It was intentionally not a measurement model: it had no
wavelength-dependent absorptivity, indicator dose, optical path, illuminant,
observer convention, or coverage declaration. Treating an endpoint RGB token as
chemistry would make a missing model look like a result. One ordinary-aqueous
phenolphthalein profile is now locally admitted under this ADR's bounded
production contract; the historical palettes remain qualitative QA material.

The next optical work must therefore be admitted as a versioned, local,
content-addressed contract. Its implementation is subordinate to the
canonical `SPEC-0001` amendment and must preserve the four-core boundary.

## Decision

We will introduce a refusal-first optical observation boundary with three
tagged statuses:

- `OPTICAL_MODEL_OK` means that a reviewed spectral profile, chemical-form
  observation, dose, path, and declared conditions all cover the request.
- `OPTICAL_MODEL_OUT_OF_COVERAGE` means the model or profile is known but the
  requested form, condition, concentration, path, or convention is outside its
  declared validity.
- `OPTICAL_MODEL_DATA_MISSING` means the chemical state or historical world is
  usable, but a required reviewed optical datum is absent.

Neither refusal status may return an endpoint-RGB substitute. The M5
qualitative palettes and reference swatches remain historical/interim QA
evidence and are not a fallback or production source for the optical model.

### Four-core ownership

| Core | Owns | Must not do |
|---|---|---|
| Scientific Reality Core | Chemical forms, fractions, model identity, scientific coverage, and refusal of unsupported forms | Choose RGB, illuminant, glass, or renderer effects |
| World Runtime | Frozen indicator dose, profile/path references, transfer conservation, replay identity, and migration/refusal | Solve chemistry or calculate colour |
| Representation Engine | Profile validation, Beer–Lambert transmission, illuminant/observer transform, deterministic tint, and optical coverage status | Invent chemical forms, pH thresholds, constants, or spectra |
| Renderer | Compose the approved tint/status with glass, liquid material, lighting, and geometry | Infer chemistry or use alpha as a substitute for optical depth |
| ACE | Explain availability and limitations and adapt teaching language | Change dose, forms, path, chemistry, or optical status |

Chemical-form coverage and optical coverage are separate decisions. A
Scientific Core may provide an accepted form fraction while the Representation
Engine returns `OPTICAL_MODEL_DATA_MISSING` or
`OPTICAL_MODEL_OUT_OF_COVERAGE`. An optical profile cannot manufacture a form
that the Scientific Core did not provide.

### Frozen identity and fixed path scope

Indicator dose, optical profile identity, and effective path-rule identity are
genesis-owned scientific/representation inputs. The persisted world stores
serializable, content-addressed records; it does not store executable
functions. A profile or path artifact must pass payload-hash verification
before an executable adapter is constructed.

The initial optical path contract is the fixed-path contract v1 scope: a fixed,
versioned effective path rule.
It is not a claim that liquid height, camera distance, glass thickness, or
display alpha is a physical path length. Path validity and provenance are part
of the frozen input. A future view-dependent or physically based optical path
requires a separate amendment.

World migration must never invent a historical indicator dose, profile,
spectrum, or path. A historic world without those inputs remains chemically
replayable and returns `OPTICAL_MODEL_DATA_MISSING` for optical observation.

### v0 phenolphthalein boundary

The v0 monoprotic acid-base model does not supply the extreme-acidity
phenolphthalein cation. Therefore v0 cannot emit strong-acid phenolphthalein
orange. The orange case can be displayed only after a separate Scientific
Reality model supplies that form fraction and a reviewed optical profile covers
the stated acidity. A generic acidic pH or a two-form protonation ratio is not
permission to emit orange.

### Deterministic and privacy boundary

The Representation Engine consumes checked-in profile data and pinned
illuminant/observer/colour-transform data. Beer–Lambert transmission and the
display transform are deterministic and local. No camera sampling, display
calibration upload, network lookup, learner image, account, or telemetry is
needed. Any such feature requires a separate privacy decision.

## Consequences

Positive consequences:

- Missing scientific data is visible instead of being disguised by a familiar
  colour.
- Dose, path, profile, and replay identity can be tested at their owning
  boundaries.
- A future Rust/WASM implementation can consume the same language-neutral
  profile/transform contract without changing the renderer boundary.
- Phenolphthalein's ordinary colourless, alkaline pink, and extreme-acid orange
  cases cannot be conflated by a pH shortcut.

Costs and limitations:

- A quantitative `OPTICAL_MODEL_OK` result requires reviewed spectra and
  colourimetry data; a colour word or lone wavelength maximum is insufficient.
- M5's qualitative palette and swatches may support visual QA and historical
  fixtures, but they cannot supply production tint or quantitative optical
  claims.
- Quantitative profiles remain limited to their sourced solvent, temperature,
  concentration, path, acidity/ionic-strength, and linearity domains.

## Required evidence before implementation claims completion

The canonical SPEC must define AC-O1 through AC-O8 before versioned optical
artifacts are admitted. Evidence must include source/provenance review,
profile and path hash checks, Beer–Lambert reference vectors, refusal cases,
indicator-dose conservation, replay/cache independence, renderer boundary
checks, and committed-baseline browser evidence. The ordinary profile now has
local source/review and production-path evidence, but M5 S3, hosted
attestation, and owner acceptance remain separate gates; this ADR does not
authorize M6 by itself. Strong-acid phenolphthalein orange remains
documented and refusal-only.
