# M6 Gold Master Candidate — Two-Round Self-Audit

**Date:** 2026-09-15
**Scope:** source-backed apparatus asset package and its contract/evidence boundary
**Status:** legacy SVG structural audit retained; visual candidate rejected; hybrid replacement not yet audited

This audit records two independent passes over the M6 Gold Master candidate.
It does not promote the package to an owner-approved Gold Master or change the
M6 stage gate. Structural tests can prove that the package is internally
consistent; they cannot prove that the visual result meets the approved
apparatus baseline.

## Audit A — source, contract and invariant review

### Scope and ownership

- The Representation Engine owns apparatus construction metadata, authored
  visual body/runtime layers, LOD visibility and runtime asset-package
  boundaries.
- Scientific Reality, World Runtime and ACE are not modified by this package.
- Runtime quantities, liquid, meniscus, optical state, readouts, chemical
  colors, shadows and QA overlays are not authored into clean masters.
- Support ports and detachable-part semantics remain metadata; a stand, clamp
  or relation-owned contact shadow belongs to scene composition.
- The strong-acid phenolphthalein orange requirement is documented as a future
  optical/refusal concern and is not claimed as implemented here.

### Source-to-artifact chain

The following chain was reviewed as one identity boundary:

```text
legacy construction source
        ↓
legacy procedural generator
        ↓
rejected SVG candidate package
```

The active replacement chain is defined by the hybrid M6 specification but is
not yet executed:

asset brief and reference board
        ↓
asset-specific layered source master
        ↓
high-resolution visual body and optional structured layers
        ↓
runtime exports, semantic manifest and QA

### Mechanical checks performed

- Central version references are used for catalog and asset versions; no new
  hard-coded release version was introduced in the candidate package.
- Source and catalog records are deep-frozen at the Representation Engine
  boundary.
- `coordinateUnit` is `mm`; master viewBoxes use the declared physical
  envelope, and generated path bounds are measured by the package tests.
- Body and physical envelopes are distinct. A beaker spout may extend the
  physical envelope, but it is constructed as a local rim-connected feature.
- Flask mouth, neck, shoulder and body landmarks are consumed by geometry
  constructors and checked against generated paths.
- Graduation count and interval are derived from source values. The acid and
  alkali burettes each derive 500 minor intervals from their declared maximum
  and minor interval; no independent calibration constant is used.
- LOD visibility is checked by semantic roles from the source matrix. Path
  count is retained only as a diagnostic monotonicity signal.
- Clean LODs do not contain scene shadows, QA overlays, detachable QA circles,
  construction guides, support hardware or fake standalone bases. The vessel
  body may contain an integrated rounded contact region; this is not a
  scene-owned shadow or detachable hardware layer.
- Family-specific material definitions are scoped to the generated asset. The
  old cyan prototype palette and unused family definitions are not emitted.
- Physical comparison uses one `mmToPx` scale and a ruler. The normalized
  comparison sheet is explicitly visual-only and is not dimensional evidence.
- Generated fixture/state metadata is self-contained and names the candidate
  package status. It does not claim owner approval.
- Existing M4/M5 guards and imports remain outside the candidate generator's
  dependency direction; the candidate package does not import Scientific Core
  or World Runtime.

### Audit A result

**PASS for the bounded legacy package contract only.** No unresolved P0/P1 was
found in that structural identity chain during this pass. This result does not
admit the legacy SVGs as visual masters and does not include visual taste,
apparatus realism, browser composition or owner approval.

## Audit B — rendered review and acceptance boundary

Representative package review targets are:

- acid burette, 25 mL Class AS profile;
- alkali burette, 50 mL profile;
- 250 mL beaker;
- 250 mL Erlenmeyer flask.

Each legacy target has master, scene, preview and thumbnail LODs, and the package
declares both dark-neutral and light-neutral review backgrounds. Those artifacts
are structural candidates, not admitted visual masters. The replacement audit
must instead inspect the authored high-resolution body, structured layers,
runtime exports and semantic alignment.

The candidate package was also inspected separately from the existing browser
capture. The browser first slice still renders the legacy `TITRATION_BENCH_ASSET`
scene and manually composed prototype apparatus; it is useful regression
evidence for the old runtime path, but it is **not** a Gold Master visual
capture. No production integration claim is made from it.

The generated package contains physical-scale and normalized-shape comparison
sheets embedding the four representative masters and declares alternating
dark-neutral/light-neutral review backgrounds. Package checks confirm the
intended family anatomy and no visible QA/support overlays. The remaining owner
questions are visual: the long burette format may compress graduation detail at
thumbnail scale, and light-neutral glass contrast/material treatment must be
judged against the approved visual baseline. Those are visual-review decisions,
not claims that package tests can settle.

### Audit B result

**LEGACY STRUCTURAL REVIEW PASS; VISUAL ADMISSION REJECTED.** The legacy package
must not proceed as a Gold Master handoff. V-P0-1 through V-P0-12 and M6-S3
remain blocked until the hybrid replacement begins with the 250 mL Griffin
beaker and the owner reviews its source, exports, states and captures against
the current apparatus visual standard.

## Evidence boundary

The following are deliberately not claimed by this audit:

- NOBOOK-level visual parity or superiority;
- owner-approved Gold Master quality;
- hybrid package source/body/runtime admission;
- complete Zhejiang/high-school apparatus coverage;
- M6 production Pixi integration;
- M7 pointer/drag/snap behavior;
- strong-acid phenolphthalein orange implementation;
- final visual-regression baselines;
- M6 S3 or M7 authorization.

## Reproduction commands

```powershell
node tools/create_gold_master_assets.mjs
pnpm verify:m6-gold-master
pnpm verify:m6-master-packages
pnpm verify:m6-instruments
pnpm verify:m6-render-geometry
pnpm exec vitest run packages/render/src/assets/gold-master.test.ts packages/render/src/assets/apparatus-catalog.test.ts --reporter=verbose --no-file-parallelism
pnpm verify:m6-entry
pnpm verify:m6-renderer
pnpm verify:world
git diff --check
```

The full repository verification set remains the responsibility of the final
handoff and is recorded in `docs/evidence/M6.md` after execution. A successful
command run is package evidence, not owner visual acceptance.

## Handoff

- Current stage: M6 S2 visual NO-GO; legacy SVG candidate rejected.
- Verified: legacy structural source/catalog identity, measured physical-mm
  bounds, semantic roles and package tests.
- Not verified: hybrid source master, authored visual body, runtime exports,
  dual-background screenshot acceptance, production composition, performance
  sample and M6 S3.
- Next decision: produce and owner-review the 250 mL Griffin beaker under the
  hybrid asset pipeline.
