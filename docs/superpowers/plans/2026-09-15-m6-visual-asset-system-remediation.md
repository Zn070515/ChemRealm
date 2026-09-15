# M6 Visual Asset System Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the first rough apparatus slice with a parameterized, high-fidelity, original visual asset system whose family variants, state layers and interaction geometry are verifiably coherent.

**Architecture:** Keep the change inside the Representation Engine. A frozen typed catalog and asset package own geometry, parts, ports, anchors, hit regions, capabilities and visual tokens; RenderState remains the only runtime input to Pixi. Scientific Reality, World Runtime, replay, optical observation and persistence remain upstream owners.

**Tech Stack:** TypeScript, Vitest, SVG construction masters, PixiJS v8, Playwright, JSON manifests and existing version/asset/world/science guards.

**Spec:** `docs/superpowers/specs/2026-09-15-m6-visual-asset-system-redesign.md`

## Global Constraints

- Use `docs/visual/m6-art-direction.md` as the M6 visual production standard.
- Active versions come only from `contracts/version-manifest.json` and generated schema versions.
- `packages/render/src/pixi` consumes RenderState/representation data only; it must not import Sci or World.
- No new chemistry, optical, WorldState, DomainEvent, replay or persistence semantics.
- No copying, tracing, scraping or runtime fetching of NOBOOK/vendor artwork.
- A chemical color is valid only when supplied by the optical-observation contract; refusal stays refusal.
- The experiment world uses a fixed orthographic camera with bounded 2.5D depth
  cues; quantitative evidence uses a strict frontal orthographic measurement
  presentation; catalog, inspector and construction previews may use bounded
  2.5D only with an explicit `non-measurement` label.
- Visual tokens use rendered-height size classes and deterministic LOD rules;
  every changed geometry parameter carries source provenance or an explicit
  approximate-visual rationale.
- Gold Master review starts with acid/alkali burettes, 100/250/1000 mL beakers
  and 100/250/500 mL Erlenmeyer flasks. The remaining catalog families are not
  allowed to conceal an unreviewed first visual system.
- Apparatus geometry is reusable; liquid, gas, bubbles, precipitate, thermal and
  optical effects are upstream state overlays, never chemistry-specific vessel
  copies.
- Every Gold Master is reviewed at full-size and thumbnail scale on both dark
  and light neutral backgrounds.
- A visual or interaction failure keeps M6 at S2 and blocks M7 authorization.

---

### Task 1: Freeze the visual-system contract and evidence status

**Files:**
- Create: `docs/visual/m6-art-direction.md`
- Create: `docs/superpowers/specs/2026-09-15-m6-visual-asset-system-redesign.md`
- Create: `tools/check_m6_visual_docs.mjs`
- Modify: `package.json`
- Modify: `docs/evidence/M6.md`
- Modify: `docs/visual/review-m6.md`
- Modify: `docs/superpowers/specs/2026-09-15-m6-apparatus-industrialization.md`

**Interfaces:**
- Consumes: GOAL, SPEC, apparatus standard, current M6 contracts and research.
- Produces: one M6 visual standard, one implementation spec and an evidence packet that calls the existing visual gate NO-GO instead of implying final-quality acceptance.

- [ ] **Step 1: Add a failing documentation-consistency assertion.**

Create a dedicated `verify:m6-visual-docs` script backed by
`tools/check_m6_visual_docs.mjs`. It must fail if evidence says visual owner
acceptance is complete while the art-direction file has an open P0 gate, or if
the older M6 apparatus spec calls the first slice final-quality without linking
the new standard.

```text
expected failure: M6 evidence contradicts the visual-system gate
```

- [ ] **Step 2: Run the assertion and verify the expected failure.**

```text
pnpm verify:m6-visual-docs
```

- [ ] **Step 3: Write the standard/spec and downgrade stale claims.**

Define family geometry, material language, state/interaction/effect separation,
surface view modes, size-class/LOD rules, Gold Master scope, asset-package
contents, no-copy boundary, P0/P1 gates and two-round evidence. Keep local
catalog/renderer passes as technical evidence only.

- [ ] **Step 4: Verify documentation consistency.**

```text
pnpm verify:m6-visual-docs
git diff --check
```

Expected: PASS with M6 still S2 and visual owner acceptance open.

- [ ] **Step 5: Commit.**

```text
git add docs/visual docs/evidence/M6.md docs/superpowers/specs
git commit -m "Define M6 apparatus art direction and visual gate"
```

**Stop/go:** GO only when no document calls the rough first slice final-quality,
every visual claim points to a binary gate, and the planned Gold Master/LOD/
background evidence is explicit.

### Task 2: Extend the catalog for construction and interaction semantics

**Files:**
- Modify: `packages/render/src/assets/apparatus-catalog.ts`
- Modify: `packages/render/src/assets/apparatus-catalog.test.ts`
- Modify: `assets/apparatus/catalog/manifest.json`
- Modify: `assets/apparatus/catalog/source-record.md`
- Modify: `assets/apparatus/catalog/qa/README.md`

**Interfaces:**
- Consumes: existing apparatus specification, part, port, provenance, profile and central-version types.
- Produces: `ApparatusAnchor`, `ApparatusHitRegion`, `ApparatusCapability`,
  `ApparatusStateVariant`, `ApparatusActuator` and normalized geometry
  signatures.

- [ ] **Step 1: Write failing catalog tests.**

```ts
it("rejects a same-family variant whose normalized geometry is identical", () => {
  expect(() => validateApparatusCatalog(cloneWithOnlyCapacityLabelChanged()))
    .toThrow("visible geometry variant");
});

it("requires each detachable part to expose an anchor and hit region", () => {
  expect(() => validateApparatusCatalog(removeTubeAnchor()))
    .toThrow("detachable part interaction geometry");
});

it("requires a beaker to expose a fluid-outlet capability", () => {
  expect(() => validateApparatusCatalog(removeBeakerSpoutCapability()))
    .toThrow("fluid-outlet capability");
});
```

- [ ] **Step 2: Run focused tests and observe the expected failures.**

```text
pnpm exec vitest run packages/render/src/assets/apparatus-catalog.test.ts
```

- [ ] **Step 3: Implement the minimal immutable contract.**

```ts
interface ApparatusAnchor {
  readonly id: string;
  readonly partId: string;
  readonly kind: "mouth" | "base" | "grip" | "outlet" | "clamp" | "snap";
  readonly positionMm: PointMm;
}

interface ApparatusHitRegion {
  readonly id: string;
  readonly partId: string;
  readonly boundsMm: BoundsMm;
  readonly target: "focus" | "drag" | "connect" | "inspect";
}

interface ApparatusCapability {
  readonly id: string;
  readonly partId: string;
  readonly action: "hold" | "pour" | "connect" | "detach" | "inspect";
}

interface ApparatusActuator {
  readonly id: string;
  readonly partId: string;
  readonly kind: "rotary-valve" | "pinch-valve" | "press-bulb" | "grip" | "open-close" | "adjust-clamp" | "read-meniscus";
  readonly intent: "rotate-valve" | "pinch-tube" | "press-bulb" | "grip" | "open" | "close" | "adjust-clamp" | "read-meniscus";
}
```

Include dimensions, aspect ratio, structural marker positions, graduation
metadata and profile identity in normalized geometry signatures. Labels alone
cannot qualify a variant. Detachable parts need anchors and hit regions. Acid
and alkali burettes must use distinct actuator records (`rotary-valve` versus
`pinch-valve`) and map to distinct future command intents. Geometry changes
must include a provenance class or an explicit `approximate-visual` rationale.

Add a failing regression for the semantic distinction:

```ts
it("does not treat acid and alkali burettes as the same actuator", () => {
  expect(specFor("burette-acid-25ml-class-as").actuators[0].kind)
    .toBe("rotary-valve");
  expect(specFor("burette-alkali-50ml-class-b").actuators[0].kind)
    .toBe("pinch-valve");
});
```

- [ ] **Step 4: Run focused and existing catalog tests.**

```text
pnpm exec vitest run packages/render/src/assets/apparatus-catalog.test.ts
pnpm test -- packages/render/src/assets/titration-bench.test.ts
```

- [ ] **Step 5: Commit.**

```text
git add packages/render/src/assets assets/apparatus/catalog
git commit -m "Add apparatus interaction and variant contracts"
```

**Stop/go:** STOP if a variant passes by changing only a label/capacity field or a detachable part lacks traceable interaction geometry.

### Task 3: Build family construction masters and visual QA sheets

**Files:**
- Modify: `assets/apparatus/catalog/master.svg`
- Modify: `assets/apparatus/titration-bench/master.svg`
- Create/modify: `assets/apparatus/catalog/master/burette.svg`, `beaker.svg`, `erlenmeyer-flask.svg`, `graduated-cylinder.svg`, `volumetric-flask.svg`, `test-tube.svg`, `connectors.svg`
- Create/modify: `assets/apparatus/catalog/states/burette-empty.svg`, `burette-loaded.svg`, `beaker-empty.svg`, `beaker-loaded.svg`, `connector-disconnected.svg`, `connector-connected.svg`
- Create/modify: `assets/apparatus/catalog/qa/geometry-review.md`
- Create/modify: `assets/apparatus/catalog/qa/comparison-sheet-physical-scale.svg`
- Create/modify: `assets/apparatus/catalog/qa/comparison-sheet-normalized-shape.svg`
- Create/modify: `assets/apparatus/catalog/qa/visual-token-review.md`
- Create/modify: `assets/apparatus/catalog/qa/screenshots/*`

**Interfaces:**
- Consumes: art-direction geometry/material rules and typed catalog specifications.
- Produces: original layered masters whose semantic parts correspond to catalog IDs and whose specifications have visibly different construction.

The first visual owner gate is a bounded Gold Master set, not the whole
catalog: acid 25 mL and alkali 50 mL burettes; 100/250/1000 mL beakers; and
100/250/500 mL Erlenmeyer flasks. Graduated cylinders, volumetric flasks, test
tubes and connector families remain required catalog work, but cannot be used
to declare the Gold Master visual language accepted before these first families
pass.

- [ ] **Step 1: Add failing asset QA tests.**

```ts
it("requires core family masters to expose structural data layers", () => {
  expect(master).toContain('data-layer="rim"');
  expect(master).toContain('data-layer="base"');
  expect(master).toContain('data-layer="interaction"');
});

it("requires comparison evidence to contain non-uniform family variants", () => {
  expect(readGeometrySignatures()).toSatisfy(containsVisibleVariantDifferences);
});

it("rejects masters outside the visual-token contract", () => {
  expect(validateVisualTokens(outOfBandTokens())).toThrow("visual token");
});

it("rejects forbidden visual-pattern markers", () => {
  expect(validateVisualQa(forbiddenCandyGlassFixture())).toThrow("forbidden visual pattern");
});

it("keeps identity-defining structure in preview and thumbnail LODs", () => {
  expect(visibleLayers("beaker-250ml", "thumbnail"))
    .toEqual(expect.arrayContaining(["rim", "spout", "base"]));
});

it("requires Gold Masters to pass both neutral background fixtures", () => {
  expect(backgroundQa("burette-acid-25ml-class-as"))
    .toEqual(expect.arrayContaining(["light-neutral", "dark-neutral"]));
});
```

- [ ] **Step 2: Run QA tests and observe missing construction evidence.**

```text
pnpm exec vitest run packages/render/src/assets/titration-bench.test.ts
```

- [ ] **Step 3: Produce original masters using the construction system.**

Each master separates silhouette, rim/mouth, wall/base, liquid, meniscus,
calibration/scale, hardware, highlights, contact shadow and interaction overlay.
Phenomena remain reusable state/effect overlays; do not create
`bubbling-beaker.svg` or `precipitate-flask.svg`. First produce the Gold Master
families, then extend the same construction system to graduated-cylinder,
volumetric-flask, test-tube and connector families. Keep runtime pH, liquid
amount, optical color and readouts out of baked art. Acid burettes must visibly
expose a glass/PTFE rotary stopcock; alkali burettes must visibly expose the
rubber-tube/glass-bead pinch mechanism. Do not use a generic stopcock for both
families.

For each Gold Master produce deterministic `master`, `scene`, `preview` and
`thumbnail` LODs. Preview/thumbnail may omit minor graduations, tiny labels,
micro seams and noncritical shadows, but must retain silhouette, opening/neck,
spout/outlet, actuator and detachable-part cues. All LODs share semantic
dimensions, profile identity, parts and actuator kind.

- [ ] **Step 4: Add QA records and comparison sheet.**

Record source class, approximation scope, structural checks, variant dimensions,
changed-parameter provenance and visual limitations. Produce two sheets: one at
declared physical scale with measurement-valid labels, and one at normalized
shape scale with a legend of intentionally changed dimensions. Mark the latter
visual-only. Run size-class visual-token ranges and forbidden-pattern checks over
every master, LOD and state variant. Capture every Gold Master at full-size and
thumbnail scale on both dark-neutral and light-neutral backgrounds; record
contrast, token class, viewport and reviewer disposition.

- [ ] **Step 5: Run package/source QA.**

```text
pnpm exec vitest run packages/render/src/assets/titration-bench.test.ts
pnpm exec vitest run packages/render/src/assets/apparatus-catalog.test.ts
pnpm verify:versions
pnpm artifacts
```

- [ ] **Step 6: Commit.**

```text
git add assets/apparatus
git commit -m "Create M6 family construction masters and visual QA"
```

**Stop/go:** GO only when an owner can identify main apparatus and capacity
differences from the comparison sheet without reading code, every Gold Master
retains identity at thumbnail size, and neither neutral background requires an
unapproved visual workaround.

### Task 4: Bind runtime rendering to the family system

**Files:**
- Modify: `packages/render/src/state/titration.ts`
- Modify: `packages/render/src/state/scene.test.ts`
- Modify: `packages/render/src/pixi/renderer.ts`
- Modify: `packages/render/src/pixi/tokens.ts`
- Create/modify: `packages/render/src/pixi/renderer.test.ts`
- Modify: `packages/render/src/observable/level.ts`
- Modify: `packages/render/src/observable/level.test.ts`

**Interfaces:**
- Consumes: validated catalog specs, ScientificFrame, ObservableModel and RenderState.
- Produces: one deterministic RenderState-only renderer using family construction data and state-provided liquid/profile values. Actuator metadata is mapped to future command intents but does not create M7 events.

- [ ] **Step 1: Write failing render/state tests.**

```ts
it("renders 25 mL and 100 mL burettes with different normalized construction", () => {
  expect(renderGeometrySignature(stateFor("burette-acid-25ml-class-as")))
    .not.toEqual(renderGeometrySignature(stateFor("burette-v0-100ml")));
});

it("does not invent an optical color when the observable is refused", () => {
  expect(renderStateForRefusal().inspection.tint).toEqual("neutral");
});

it("keeps experiment depth orthographic and measurement presentation frontal", () => {
  expect(viewSpec("experiment-world").projection).toBe("orthographic");
  expect(viewSpec("measurement").measurementQualified).toBe(true);
  expect(viewSpec("catalog-preview").measurementQualified).toBe(false);
});

it("selects a smaller LOD without changing semantic identity", () => {
  expect(assetLod("beaker-250ml", "thumbnail").profileHash)
    .toBe(assetLod("beaker-250ml", "master").profileHash);
  expect(visibleLayers("beaker-250ml", "thumbnail"))
    .toEqual(expect.arrayContaining(["rim", "spout", "base"]));
});
```

- [ ] **Step 2: Run focused tests and observe static v0 limitations.**

```text
pnpm exec vitest run packages/render/src/pixi/renderer.test.ts packages/render/src/state/scene.test.ts
```

- [ ] **Step 3: Implement minimal RenderState-only binding.**

Select geometry by specification ID and use only Observable fields for liquid,
meniscus, readout and optical result. Keep hit regions/anchors and actuator
records in representation data and do not create World events. Reuse central
tokens and avoid chemistry-name branches. Use a fixed orthographic camera with
bounded 2.5D depth cues for the experiment world; route quantitative readings
through a strict frontal `measurement` presentation. Any
catalog/inspector/construction 2.5D preview must be labelled non-measurement.
Select LOD by rendered size class, retain identity-defining features in
thumbnails, and keep liquid/effect layers separate from apparatus geometry.

- [ ] **Step 4: Run boundaries.**

```text
pnpm exec vitest run packages/render/src/pixi/renderer.test.ts packages/render/src/state/scene.test.ts packages/render/src/observable/level.test.ts
pnpm verify:m6-renderer
pnpm verify:world
pnpm verify:scientific-math
pnpm verify:scientific-quantities
```

- [ ] **Step 5: Commit.**

```text
git add packages/render/src
git commit -m "Bind renderer to parameterized apparatus families"
```

**Stop/go:** STOP on any Sci/World import, chemistry branch, second physical source or renderer-only chemical state.

### Task 5: Add deterministic visual states, accessibility and browser evidence

**Files:**
- Modify: `tests/visual/m6-visual.spec.ts`
- Modify: `tests/visual/capture.spec.ts`
- Modify: `tests/visual/network-boundary.spec.ts`
- Modify: `apps/web/*` only for required DOM accessibility wiring
- Modify: `docs/visual/review-m6.md`
- Modify: `docs/evidence/M6.md`

**Interfaces:**
- Consumes: production RenderState, validated asset package, DOM readouts and four named viewport fixtures.
- Produces: reproducible browser/screenshot/accessibility evidence without upgrading M6 to S3 automatically.

- [ ] **Step 1: Write failing browser assertions.**

```ts
test("each viewport keeps apparatus and accessible readouts legible", async ({ page }) => {
  await expect(page.getByTestId("m6-apparatus-canvas")).toBeVisible();
  await expect(page.getByTestId("m6-inspection")).toContainText("model");
  await expect(page.getByTestId("burette-reading")).toContainText("mL");
});
```

Also assert refusal copy, one pH convention per view, core labels, focus targets,
no external requests, the `measurement` versus non-measurement view label and
the fact that the DOM companion remains available when the canvas is reduced.

- [ ] **Step 2: Run browser tests and observe incomplete composition evidence.**

```text
pnpm test:browser
```

- [ ] **Step 3: Implement only the required composition/accessibility wiring.**

Do not add M7 drag/connect events. Keep DOM readouts authoritative and the
canvas synchronized. Add no network dependency.

- [ ] **Step 4: Capture and inspect all viewports.**

```text
$env:M6_CAPTURE="1"
pnpm exec playwright test tests/visual/capture.spec.ts --project=chromium
```

Review each capture twice: first for clipping/overlap/state correctness, then
for proportion/material/variant/typography/originality/accessibility quality.
Repeat the visual pass against a dark-neutral and a light-neutral background.
Capture at least one full-size and one thumbnail-size Gold Master per family;
the preview/thumbnail must retain the identity-defining structure and may not
be a merely scaled construction master.

- [ ] **Step 5: Commit.**

```text
git add tests/visual docs/evidence/M6.md docs/visual/review-m6.md apps/web
git commit -m "Add M6 visual state and viewport evidence"
```

**Stop/go:** GO only when captures are reproducible, both background conditions
remain legible, no viewport hides apparatus/scale/liquid state/DOM readout, and
the experiment surface is not silently replaced by an editor/catalog layout.

### Task 6: Two-round cross-system audit and handoff

**Files:**
- Modify: `docs/evidence/M6.md`
- Modify: `docs/visual/review-m6.md`
- Modify: this plan
- Modify: `docs/research/m6-zhejiang-apparatus-and-visual-target.md` only for factual cross-links or source scope corrections

**Interfaces:**
- Consumes: all implementation artifacts and verification outputs.
- Produces: current acceptance matrix, known limitations and an exact handoff.

- [ ] **Step 1: Run contract/regression audit.**

```text
pnpm generate:versions
pnpm typecheck
pnpm typecheck:tests
pnpm test
pnpm build
pnpm depcruise
pnpm guards
pnpm verify:versions
pnpm verify:scientific-math
pnpm verify:scientific-quantities
pnpm verify:m4-contracts
pnpm verify:m5-contracts
pnpm verify:m6-visual-docs
pnpm verify:m6-entry
pnpm verify:m6-renderer
pnpm verify:world
pnpm artifacts
pnpm test:browser
pnpm lint
git diff --check
```

Audit specifically for central version distribution, Sci/World renderer imports,
molality/molarity bypass, optical refusal fallback, profile/hash mismatch,
snapshot hashes, full-transfer conservation, event/replay drift and false PASS.
Also audit orthographic-camera versus measurement-view ownership, forbidden
perspective convergence, size-class token selection, preview/thumbnail semantic
identity, dual-background legibility, effect-layer separation, actuator
distinction and NOBOOK layout/originality boundaries.

- [ ] **Step 2: Run independent visual/source audit.**

Check each family against the art direction, apparatus standard, Zhejiang
research matrix and source records. Inspect Gold Masters first, then remaining
family masters, comparison sheets, every LOD, state fixtures, hit geometry,
screenshots and accessibility copy without relying on the test summary. Check
both dark/light neutral backgrounds and verify that measurement evidence uses
the frontal presentation only.

- [ ] **Step 3: Update evidence without upgrading unsupported rows.**

Use only `PASS locally`, `PARTIAL`, `NOT RUN` and `BLOCKED`. Owner visual,
originality, accessibility and performance review remain separate from automated
package tests. M6 S3 is not written until every binary row and owner review pass.

- [ ] **Step 4: Commit the handoff.**

```text
git add docs/evidence docs/visual docs/superpowers/plans docs/research
git commit -m "Record M6 visual system audit handoff"
```

**Stop/go:** Any P0/P1 or false PASS leaves M6 at S2.

## Acceptance matrix

| Criterion | Required proof | Target |
|---|---|---|
| M6-VISUAL-SYSTEM | Art direction and forbidden-pattern contract | S1/S2 |
| M6-FAMILY-VARIANTS | normalized geometry signatures differ | S2 |
| M6-STRUCTURE | construction details and comparison sheet | S2 + owner review |
| M6-GOLD-MASTER | acid/alkali burettes, 100/250/1000 mL beakers and 100/250/500 mL Erlenmeyer flasks pass full/thumbnail dual-background review | S2 + owner review |
| M6-LOD | master/scene/preview/thumbnail retain semantic identity while allowing deterministic detail reduction | S2 |
| M6-VIEW-MODE | experiment world is bounded orthographic 2.5D; quantitative evidence is strict frontal measurement presentation; other 2.5D views are labelled non-measurement | S2 + owner review |
| M6-STATE | Observable-driven state fixtures | S2 |
| M6-INTERACTION | parts/ports/anchors/hit/capability tests | S2 |
| M6-MATERIAL | screenshots, size-class tokens, dual-background and material review | S2 + owner review |
| M6-REPLAY | existing world/profile/hash suite green | regression |
| M6-ACCESSIBILITY | browser/DOM/focus/contrast evidence | S2 + owner review |
| M6-PRIVACY | artifact/network checks | S2 |
| M6-S3 | owner visual/originality/accessibility/performance acceptance | not claimed |

## Handoff

Before M6 S3 discussion, record exact implementation commit, hosted CI run,
capture commit, open rows, owner decision and the command set above. Automated
green tests cannot replace P0/P1 visual review.
