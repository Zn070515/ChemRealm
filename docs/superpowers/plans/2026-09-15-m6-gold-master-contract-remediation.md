# M6 Gold Master Contract Remediation Implementation Plan

> Status: Historical plan; not an active implementation authority. Superseded
> by the M6 hybrid apparatus asset-pipeline plan.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Lifecycle:** Historical contract-remediation plan. Superseded as the active
M6 asset-materialization plan by the hybrid apparatus asset-pipeline plan.

**Goal:** Replace the current structurally plausible but geometrically untrustworthy Gold Master package with source-backed, true-millimetre, replayable apparatus assets whose catalog, LOD, comparison evidence and tests share one construction source. The current active plan additionally admits high-resolution authored raster bodies and optional structured runtime layers.

**Architecture:** A checked-in JSON construction source is the only authoring source for the first Gold Master families. A generator consumes it to produce the typed Representation Engine catalog, manifests, SVG LODs and comparison sheets; generated artifacts are drift-checked. SVG master coordinates are physical millimetres, while runtime scene scaling and shadows remain composition-owned. Geometry is built from typed landmarks and profile parameters, so tests measure the generated paths instead of trusting metadata.

**Tech Stack:** Node 22 ESM generator, TypeScript 5.9, Vitest, SVG, JSON Schema/Zod-backed representation contracts, existing central version manifest, Playwright capture/evidence tooling.

**Spec:** `docs/superpowers/specs/2026-09-15-m6-visual-asset-system-redesign.md`, `docs/superpowers/specs/2026-09-15-m6-apparatus-industrialization.md`, `docs/visual/m6-art-direction.md`, `docs/visual/apparatus-standard.md`.

## Global Constraints

- `GOAL.md` remains the project constitution; no chemistry, optical equilibrium, WorldState, DomainEvent or persistence behavior is moved into render.
- The Gold Master package is a candidate until owner visual review; no M6 S3 claim is permitted from package tests alone.
- `coordinateUnit` is `mm`; every master path coordinate, stroke width and landmark is a length in the same physical coordinate space.
- `APPARATUS_CATALOG` and generated Gold Master metadata must derive from one checked-in construction source; generator-local duplicate entries are forbidden.
- Runtime values, liquid, meniscus, readouts, chemical colors, shadows and QA overlays are not baked into clean masters.
- M6 does not implement strong-acid phenolphthalein orange; the documented refusal remains out of scope.
- Existing M4/M5 identity, quantity, replay, snapshot, privacy and version-source invariants must stay green.

---

### Task 1: Freeze the canonical apparatus construction source

**Files:**
- Create: `packages/render/src/assets/gold-master-construction.json`
- Create: `packages/render/src/assets/apparatus-contracts.ts`
- Modify: `contracts/version-manifest.json` only if the existing representation asset/catalog version must be bumped by the generated-source contract
- Modify: `packages/render/src/assets/apparatus-catalog.ts`
- Test: `packages/render/src/assets/apparatus-catalog.test.ts`
- Test: `packages/render/src/assets/gold-master.test.ts`

**Interfaces:**
- Consumes: existing `ApparatusSpecification`, `ApparatusPart`, `ApparatusPort`, `ApparatusGraduation` contracts and central version manifest.
- Produces: `GoldMasterConstructionSource`, `readGoldMasterConstructionSource()`, `goldMasterSpecification(id)`, and a typed catalog projection used by both runtime code and the generator.

- [x] **Step 1: Write the failing source-integrity tests.**

```ts
it("has one construction source for every first-wave Gold Master specification", () => {
  expect(GOLD_MASTER_CONSTRUCTION_SOURCE.specifications.map((item) => item.specificationId))
    .toEqual(FIRST_WAVE_GOLD_MASTER_IDS);
  expect(new Set(GOLD_MASTER_CONSTRUCTION_SOURCE.specifications.map((item) => item.specificationId)).size)
    .toBe(FIRST_WAVE_GOLD_MASTER_IDS.length);
});

it("derives catalog geometry identity from the construction source", () => {
  for (const source of GOLD_MASTER_CONSTRUCTION_SOURCE.specifications) {
    expect(goldMasterSpecification(source.specificationId).dimensionsMm)
      .toEqual(source.envelopeMm);
  }
});
```

- [x] **Step 2: Run the focused tests to confirm the new source contract is absent.**

Run: `pnpm exec vitest run packages/render/src/assets/apparatus-catalog.test.ts packages/render/src/assets/gold-master.test.ts`

Expected: FAIL because no canonical construction source and source-backed catalog projection exist.

- [x] **Step 3: Add the source schema and records.**

Each record must contain `specificationId`, `familyId`, `capacityMl`, `bodyEnvelopeMm`, `physicalEnvelopeMm`, `landmarksMm`, `geometry`, `graduation`, `parts`, `ports`, `lodVisibility`, `materialProfile`, and datum-level provenance. The physical envelope is allowed to exceed the body diameter for a beaker spout, but both are named explicitly. The candidate source contains two burettes, four beakers and three Erlenmeyer flasks; the bounded first owner-review subset is the two burettes, three beakers and three Erlenmeyer flasks. Every record must have explicit family proportions rather than a scale-only formula.

- [x] **Step 4: Make the TypeScript catalog consume the source projection.**

The catalog module must expose immutable source-derived records. No first-wave `dimensions`, `parts`, `ports`, `graduation`, landmark or material-profile literals may remain in a second array in `apparatus-catalog.ts`.

- [x] **Step 5: Run source and catalog tests.**

Run: `pnpm exec vitest run packages/render/src/assets/apparatus-catalog.test.ts packages/render/src/assets/gold-master.test.ts`

Expected: PASS, with every first-wave specification mapped exactly once and all nested source/catalog records frozen.

- [x] **Step 6: Commit the canonical source boundary.**

```powershell
git add packages/render/src/assets/gold-master-construction.json packages/render/src/assets/gold-master-source.ts packages/render/src/assets/apparatus-catalog.ts packages/render/src/assets/apparatus-catalog.test.ts packages/render/src/assets/gold-master.test.ts contracts/version-manifest.json
git commit -m "refactor: centralize M6 apparatus construction source"
```

### Task 2: Generate true-millimetre family geometry

**Files:**
- Modify: `tools/create_gold_master_assets.mjs`
- Modify: `assets/apparatus/catalog/gold-master/*/master.svg`
- Modify: `assets/apparatus/catalog/gold-master/*/scene.svg`
- Modify: `assets/apparatus/catalog/gold-master/*/preview.svg`
- Modify: `assets/apparatus/catalog/gold-master/*/thumbnail.svg`
- Test: `packages/render/src/assets/gold-master.test.ts`
- Create: `packages/render/src/assets/svg-geometry.ts` if shared path parsing/measurement is needed

**Interfaces:**
- Consumes: `construction-source.json` records and typed profile geometry.
- Produces: `generateGoldMasterSvg(specification, lod)`, true-mm SVG documents, and measured geometry metadata.

- [x] **Step 1: Write failing geometry tests for the actual generated SVG.**

```ts
it("keeps declared body and physical envelopes equal to measured SVG geometry", async () => {
  const svg = await readGoldMaster("beaker-250ml", "master");
  expect(measureSvgBounds(svg)).toEqual({ widthMm: 85, heightMm: 95 });
  expect(measureLayerBounds(svg, "body").widthMm).toBeCloseTo(70, 6);
});

it("constrains flask landmarks to the generated silhouette", async () => {
  const svg = await readGoldMaster("conical-flask-250ml", "master");
  expect(measureHorizontalOpening(svg, "rim")).toBeCloseTo(28, 6);
  expect(measureHorizontalOpening(svg, "neck")).toBeCloseTo(23, 6);
  expect(measureLayerBounds(svg, "body").widthMm).toBeCloseTo(74, 6);
});
```

- [x] **Step 2: Run the geometry tests to record the current false-mm failures.**

Run: `pnpm exec vitest run packages/render/src/assets/gold-master.test.ts`

Expected: FAIL on current multiplier-based beaker/flask geometry and detached metadata landmarks.

- [x] **Step 3: Replace arbitrary art-space multipliers with profile constructors.**

Use explicit construction functions:

```js
function buildBeakerGeometry(specification, lod) {}
function buildBuretteGeometry(specification, lod) {}
function buildErlenmeyerGeometry(specification, lod) {}
```

Their path coordinates must be direct millimetres in the source profile. A master `viewBox` starts at the source physical origin and spans `physicalEnvelopeMm`; no `width * 1.52`, `width * .86` or equivalent hidden scale is permitted. The beaker spout must be a local deformation of the rim with shared root points/tangent, not a detached triangle. The flask body must use continuous cubic shoulder and bottom curves. The burette must use one continuous glass-to-actuator-to-tip flow path for each mechanism.

- [x] **Step 4: Remove false visual content from clean masters.**

Clean masters must not contain visible `shadow`, `support-interface` hardware, detachable QA circles, construction-detail guides, fake bases or unconnected cones. Ports and support interfaces remain manifest semantics. Scene composition may add a relation-owned shadow or clamp; master/preview/thumbnail assets do not bake a bench contact shadow.

- [x] **Step 5: Use family-specific neutral material profiles.**

Glass uses low-saturation neutral clear values with localized edges/highlights rather than a blue/cyan outline. Burette Schellbach stripe, PTFE, rubber and glass bead are family-owned constructions. Unused family definitions are not emitted into unrelated SVGs.

- [x] **Step 6: Regenerate and run geometry tests.**

Run: `node tools/create_gold_master_assets.mjs; pnpm exec vitest run packages/render/src/assets/gold-master.test.ts`

Expected: PASS for measured bounds, attached landmarks, continuous family anatomy and clean-master forbidden-content checks.

- [x] **Step 7: Commit the geometry generation boundary.**

```powershell
git add tools/create_gold_master_assets.mjs assets/apparatus/catalog/gold-master packages/render/src/assets/svg-geometry.ts packages/render/src/assets/gold-master.test.ts
git commit -m "fix: generate M6 apparatus geometry in physical millimetres"
```

### Task 3: Derive calibrated graduations and continuous burette mechanisms

**Files:**
- Modify: `packages/render/src/assets/gold-master-construction.json`
- Modify: `tools/create_gold_master_assets.mjs`
- Modify: `packages/render/src/assets/gold-master.test.ts`
- Modify: `docs/visual/apparatus-standard.md`
- Modify: `docs/visual/m6-art-direction.md`

**Interfaces:**
- Consumes: canonical `graduation.maximumMl`, `majorEveryMl`, `minorEveryMl`, `readingResolutionMl`, tube bounds and mechanism profile.
- Produces: graduation marks attached to the tube, LOD visibility derived from the same scale, and mechanism-specific continuous geometry.

- [x] **Step 1: Write failing scale/mechanism tests.**

```ts
it("renders the canonical 25 mL acid scale at 0.05 mL intervals", async () => {
  const svg = await readGoldMaster("burette-acid-25ml-class-as", "master");
  expect(countGraduationIntervals(svg)).toBe(500);
  expect(graduationExtent(svg)).toEqual(expect.objectContaining({ minMl: 0, maxMl: 25, intervalMl: 0.05 }));
  expect(graduationIsAttachedToTube(svg)).toBe(true);
});
```

- [x] **Step 2: Implement scale generation from canonical values only.**

The generator must compute `intervalCount = maximumMl / minorEveryMl`; it may not contain a hardcoded `50`, `10`, or independent label interval. Master emits the full scale; preview/thumbnail use the source-derived LOD policy to omit unreadable minor marks without inventing a different calibration.

- [x] **Step 3: Implement continuous flow paths.**

Acid: graduated glass tube → PTFE stopcock body → glass outlet/tip. Alkali: lower glass connector → one rubber tube → one glass bead → pinch region → glass tip. The bead has one visual layer and one semantic part. A support port is metadata only in a standalone asset; a stand/clamp is composition-owned.

- [x] **Step 4: Run scale and mechanism tests.**

Run: `node tools/create_gold_master_assets.mjs; pnpm exec vitest run packages/render/src/assets/gold-master.test.ts`

Expected: PASS for 500 intervals on the 25 mL source, 500 intervals on the 50 mL source, tube attachment, no duplicate bead and continuous endpoints.

- [x] **Step 5: Commit the calibrated apparatus marks.**

```powershell
git add packages/render/src/assets/gold-master-construction.json tools/create_gold_master_assets.mjs packages/render/src/assets/gold-master.test.ts docs/visual/apparatus-standard.md docs/visual/m6-art-direction.md
git commit -m "fix: derive apparatus graduations from calibrated profiles"
```

### Task 4: Make LOD and comparison evidence semantic and physically scaled

**Files:**
- Modify: `tools/create_gold_master_assets.mjs`
- Modify: `packages/render/src/assets/gold-master.test.ts`
- Modify: `assets/apparatus/catalog/gold-master/manifest.json`
- Modify: `assets/apparatus/catalog/gold-master/qa/comparison-sheet-physical-scale.svg`
- Modify: `assets/apparatus/catalog/gold-master/qa/comparison-sheet-normalized-shape.svg`
- Modify: `docs/evidence/M6.md`

**Interfaces:**
- Consumes: source `lodVisibility`, physical envelopes and generated master SVGs.
- Produces: explicit visibility-role matrices and a single-factor physical comparison sheet.

- [x] **Step 1: Write failing semantic LOD and common-scale tests.**

```ts
it("uses semantic LOD visibility rather than path count as the acceptance proof", async () => {
  for (const asset of manifest.assets) {
    expect(await visibleRoles(asset, "thumbnail")).toEqual(asset.lodVisibility.thumbnail.visibleRoles);
    expect(await visibleRoles(asset, "thumbnail")).not.toContain("qa-overlay");
  }
});

it("uses one millimetre-to-pixel scale for the physical sheet", async () => {
  const sheet = await readPhysicalComparisonSheet();
  expect(new Set(sheet.embeddedMasters.map((item) => item.mmToPx))).toEqual(new Set([sheet.mmToPx]));
  expect(sheet.scaleLegend).toBe(`${sheet.mmToPx} px per mm`);
});
```

- [x] **Step 2: Generate explicit role visibility.**

The source may declare family-specific structural roles such as `silhouette`, `rim`, `spout`, `actuator`, `graduation-major`, `graduation-minor` and `highlight` per LOD. Runtime-only/support/selection/shadow/QA roles are explicitly absent or hidden from clean-master geometry; the generator decides visibility from the source map. Path count is diagnostic only and cannot be used as proof.

- [x] **Step 3: Rebuild comparison sheets.**

The physical sheet embeds every master using one declared `mmToPx` factor, a real ruler and physical envelopes; it must not independently fit each asset into a cell. The normalized sheet may fit each item, but declares `data-review-mode="visual-only"` and never supplies dimensional evidence.

- [x] **Step 4: Update evidence honestly.**

`M6-LOD` and visual geometry rows remain `PARTIAL` until owner dual-background review; package-level semantic tests may be marked PASS only for their narrow contract. Rename package headings and manifests to `Gold Master Candidate`.

- [x] **Step 5: Run the focused evidence tests.**

Run: `node tools/create_gold_master_assets.mjs; pnpm exec vitest run packages/render/src/assets/gold-master.test.ts`

Expected: PASS for role matrices and common scale; evidence no longer claims visual acceptance.

- [x] **Step 6: Commit LOD/evidence generation.**

```powershell
git add tools/create_gold_master_assets.mjs packages/render/src/assets/gold-master.test.ts assets/apparatus/catalog/gold-master docs/evidence/M6.md
git commit -m "test: make M6 LOD and scale evidence semantic"
```

### Task 5: Complete contract/document alignment and source records

**Files:**
- Modify: `docs/superpowers/specs/2026-09-15-m6-visual-asset-system-redesign.md`
- Modify: `docs/superpowers/specs/2026-09-15-m6-apparatus-industrialization.md`
- Modify: `docs/visual/apparatus-standard.md`
- Modify: `docs/visual/m6-art-direction.md`
- Modify: `assets/apparatus/catalog/source-record.md`
- Modify: `assets/apparatus/catalog/gold-master/source-record.md`
- Modify: `assets/apparatus/catalog/gold-master/qa/README.md`
- Modify: `docs/evidence/M6.md`
- Test: `tools/check_m6_entry.mjs` or a new `tools/check_m6_gold_master_contract.mjs`

**Interfaces:**
- Consumes: generated package manifest and canonical source IDs.
- Produces: one consistent M6 contract with explicit candidate status, no stale visual claims and reproducible review commands.

- [x] **Step 1: Add a contract test for forbidden semantic drift.**

```js
assert.match(artDirection, /true millimetre|physical millimetre/i);
assert.doesNotMatch(artDirection, /path count.*proves|all.*shadow.*master/i);
assert.match(evidence, /Gold Master Candidate/);
assert.doesNotMatch(evidence, /M6-LOD\s*\|\s*PASS locally\s*\|/i);
```

- [x] **Step 2: Align every document.**

State that profile geometry is serialized/source-backed, SVG master coordinates are actual mm, shadow/support/QA overlays are not clean master content, standard-backed product dimensions are distinct from approximate visual proportions, and owner visual review is still required. Keep the strong-acid phenolphthalein orange requirement documented as out of scope for implementation.

- [x] **Step 3: Record external sources without claiming unsupported precision.**

Retain official DWK/Corning and Zhejiang/Chinese education-equipment references in source records. Each datum states whether it is reported, a family anchor, or an approximate visual construction. Do not turn a catalog marketing dimension into an unqualified metrology claim.

- [x] **Step 4: Run contract checks.**

Run: `pnpm verify:m6-entry; pnpm verify:m6-gold-master; pnpm verify:m6-renderer; pnpm exec vitest run packages/render/src/assets/gold-master.test.ts`

Expected: PASS with all M6 package/evidence claims scoped to verified local contracts.

### Task 6: Two-round self-audit and repository verification

**Files:**
- Modify: `docs/evidence/M6.md`
- Create: `docs/research/m6-gold-master-self-audit.md`
- Test: `packages/render/src/assets/gold-master.test.ts`
- Test: `packages/render/src/assets/apparatus-catalog.test.ts`

**Interfaces:**
- Consumes: all generated artifacts, source records, M6 docs and existing M4/M5 verification commands.
- Produces: a two-round audit record with findings, resolutions and exact commands.

- [x] **Step 1: Perform Audit A — source/contract/invariant review.**

Check source-to-catalog-to-manifest-to-SVG identity, central version references, true-mm bounds, profile hashes, no duplicate catalog entries, LOD role matrix, clean-master overlays, graduation derivation and unchanged M4/M5 imports/guards.

- [x] **Step 2: Perform Audit B — rendered visual/acceptance review.**

Render representative acid burette, alkali burette, 250 mL beaker and 250 mL flask at full and thumbnail sizes on dark-neutral and light-neutral backgrounds. Review silhouette, real apparatus anatomy, transparent material, continuous connections, rim/spout continuity, graduation placement, scale-sheet common factor and absence of QA overlays. Record any remaining visual judgment as owner-blocked, not PASS.

- [x] **Step 3: Run the complete local verification set.**

Run:

```powershell
pnpm generate:versions
pnpm typecheck
pnpm typecheck:tests
pnpm test
pnpm build
pnpm depcruise
pnpm guards
pnpm verify:versions
pnpm verify:m6-entry
pnpm verify:m6-gold-master
pnpm verify:m6-renderer
pnpm verify:world
pnpm artifacts
pnpm lint
node tools/create_gold_master_assets.mjs
git diff --check
```

Expected: all commands pass; generated artifacts are unchanged after the second generation; M4 remains S3 and M6 remains S2 candidate.

- [x] **Step 4: Commit the audit handoff and push.**

```powershell
git add .github/workflows/ci.yml assets/apparatus/catalog packages/render/src/assets docs/evidence/M6.md docs/research/m6-gold-master-self-audit.md docs/superpowers/plans/2026-09-15-m6-gold-master-contract-remediation.md docs/superpowers/specs/2026-09-15-m6-visual-asset-system-redesign.md docs/visual package.json tests/m6-gold-master-contract.test.mjs tools/create_gold_master_assets.mjs tools/check_m6_gold_master_contract.mjs
git commit -m "fix: close M6 Gold Master package contract"
git push
```

## Acceptance Matrix

| Criterion | Evidence required |
|---|---|
| One construction source | source schema test, generated catalog equality, generator consumes source |
| True millimetre geometry | measured SVG bounds and landmark-to-path tests |
| Family anatomy | continuous beaker rim/spout, curved flask, acid/alkali flow-path tests |
| Calibrated graduations | interval-count/extent/attachment tests from canonical graduation values |
| Clean masters | no shadow, QA overlay, fake hardware/base or runtime state tests |
| Semantic LOD | manifest role matrix and visibility tests; no path-count acceptance claim |
| Physical comparison | one common mm-to-px factor plus ruler/legend test |
| Catalog alignment | source-derived typed catalog and manifest identity test |
| Source fidelity | per-datum claim class and citation/source-record review |
| Visual quality | owner-reviewed full/thumbnail dual-background captures; package tests alone are insufficient |
| Regression safety | M4/M5 scientific, world, identity, privacy and existing renderer checks |

## Stop/Go

- **STOP:** if generated geometry does not satisfy measured landmarks, if a path is outside the declared physical envelope, if a clean master contains QA/scene overlays, if catalog and manifest diverge, or if evidence would need to be weakened to pass.
- **GO to visual owner review only:** all source, geometry, graduation, LOD and evidence contract tests pass and two self-audits contain no unresolved P0/P1.
- **M6 S3 remains blocked:** until owner accepts the full/thumbnail dark/light visual baseline and all M6 acceptance rows are evidenced.
