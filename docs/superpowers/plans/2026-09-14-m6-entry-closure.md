# M6 Entry Closure Plan

> Status: **Historical authorization record — not an active implementation
> authority.** M4-B and M5 evidence and the applicable SPEC amendments were
> owner accepted on 2026-09-15. This plan records authorization only; it does
> not implement M6 or claim M6 S3.

## Context

The repository has a verified legacy M4 TypeScript baseline, an accepted M4-B
evidence packet for the explicitly tested native v2 scope, and an accepted M5
World → Scientific Core →
ScientificFrame → Observable → DOM composition. One source-reviewed
ordinary-aqueous phenolphthalein profile is admitted only inside its bounded
coverage; all unsupported optical cases remain refusal-first. M6 is explicitly
downstream of both M5 S3 and M4-B S3. The implementation baseline
`9b6f91873dcd240c9accd5d95be1cba71ee14a0a` passed hosted CI #148
(`34929205212`), and owner authorization is recorded in the M6 entry packet.

The current review also identified an authority conflict: visual reference
swatches are useful qualitative QA material, but they must not be treated as
the source of production indicator tint. Production tint must come from the
quantitative optical observation pipeline.

## Goal

1. Close the native supersession evidence for the applicable M4 criteria using
   the real v2 World → WASM → ScientificFrame → Observable → DOM path.
2. Admit one quantitative indicator spectrum only when its source, conditions,
   extraction, uncertainty, content hash, and review record are reproducible;
   drive a positive in-coverage `OPTICAL_MODEL_OK` transform through the
   admitted representation path and drive the default 25 °C production
   composition through an explicit out-of-temperature-coverage refusal. The
   source-bounded 20 °C optical profile must not be widened to make the 25 °C
   chemistry fixture appear positive.
3. Make the visual standard, canonical SPEC, evidence packets, and version
   manifest agree without silently weakening an accepted criterion.
4. Leave the repository at an honest **M6 authorized / in progress** boundary;
   do not implement PixiJS, final assets, pointer interaction, or screenshots
   as part of this closure.

## Non-goals

- No implementation of the strong-acid phenolphthalein cation/orange regime.
  It remains documented and refusal-only.
- No RGB endpoint fallback, ratio-only palette, or unreviewed synthetic
  spectrum in the production path.
- No M6 apparatus asset package, PixiJS renderer, animation system, or visual
  baseline capture.
- No native-default rollout decision before the native evidence packet is
  independently attested.
- No new version literal outside `contracts/version-manifest.json` and its
  generated artifacts.

## Architecture and ownership

| Concern | Owner | Boundary |
|---|---|---|
| Native equilibrium and form result | Scientific Reality Core | Existing native v2 adapter and shared scientific contracts |
| World creation/replay and committed prefixes | World Runtime | Existing `createWorldFromScenario`, event log, replay, state identity |
| Frame and optical observation | Representation Engine | Existing frame/optics APIs; consumes frozen snapshots and scientific observations |
| Browser composition evidence | Web composition root | Explicit backend selection; no silent TS fallback for native |
| Source/licence/precision records | Research/evidence | Versioned manifests, source packets, review records |
| M6 visual policy | Visual governance | Standard only; concrete renderer remains M6 |

## Scientific design

- The admitted profile is a form-specific ordinary-aqueous
  phenolphthalein spectrum, only if the source packet supports a quantitative
  multi-point wavelength profile under a stated solvent, temperature,
  concentration/path, and acidity/ionic-strength context.
- Digitized values will be identified as derived samples, retain the source
  figure/table identity, and carry a stated digitization uncertainty. A
  published single wavelength anchor may calibrate the derived shape only when
  the review record states the transform and its applicability limits.
- The production concentration is computed from committed indicator amount and
  committed liquid volume. Beer–Lambert, D65/CIE 1931 2-degree integration,
  and sRGB conversion remain the only tint path.
- Every accepted profile is content-addressed. The profile hash must be
  recomputable from the checked-in payload; the review record must name the
  same hash.
- Strong-acid phenolphthalein orange is recorded as a scientific boundary and
  refusal case only. It is not admitted as a positive spectrum in this round.

## World/event and persistence design

- Native acceptance must start from a real frozen scenario and WorldCreated
  event, not a direct solver request fixture.
- The native v2 path must preserve solver identity, event replay identity,
  sequence, frozen volume/profile identity, and source replay hash through the
  frame and ObservableModel.
- Optical profile payloads are persisted as serializable, hash-verified data;
  executable interpolation is reconstructed only after validation.
- No persisted schema change is introduced unless the canonical SPEC revision,
  version manifest, migration path, and regression evidence are updated
  together.

## Representation design

- The admitted ordinary profile emits `OPTICAL_MODEL_OK` only for covered
  inputs. The default production titration fixture uses the 25 °C acid-base
  model and is intentionally refused by the profile's source-bounded 20 °C
  temperature condition; the positive in-coverage transform is covered by the
  focused optical suite. Browser evidence must verify the refusal has no tint.
- The visual reference swatches remain checked-in qualitative QA/sanity
  material. They cannot provide production RGB values or override an optical
  refusal.
- Existing pH policy, burette semantics, source identity, and profile snapshot
  boundaries remain unchanged except for evidence-strengthening tests.

## Governance and API changes

- Create the next canonical SPEC candidate revision for any criterion or
  ownership change; a subordinate M5 document may refine but never redefine an
  existing `AC-*` criterion.
- Update `contracts/version-manifest.json` first for the current revision and
  any profile revision, then run the repository version generator. No active
  version is written as a new hard-coded literal in source.
- Keep M5 and M4-B evidence packets separate from the final M6 authorization
  record. A local S3 candidate is promoted only when its criterion-specific
  evidence, exact committed-baseline CI attestation, and owner review exist.

## Ordered implementation steps

### Step 1 — Native criterion closure

**Objective:** produce native-specific evidence for the still-open AC-S3,
AC-S4, AC-S8, AC-S11, AC-S13, AC-S14 rows and explicitly attach shared AC-S15
and AC-S16 evidence.

**Files/packages:**

- `packages/sci/src/native-reference.test.ts`
- `apps/web/src/composition.test.ts`
- `tests/browser/m5-composition.spec.ts`
- `docs/evidence/M4-native.md`
- native verification scripts only when a genuine missing guard is found

**Implementation/tests:**

- Add native domain-boundary and monotonicity assertions using the real release
  WASM adapter, including valid high-acid points, the `I_m = 0.5` refusal edge,
  and the `0.15/0.30` accuracy-envelope cases.
- Add a native acceptance fixture that constructs the v2 WorldCreated scenario,
  replays committed transfer prefixes, solves those prefixes through the
  native adapter, and asserts frame/Observable identity rather than only
  comparing direct requests.
- Add browser assertions for `?backend=native` covering world identity,
  native model version, source hash, observable status, and explicit failure/no
  fallback behavior.
- Map shared provenance, required-density refusal, and scientific reference
  rows to exact existing tests without relabelling shared evidence as a native
  rerun.

**Evidence/stop condition:** every native-specific matrix row has a
criterion-specific test and reproducible command; the packet may be promoted
from local verification only after the committed artifact and hosted CI
attestation are recorded.

### Step 2 — Quantitative optical source packet

**Objective:** admit exactly one real quantitative ordinary-form profile with
source fidelity, not a guessed RGB palette.

**Files/packages:**

- `docs/research/indicator-optics/profile-registry.json`
- `docs/research/indicator-optics/phenolphthalein-quinoid-base.source.md`
- new checked-in `*.profile.json` and `*.review.md` packet
- `tools/check_indicator_optical_profiles.mjs`
- `packages/render/src/observable/optics.test.ts`

**Implementation/tests:**

- Use an open/reuse-permitted source packet with a cited multi-point spectrum,
  conditions, and a documented extraction method. Preserve only derived data
  needed by the application, not an unlicensed source image.
- Record source identity, rights, temperature/solvent, concentration/path,
  pH or ionic-strength context, wavelength grid, reported precision, and
  digitization uncertainty. Distinguish published anchors from derived points.
- Create a profile payload whose hash is generated by the central profile
  helper; add a review record that repeats the hash, decision, limitations, and
  refusal boundary.
- Strengthen the checker so a quantitative entry requires the packet fields,
  a non-placeholder source URL, source/derived precision consistency, at least
  the admitted multi-point grid, and a review decision tied to the exact hash.
- Keep all other candidates qualitative-only, including the strong-acid
  cation/orange candidate.

**Evidence/stop condition:** the registry checker admits one quantitative
profile and rejects tampering, missing source fields, stale hash, missing
review, and unsupported forms. This step is locally satisfied for one bounded
profile; hosted/owner gates remain separate.

### Step 3 — Positive production optical path

**Objective:** run the admitted profile from committed chemistry through the
optical model and browser.

**Files/packages:**

- `apps/web/src/production-scenario.ts`
- `apps/web/src/composition.ts`
- `apps/web/src/App.tsx`
- `packages/render/src/observable/optics.test.ts`
- `packages/render/src/observable/observable.test.ts`
- `tests/browser/m5-composition.spec.ts`
- `docs/evidence/M5.md`

**Implementation/tests:**

- Replace only the default ordinary phenolphthalein qualitative profile with
  the admitted frozen profile and ensure the Scientific Core supplies every
  form required by that profile. Do not enable strong-acid orange.
- Assert concentration, path, chemical-form fractions, Beer–Lambert
  transmittance, colourimetry output, profile hash, and source replay hash.
- Add negative tests for out-of-coverage temperature/concentration/path/form
  and strong-acid cation refusal; no negative path may silently fall back to a
  swatch.
- Extend browser evidence to require the committed profile identity/hash and
  explicit no-tint refusal for the default 25 °C composition. Keep the positive
  in-coverage `OPTICAL_MODEL_OK` assertion in the focused transform suite; do
  not widen the empirical profile solely to satisfy a browser assertion.

**Evidence/stop condition:** AC-O1 and AC-O8 have positive in-coverage
transform evidence plus browser refusal evidence for the default composition,
while refusal/coverage rows remain explicit and the optical report does not
claim model equivalence with PHREEQC.

### Step 4 — Authority and governance reconciliation

**Objective:** make the canonical documents and version manifest describe the
same accepted contracts.

**Files/packages:**

- `docs/visual/apparatus-standard.md`
- `docs/adr/0006-*` and optical ADR where affected
- `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`
- `docs/superpowers/specs/2026-09-14-indicator-optical-observation.md`
- `docs/evidence/M4-native.md`, `docs/evidence/M5.md`
- `contracts/version-manifest.json` and generated version files

**Implementation/tests:**

- State that reference swatches are qualitative QA/sanity references only;
  production tint authority is `OpticalObservation` from the spectral pipeline.
- Add a canonical amendment for any optical criterion/ownership change and
  preserve candidate/accepted status accurately. Do not accept a revision by
  editing its text without a revision bump.
- Update evidence matrices row by row, recording exact implementation commit,
  native artifact identity, and hosted CI run only when known.
- Keep strong-acid phenolphthalein orange documented as refusal-only.

**Evidence/stop condition:** no subordinate spec contradicts an accepted
canonical `AC-*`; current and accepted revisions are machine-consistent; no
exact CI/run claim is fabricated.

### Step 5 — Final closure and authorization record

**Objective:** record the final owner authorization boundary without claiming
M6 S3 or implementing M6.

**Files/packages:**

- `docs/evidence/M4-native.md`
- `docs/evidence/M5.md`
- `docs/plans/PLAN-0001-world-foundation-acid-base-titration.md`
- `contracts/version-manifest.json`
- a new M6 entry/authorization evidence packet if needed

**Implementation/tests:**

- Run the relevant local commands, inspect the diff, run the complete local
  acceptance set, and record exact output/artifact hashes.
- After push, record hosted CI only from the actual run. If hosted attestation
  has not completed, leave the gate pending rather than claiming S3.
- Promote M4-B and M5 to S3 only after all applicable binary criteria are
  evidenced and owner review is explicit. Then record M6 as authorized; do not
  claim M6 S3 or ship final visual assets in this round.

**Evidence/stop condition:** M6 authorization is blocked by any P0/P1,
missing source/provenance, missing native/browser path, stale evidence, or
unreviewed canonical SPEC candidate. When those gates are satisfied, the
handoff records the exact M6 starting point and its still-unverified visual
criteria; it does not claim M6 S3.

## Acceptance matrix

| Criterion | Required result | Evidence |
|---|---|---|
| Native AC-S3/S4/S8/S11/S13/S14 | PASS with native-specific attachment | WASM tests + v2 composition/browser path |
| Native AC-S15/S16 | Shared evidence explicitly cited | schema/provenance tests and packet links |
| AC-O1 | PASS for one admitted quantitative profile | source packet, profile hash, review, checker |
| AC-O2/O5 | PASS for the admitted profile | Beer–Lambert and colourimetry tests |
| AC-O3/O4/O6/O7 | PASS/refusal boundaries | negative tests, replay, dependency/optical guards |
| AC-O8 | PASS with focused in-coverage transform and default-composition refusal coverage | focused optical transform tests + production composition/browser |
| Visual authority | PASS | apparatus standard/ADR/spec consistency test or review |
| Governance | PASS only after owner review | version manifest, canonical SPEC revision, evidence attestation |
| M6 authorization | GO only after M4-B and M5 S3 | PLAN/evidence status and exact baseline |

## Reproduction commands

```text
pnpm verify:versions
pnpm verify:native-schema
pnpm verify:native-governance
pnpm verify:indicator-profiles
pnpm verify:m4-contracts
pnpm verify:m5-contracts
pnpm native:test
pnpm native:check-wasm
pnpm typecheck
pnpm typecheck:tests
pnpm test
pnpm test:browser
uv run pytest
uv run python tools/check_acceptance_coverage.py
git diff --check
```

## Known limitations after this plan

- Strong-acid phenolphthalein orange remains documented but unimplemented and
  refusal-only by explicit owner direction.
- M6 final apparatus, PixiJS, assets, pointer/snap interaction, animation,
  screenshots, performance, and visual owner review remain unverified until
  the next stage.
- A bounded PHREEQC offset remains a documented non-equivalence disposition;
  this plan does not tune the ChemRealm model to PHREEQC.
