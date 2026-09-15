# M5 Optical Colourimetry Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Optical implementation and evidence closure are in progress on the
current round; the previous corrected baseline was attested, while the raw
digitisation rebuild and independent oracle require a fresh hosted attestation.
Owner acceptance of the candidate amendments remains open.

**Goal:** Replace the invalid three-point production colour path with a source-attributed, full-visible-spectrum colourimetry transform whose optical constants and evidence cannot be mistaken for a test fixture.

**Architecture:** The Representation Engine will consume a checked-in CIE D65/1931-2° reference table and a separately reviewed phenolphthalein spectral profile. The profile declares whether its absorptivity is Napierian or decadic; the transform normalizes transmitted tristimulus values against the same blank illuminant before sRGB encoding. The Scientific Core remains the sole owner of chemical form fractions, and strong-acid phenolphthalein orange remains refusal-only.

**Tech Stack:** TypeScript, Zod schemas, Vitest, JSON source artifacts, Node verification scripts, Markdown evidence packets, CIE machine-readable reference tables.

**Spec:** `docs/superpowers/specs/2026-09-14-indicator-optical-observation.md`, with a new canonical SPEC amendment recorded before the corrected optical evidence is accepted.

## Global Constraints

- Production optical output is refusal-first; missing or out-of-coverage data never receives a palette fallback.
- Production colourimetry uses a checked-in CIE D65 and CIE 1931 2° table covering 380–780 nm at no more than 5 nm spacing.
- The three-point `optics-reference-vectors.json` remains test-only and is never imported by production optics code.
- Beer–Lambert absorptivity declares its logarithm convention; UCRL-965470's `2.935e4` anchor is treated as Napierian unless a source record proves otherwise.
- CIE integration normalizes the illuminant/observer blank before XYZ-to-sRGB conversion; a transparent blank must map to D65 white, not a clamped saturated colour.
- Source conditions and uncertainty are not widened beyond the cited experiment without an explicit transfer-approximation label.
- Strong-acid phenolphthalein orange is documented as a future/refusal boundary and is not emitted by the current production model.
- `contracts/version-manifest.json` is the sole manually maintained version source; generated TypeScript/schema artifacts must be regenerated rather than hand-edited.
- This correction does not promote any M5/M6 status. M6 remains an explicit owner-authorization gate until the corrected evidence is attested and the applicable candidate amendments are accepted.

## Acceptance Boundary

This plan is complete only when the repository can demonstrate all of the following:

- production optics does not import or consume the test-only three-point table;
- production colourimetry has a source-backed 380–780 nm grid with 5 nm or finer spacing and a matching profile grid including the 552 nm neighbourhood;
- a transparent blank produces approximately `[1, 1, 1]` sRGB under the declared normalization;
- a Napierian UCRL anchor uses `exp(-epsilon_N * c * l)` (or an explicitly documented equivalent conversion), and a decadic fixture continues to use `10^-A` only when it declares the decadic convention;
- the ordinary phenolphthalein positive result is tested for a pink/fuchsia chromatic region, not merely positive tint strength;
- source authors, conditions, extraction uncertainty, and quantitative admission wording are faithful to the cited records;
- canonical SPEC revision and M5 evidence no longer claim S3 while an applicable optical criterion remains partial or superseded;
- all focused tests, guards, build, and repository checks pass on the committed baseline.

## Task 1: Lock the scientific failures with red tests

**Files:**
- Modify: `packages/render/src/observable/optics.test.ts`
- Create: `packages/render/src/observable/production-colourimetry.test.ts` if a focused module test is useful
- Modify: `tools/check_indicator_optical_profiles.mjs`
- Modify: `tools/check_indicator_optics_contract.mjs`

**Interfaces:**
- Consumes current optical observation and profile contracts.
- Produces failing assertions for production/reference separation, grid coverage, blank normalization, logarithm convention, and chromatic plausibility.

- [x] Add tests that fail against the current three-point implementation: production optics must use the full checked-in grid, a blank must not saturate, and the test-only reference artifact must not be imported by `optics.ts`.
- [x] Add a red test that a quantitative profile must declare an absorptivity logarithm convention.
- [x] Add a red test for the UCRL Napierian anchor and an independent decadic fixture.
- [x] Add a red test requiring the admitted ordinary profile to include the 552 nm region and a pink/fuchsia sRGB/chromaticity outcome.
- [x] Run the focused Vitest/Node checks and verify the strengthened checks pass after production edits.

## Task 2: Admit the CIE reference table as a production artifact

**Files:**
- Create: `packages/render/src/observable/colourimetry-cie-d65-1931-2deg-5nm.json`
- Modify: `packages/render/src/observable/optics.ts`
- Modify: `docs/research/indicator-optics/colourimetry-d65-cie-srgb.reference.json`
- Modify: `docs/research/indicator-optics/colourimetry-d65-cie-srgb.source.md`
- Modify: `docs/research/indicator-optics/README.md`

**Interfaces:**
- Consumes CIE's machine-readable D65 and CIE 1931 2° data.
- Produces an immutable local table with source URLs, source checksums, wavelength range/step, and arrays used only by the Representation Engine.

- [x] Fetch the CIE D65 and CIE 1931 2° machine-readable source tables and derive a checked-in 5 nm table over 380–780 nm.
- [x] Record exact CIE dataset identifiers, DOI/checksum metadata, extraction date, and the local derived-table hash in the source packet.
- [x] Change production optics to import the admitted table, never `optics-reference-vectors.json`.
- [x] Make the checker reject a quantitative production path whose colourimetry artifact is marked test-only or whose grid is outside 380–780 nm/5 nm.
- [x] Run the focused reference/separation tests and verify they pass.

## Task 3: Correct the optical math and declare epsilon convention

**Files:**
- Modify: `packages/schema/src/indicator-optics.ts`
- Modify: `packages/schema/src/indicator-optics.test.ts`
- Modify: `packages/render/src/observable/optics.ts`
- Modify: `packages/render/src/observable/optics.test.ts`
- Modify: `packages/render/src/observable/phenolphthalein-ordinary-aqueous.profile.json`

**Interfaces:**
- Adds a schema-owned `epsilonConvention: "napierian" | "decadic"` field to each spectral form.
- Produces normalized CIE XYZ/sRGB and convention-correct transmittance without changing Scientific Core chemistry inputs.

- [x] Add the schema field and red parse tests for missing/unknown conventions.
- [x] Implement `exp(-epsilon_N c l)` for Napierian spectra and `10^(-epsilon_10 c l)` for decadic spectra using deterministic existing math paths.
- [x] Compute blank and transmitted XYZ with the same D65/observer integration and normalize the transmitted result against the blank/reference white before sRGB encoding.
- [x] Add tests for transparent blank, known simple spectra, path-length scaling, and no hard clamp masking.
- [x] Regenerate schema artifacts and run schema drift checks.

## Task 4: Replace the admitted profile with a full-spectrum, bounded source packet

**Files:**
- Modify: `packages/render/src/observable/phenolphthalein-ordinary-aqueous.profile.json`
- Modify: `docs/research/indicator-optics/phenolphthalein-ordinary-aqueous.source.md`
- Modify: `docs/research/indicator-optics/phenolphthalein-ordinary-aqueous.review.md`
- Modify: `docs/research/indicator-optics/profile-registry.json`
- Modify: `docs/research/indicator-optics/phenolphthalein-quinoid-base.source.md`
- Modify: `docs/research/indicator-optics/phenolphthalein-strong-acid-cation.source.md`
- Modify: `tools/check_indicator_optical_profiles.mjs`

**Interfaces:**
- Produces a full-grid `OpticalProfileSnapshot` with an explicit Napierian/decadic convention and bounded conditions.

- [x] Digitize or otherwise derive the complete visible quinoid trace from the cited source, preserving a 552 nm anchor and uncertainty rather than presenting inferred values as source-tabulated data.
- [x] Record the correct Kouderis/Tsigoias/Siafarika/Kalampounias authorship, original concentration, sodium-carbonate/pH, temperature, cell, and the narrower transfer-approximation boundary.
- [x] Keep neutral/monoanion/strong-acid forms refusal-only or below-sensitivity only where the source/review explicitly permits that approximation.
- [x] Recompute the profile content hash with the central profile version and update all registry/evidence references.
- [x] Add checker assertions for minimum grid, 552 nm neighbourhood, source fidelity, and bounded admission.

## Task 5: Strengthen colour evidence and optical governance

**Files:**
- Modify: `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`
- Modify: `docs/superpowers/specs/2026-09-14-indicator-optical-observation.md`
- Modify: `docs/adr/0016-indicator-optical-observation-boundary.md`
- Modify: `docs/evidence/M5.md`
- Modify: `docs/evidence/M6-entry.md`
- Modify: `docs/plans/PLAN-0001-world-foundation-acid-base-titration.md`
- Modify: `contracts/version-manifest.json`
- Modify: generated version/schema files through repository commands

**Interfaces:**
- Canonical SPEC remains the authority; subordinate M5/optical docs reference rather than redefine accepted criteria.

- [x] Bump the canonical SPEC revision for the optical semantic correction before changing any PASS claim.
- [x] Define AC-V2/AC-O optical continuity in terms of the admitted spectrum model, no threshold branch, refusal outside coverage, and a chromaticity/sRGB plausibility evidence record.
- [x] Mark M5 optical rows and overall stage accurately until hosted CI and owner acceptance exist; do not use a child document to supersede a canonical partial criterion.
- [x] Update the M6 entry packet to require the corrected optical evidence and the exact hosted baseline.
- [x] Preserve strong-acid orange as a documented refusal-only/future model boundary.

## Task 6: Full verification and handoff

**Files:**
- Modify: evidence/attestation files as needed after the final committed baseline exists

- [x] Run focused render/schema/profile tests after each green implementation step.
- [x] Run `pnpm typecheck`, `pnpm typecheck:tests`, `pnpm test`, `pnpm build`, `pnpm lint`, all repository guards, browser tests, and Python tests.
- [x] Run the optical profile and M6-entry gates; `pnpm verify:indicator-optics`, `pnpm verify:indicator-profiles`, and `pnpm verify:m6-entry` pass locally.
- [x] Inspect the complete diff for test-only data entering production, fake precision, duplicated versions, and stale M5/M6 claims.
- [x] Commit and push the completed round; exact committed baseline `bdef2366a2c34bd57604eb2825a57a5df15c2ed3` passed hosted CI #143 (`34924905998`).
- [x] Handoff states that M6 is ready for owner authorization only after the attested baseline; owner acceptance of the candidate amendments remains required.

## Task 7: Make derived spectrum and colourimetry independently reproducible

**Objective:** Close the remaining M6-entry evidence gap without widening the
scientific model or implementing the documented strong-acid orange regime.

**Files:**
- Add: `docs/research/indicator-optics/raw/phenolphthalein-kouderis-figure1-digitized.csv`
- Add: `tools/research/build_phenolphthalein_optical_profile.mjs`
- Add: `tools/research/build_indicator_colourimetry_oracle.py`
- Add: `docs/research/indicator-optics/colourimetry-independent-oracle.json`
- Add: `packages/render/src/observable/colourimetry-oracle.test.ts`
- Modify: profile registry/source/review packets, profile checker, package scripts, and CI

**Interfaces and evidence:**
- The raw CSV is a relative raster digitisation; the 625–780 nm rows are
  explicitly labelled zero extensions rather than source measurements.
- The Node builder validates the raw trace, performs anchor normalization, and
  reproduces the profile content hash.
- The Python oracle uses no ChemRealm runtime imports and freezes XYZ/sRGB and
  81-point transmittance vectors for four independent numerical cases.
- CI runs both rebuild/check gates before the final M6 attestation.

- [x] Add raw trace, reproducible profile builder, and source packet references.
- [x] Add independent standard-library oracle and production comparison tests.
- [x] Add CI/package gates and remove the stale M5 #140 current-status wording.
- [ ] Record the new exact committed-baseline hosted attestation after CI success.
- [ ] Owner reviews applicable candidate revisions before M6 authorization.
