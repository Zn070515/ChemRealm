# M6 Entry Gate

**Status:** **Ready for owner authorization after current-round attestation** —
the corrected optical baseline has passed hosted attestation, while the newly
added raw-profile rebuild and independent colourimetry oracle still require an
exact committed-baseline hosted attestation; owner acceptance of the applicable
candidate amendments is still required.
This packet is an entry gate, not an M6 S3 claim.

**Purpose:** Record the prerequisites for beginning M6 final-quality apparatus
realization. M6 is the first milestone that may introduce concrete apparatus
assets, a PixiJS renderer, pointer/snap interaction, animation ownership,
viewport baselines, and visual review. Those deliverables are intentionally
not implemented or accepted by this packet.

## Prerequisite matrix

| Prerequisite | Result | Evidence |
|---|---|---|
| Legacy M4 scientific core | PASS — accepted | [`M4.md`](M4.md), accepted TypeScript baseline and PHREEQC bounded non-equivalence disposition |
| Native M4-B scientific backend | PASS locally and hosted — owner gate open | [`M4-native.md`](M4-native.md), native v2 REF/differential/domain/world/browser checks; commit `66b488a3e7483b776711d0e9d6ab723698dc3a35`, CI run #140 (`34868257380`), local release WASM `sha256:c03fc50d7fb8aa6bae79dd9638b14095f1cf919bdfb8e31c64bda93ce05c3887` |
| M5 observable/composition contract | PASS locally and hosted — owner gate open | [`M5.md`](M5.md), World → ScientificFrame → ObservableModel → DOM path and refusal/in-coverage optical cases; corrected baseline `bdef2366a2c34bd57604eb2825a57a5df15c2ed3`, hosted CI #143 (`34924905998`) |
| Ordinary optical profile | PASS locally; prior hosted baseline superseded by current closure round | `phenolphthalein-ordinary-aqueous.profile.json`, raw digitisation CSV and reproducible builder, source/review packets, exact profile hash `sha256:8d02fca6fbf715f9a15ee6366e981afde9a68b5062ac8f9cffae3bdcfb03a872`, full 380–780 nm/5 nm grid, blank-normalized CIE transform, focused in-coverage positive transform tests, and browser refusal evidence for the default 25 °C composition; prior hosted baseline `bdef2366a2c34bd57604eb2825a57a5df15c2ed3`, CI #143 (`34924905998`) |
| Independent colourimetry oracle | PASS locally; current-round hosted attestation pending | `colourimetry-independent-oracle.json`, Python standard-library rebuild/check, and `colourimetry-oracle.test.ts` covering transparent white, neutral grey, narrow absorber, and the admitted phenolphthalein profile |
| Strong-acid phenolphthalein orange | REFUSAL-ONLY | Documented in [`ADR-0016`](../adr/0016-indicator-optical-observation-boundary.md) and optical research packets; no production positive path |
| Active version distribution | PASS locally | `contracts/version-manifest.json` is the sole manually maintained source; generated version output is checked by `pnpm verify:versions` |
| Canonical SPEC candidate | REVIEW REQUIRED | Current candidate revision 30 is read from the central version manifest; owner must review the optical correction and all candidate amendments before M6 authorization |

## What M6 is authorized to start

After the hosted CI run for the exact committed baseline succeeds and the
owner accepts the applicable candidate amendments, M6 may begin:

- one final-quality apparatus slice built from the frozen M5 observable and
  profile/path contracts;
- semantic apparatus assets with serialized manifests, part/port/region
  identity, accessibility metadata, and deterministic state variants;
- a renderer adapter that consumes `RenderState` only and keeps visual effects
  separate from scientific decisions;
- deterministic viewport captures, interaction-target checks, and owner visual
  review against `docs/visual/apparatus-standard.md`.

This authorization does not authorize M7 interactive titration, M8 persistence,
new chemistry, strong-acid orange, or a native-default rollout. M6 must retain
the refusal-first optical boundary and may not replace the admitted spectral
observation with a swatch or hard-coded colour.

## M6 remains unverified

The following are deliberately outside this entry packet and require their own
M6 evidence:

- final apparatus asset package and semantic asset contract;
- PixiJS/renderer implementation and layer ownership;
- pointer target accessibility, snap/drag semantics, and animation-clock policy;
- named viewport screenshots, visual regression/manual owner review, and
  performance measurements;
- browser evidence proving the final renderer consumes the same observable
  frame as the local DOM inspection surface.

## Reproduction before authorization

```text
pnpm verify:versions
pnpm verify:native-evidence
pnpm verify:native-governance
pnpm verify:indicator-profiles
pnpm verify:indicator-optical-source
pnpm verify:indicator-colourimetry-oracle
pnpm verify:indicator-optics
pnpm verify:m4-contracts
pnpm verify:m5-contracts
pnpm typecheck
pnpm typecheck:tests
pnpm test
pnpm build
pnpm test:browser
uv run pytest
uv run python tools/check_acceptance_coverage.py
git diff --check
```

The prior hosted attestation for the historical optical baseline is retained in
M5 evidence. **A new hosted attestation must be recorded here only after the
raw-profile rebuild and independent colourimetry oracle are present on the
exact committed baseline.** Current-round hosted attestation required; this
packet does not silently promote local evidence to M6 authorization. Owner
acceptance of the applicable SPEC amendments remains the separate gate.
