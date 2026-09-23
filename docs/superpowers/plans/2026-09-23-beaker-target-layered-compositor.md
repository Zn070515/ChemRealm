# 250 mL Beaker Target-Layered Compositor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the rejected flat Pixi liquid material with a bounded layered compositor for the 100 mL blue visual-stress fixture.

**Architecture:** Keep the existing Observable/RenderState boundary. Add a verified visual-layer package and render the sequence `body-back → liquid mesh/material → surface → glass-front detail → graduations` in Pixi WebGL. Blender GPU remains an offline authoring/calibration backend only.

**Tech Stack:** TypeScript, PixiJS 8 WebGL, SVG/PNG runtime derivatives, Playwright, Vitest, Blender 5.2.2/Cycles OptiX when available.

**Spec:** `docs/superpowers/specs/2026-09-23-beaker-target-layered-compositor.md`

## Global Constraints

- Scientific truth remains `World → ScientificFrame → Observable → RenderState → renderer`.
- No renderer import from `packages/sci` or `packages/world`.
- No renderer-side volume, chemistry, optical-model or indicator palette logic.
- No global body alpha reduction.
- Target and NOBOOK references remain review inputs, never runtime assets.
- Current optical refusal behavior remains unchanged.
- M6 remains S2 until owner visual review.

---

### Task 1: Add the rejected-target regression contract

**Files:**
- Modify: `packages/render/src/pixi/liquid-material.test.ts`
- Modify: `packages/render/src/pixi/renderer.test.ts`
- Test: existing M6 browser visual capture path

**Interfaces:**
- Consumes: existing `BeakerLiquidMaterialInput`, `BeakerSceneActor`, and
  `mountPixiExperiment`.
- Produces: failing assertions for front/back layer ordering, no global-alpha
  mutation, and no renderer-local cavity constants.

- [ ] Step 1: Add a test that reads the liquid material source and rejects
  `body.alpha` mutation, renderer-local `cavityTop/cavityBottom` constants, and
  production `Graphics.fill` as the liquid material path.
- [ ] Step 2: Add a material-input test proving unavailable/ambiguous optical
  observations still produce neutral/refusal input.
- [ ] Step 3: Run `pnpm exec vitest run packages/render/src/pixi/liquid-material.test.ts packages/render/src/pixi/renderer.test.ts` and confirm the new structural assertions fail before implementation.

### Task 2: Create the declared visual-layer manifest

**Files:**
- Create: `assets/apparatus/masters/beaker-250ml/source/visual-body/runtime/layer-manifest.json`
- Create: `packages/render/src/assets/beaker-visual-layer-manifest.json`
- Modify: `tools/generate_beaker_visual_body_layers.mjs`
- Modify: `tools/check_beaker_visual_body.mjs`
- Test: `tests/m6-beaker-layer-manifest.test.mjs`

**Interfaces:**
- Consumes: existing body manifest and generated visual calibration.
- Produces: one generated, hashed visual-layer identity with roles `backBody`,
  `liquidResponse`, `surfaceResponse`, and `frontDetail`.

- [ ] Step 1: Define the manifest schema with source manifest hash, body hash,
  calibration hash, role paths, role MIME types, and `measurementUse: forbidden`.
- [ ] Step 2: Generate a first derivative package from the existing authored body
  without embedding the target PNG. The initial back/front roles may be
  explicitly provisional, but every role must be hashable and aligned.
- [ ] Step 3: Add negative tests for missing role, mismatched source hash,
  duplicate role path, and target PNG referenced as a runtime source.
- [ ] Step 4: Run `pnpm generate:beaker-visual-body-layers` and the manifest test.

### Task 3: Replace the filter-only body with a layered Pixi compositor

**Files:**
- Modify: `packages/render/src/pixi/liquid-material.ts`
- Modify: `packages/render/src/pixi/renderer.ts`
- Modify: `packages/render/src/pixi/beaker-geometry.ts`
- Create: `packages/render/src/pixi/beaker-layered-compositor.ts`
- Test: `packages/render/src/pixi/beaker-layered-compositor.test.ts`

**Interfaces:**
- Consumes: `BeakerSceneActor`, verified visual-layer manifest, existing
  `buildBeakerLiquidGeometry(fillFraction)`, and actor optical status/tint.
- Produces: `buildBeakerLayeredComposition(actor, textures)` returning a
  renderer-only object with `backBody`, `liquidBody`, `surface`, `frontDetail`.

- [ ] Step 1: Implement `buildBeakerLayeredComposition()` so the liquid level
  comes only from actor geometry and all layer identities come from the verified
  manifest.
- [ ] Step 2: Replace the current filtered white Graphics body with a real
  cavity mesh using the manifest-owned boundary path/points and UVs.
- [ ] Step 3: Add liquid fragment inputs for non-flat depth, wall contact,
  base response, and surface response. Keep the material chemistry-blind.
- [ ] Step 4: Add a separate front-detail pass and keep the authored front/rim
  response at full opacity. Do not add white/dark hand-drawn glass strokes.
- [ ] Step 5: Use a Pixi render texture only for bounded scene-colour sampling;
  if unsupported, use the explicit calibrated fallback and expose its status in
  the candidate evidence.
- [ ] Step 6: Run the focused render tests and assert layer order, source hash,
  unchanged actor identity, and no scientific imports.

### Task 4: Produce the offline GPU calibration evidence

**Files:**
- Modify: `tools/blender/jobs/beaker-250ml-griffin/build.py`
- Modify: `tools/blender/jobs/beaker-250ml-griffin/render.py`
- Modify: `tools/blender/jobs/beaker-250ml-griffin/validate.py`
- Create: `tools/blender/jobs/beaker-250ml-griffin/jobs/target-layered-100ml.json`
- Create: `assets/apparatus/masters/beaker-250ml/qa/target-layered-material/`
- Modify: `docs/evidence/M6.md`

**Interfaces:**
- Consumes: existing measurement sheet, manifest, calibration identity and
  Blender central toolchain.
- Produces: GPU-rendered source/derivative hashes and light/dark layer renders;
  no scientific or production optical claim.

- [ ] Step 1: Add one Blender job for the 100 mL blue visual-stress state with
  explicit OptiX preference and CPU fallback recording.
- [ ] Step 2: Render back/front/liquid/surface/object-mask passes with fixed
  orthographic camera, background, color management and source hashes.
- [ ] Step 3: Validate dimensions, named objects, source identities, no external
  dependencies, no embedded scripts/drivers, and `measurementUse: forbidden`.
- [ ] Step 4: Run the job headlessly and store metadata; do not overwrite the
  approved target or use it as a scene texture.

### Task 5: Add browser captures and visual-regression evidence

**Files:**
- Modify: `tests/browser/m6-visual.spec.ts`
- Modify: `tests/visual/capture.spec.ts`
- Create: `tests/visual/target-layered-regression.test.ts`
- Create: `assets/apparatus/masters/beaker-250ml/qa/target-layered-material/review.md`
- Modify: `docs/research/beaker-liquid-material-reconstruction.md`
- Modify: `docs/evidence/M6.md`

**Interfaces:**
- Consumes: same real visual-stress actor path and layered compositor.
- Produces: 100 mL light/dark/full/thumbnail captures, rejection evidence for
  neutral/refusal, and explicit S2/prototype status.

- [ ] Step 1: Capture the layered compositor at fixed logical dimensions and
  named viewport sizes.
- [ ] Step 2: Add a regression check that the loaded body does not globally
  reduce alpha and that liquid pixels remain inside the visual cavity.
- [ ] Step 3: Add a visual review record that compares target feature regions:
  rim/base preservation, surface, liquid body, side contact and background.
- [ ] Step 4: Run all focused tests and update M6 evidence without marking Gold
  Master, M6 S3, or scientific optical acceptance.

### Task 6: Full verification and handoff

**Files:**
- Modify: `docs/evidence/M6.md`
- Modify: `docs/research/beaker-target-reproduction-platform-audit.md`

- [ ] Step 1: Run `pnpm typecheck`.
- [ ] Step 2: Run `pnpm typecheck:tests`.
- [ ] Step 3: Run `pnpm test`.
- [ ] Step 4: Run `pnpm build`.
- [ ] Step 5: Run `pnpm lint` and `pnpm depcruise`.
- [ ] Step 6: Run `pnpm guards`, `pnpm verify:m6-renderer`,
  `pnpm verify:m6-gold-master`, `pnpm verify:m6-master-packages`, and
  `pnpm verify:beaker-visual-body`.
- [ ] Step 7: Run `pnpm test:browser` and the M6 capture command with
  `M6_CAPTURE=1`.
- [ ] Step 8: Inspect `git diff --check`, the output hashes, and the visual
  review matrix before any completion claim.
- [ ] Step 9: Record remaining mismatches honestly; if the result is still a
  flat card, keep `M6-LIQUID-MATERIAL` PARTIAL and stop.
