# M6 Controlled Visual Studies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a reproducible GPU-backed Form/Glass/Lighting study workflow for the 250 mL Griffin beaker without promoting the current Blender prototype to Gold Master.

**Architecture:** Keep the existing Blender vertical-slice job and asset package as the baseline. Add a study-only manifest/validator, Blender scripts that derive candidate scenes from the existing source .blend, contact-sheet/A-B evidence, and a positive visual-reference Bible. Study outputs are isolated under the beaker QA tree and cannot alter scientific, World, Observable, or runtime contracts.

**Tech Stack:** Blender 5.2.2 Python API, Python 3.12 standard library, Node.js ESM, existing Playwright dependency, JSON/Markdown evidence, central version manifest.

**Spec:** `docs/superpowers/specs/2026-09-23-m6-visual-study-vertical-slice.md`

## Global Constraints

- Only `beaker-250ml-griffin` is in scope; no family generator or other apparatus.
- Existing vertical-slice source, rejected SVG, and canonical QA remain unchanged inputs.
- Blender is an authoring/rendering backend, not an owner of chemistry, World state, VolumeProfileSnapshot, optical science, or ACE.
- GPU OptiX is preferred for review; CPU is explicit fallback; cross-backend PNG identity is not claimed.
- Candidates are prototype evidence only; no Gold Master, M6 S3, or M7 admission claim.
- External references are linked/indexed with provenance; third-party images are not embedded as production art.
- No version literal is duplicated outside `contracts/version-manifest.json` and generated artifacts.
- Direct shared-worktree integration is used; no worktree, PR, force-push, MCP server, or third-party Blender MCP dependency.

---

### Task 1: Build the Positive Visual Reference Bible

**Files**

- Modify: `docs/visual/reference/README.md`
- Create: `docs/visual/reference/sources.json`
- Create: `docs/visual/reference/glass.md`
- Create: `docs/visual/reference/lighting.md`
- Create: `docs/visual/reference/composition.md`
- Create: `docs/visual/reference/beaker.md`
- Create: `docs/visual/reference/rejects.md`

**Interfaces**

- Consumes official manufacturer references, NOBOOK public descriptions, existing M6 visual contracts, and the rejected SVG review.
- Produces a source-indexed positive/negative visual language for study manifests and human review.

- [ ] **Step 1: Add the source register.** Record source ID, kind, URL, publisher, access date, usage status, and the observations supported. Include the Corning 250 mL Griffin record and the NOBOOK public product description. Use linked-description-only status unless a source license explicitly permits local embedding.
- [ ] **Step 2: Expand the README.** Keep the existing indicator-palette index and add separate sections for source-backed apparatus observations, ChemRealm visual direction, and rejected prototype patterns. State that external images are references, not production inputs.
- [ ] **Step 3: Write beaker guidance.** Cover low-form body, mouth/rim, spout continuity, bottom mass, marking spot, approximate graduations, front/rear wall separation, and thumbnail silhouette. Classify every point as source-backed, visual approximation, or ChemRealm policy.
- [ ] **Step 4: Write glass, lighting, and composition guidance.** Each file must contain GOOD, BAD, Observe, Do not copy, and Review views sections. Explain why uniform cyan body fill, outline dependence, continuous highlights, and theatrical reflections fail.
- [ ] **Step 5: Write rejects guidance.** Link the current A/B evidence and record the rejected SVG/prototype failure modes without declaring an unverified visual pass.
- [ ] **Step 6: Check the Bible.** Run `git diff --check` and `rg -n "TODO|TBD|license|usage|source-backed|visual-approximation" docs/visual/reference`. Every external source must be indexed and every visual rule classified.

### Task 2: Add the Study Manifest and Contract Guard

**Files**

- Create: `tools/blender/jobs/beaker-250ml-griffin/studies/study.json`
- Create: `tools/blender/jobs/beaker-250ml-griffin/studies/README.md`
- Create: `tools/blender/jobs/beaker-250ml-griffin/studies/validate_study.py`
- Create: `tools/check_m6_visual_studies.mjs`
- Modify: `package.json`

**Interfaces**

- Consumes `job.json`, `tools/blender/toolchain.json`, the measurement/source records, the reference source register, and the current source .blend.
- Produces validated study definitions, source hashes, candidate output paths, and non-zero failure for contract violations.

- [ ] **Step 1: Define the manifest.** It must contain `schemaVersion`, `studyId`, `assetId`, `baseJob`, `sourceBlend`, `outputRoot`, exact rounds `form/glass/lighting`, candidate IDs `F01-F04/G01-G04/L01-L03`, allowed variables, and `status: study-only`. Physical values remain in existing source records.
- [ ] **Step 2: Implement `validate_manifest(manifest_path: Path) -> dict`.** Reject duplicate IDs, unknown rounds, undeclared variables, missing base inputs, output paths outside the study root, non-study statuses, and missing referenced source files. Return a structured report and record SHA-256 for source inputs.
- [ ] **Step 3: Add `tools/check_m6_visual_studies.mjs`.** Require the three rounds, exact candidate counts 4/4/3, existing vertical-slice base paths, QA-contained outputs, and prototype/study-only language. Reject Gold Master or S3 claims.
- [ ] **Step 4: Add `verify:m6-visual-studies` to `package.json`.** Do not modify scientific or runtime scripts.
- [ ] **Step 5: Add negative fixtures.** Validate that duplicate IDs, form with `glass-treatment`, an output path escaping QA, and a missing base input fail while the canonical manifest passes.

### Task 3: Implement Isolated Blender Study Builds

**Files**

- Create: `tools/blender/jobs/beaker-250ml-griffin/studies/build_study.py`
- Create: `tools/blender/jobs/beaker-250ml-griffin/studies/study_variants.json`
- Create: `tools/blender/jobs/beaker-250ml-griffin/studies/render_study.py`

**Interfaces**

- Consumes the canonical study manifest and existing source .blend.
- Produces candidate .blend files with study ID, round, candidate ID, inherited IDs, and intentional-variable metadata.

- [ ] **Step 1: Define candidate controls.** Form candidates vary only rim profile, spout transition, base mass, or body taper; glass candidates vary only named glass material inputs; lighting candidates vary only named light/reflection-card rig values. These are visual controls, never scientific constants.
- [ ] **Step 2: Build from the source .blend.** Open the existing source, apply one candidate's declared controls, preserve semantic object IDs, and write under `assets/apparatus/masters/beaker-250ml/qa/blender-studies/{studyId}/`. Never call a generic apparatus-family generator.
- [ ] **Step 3: Enforce form isolation.** Use clay/neutral material, fixed camera, fixed light rig, and no glass trickery. Reject candidates that exceed the existing physical envelope; never silently clamp.
- [ ] **Step 4: Enforce glass isolation.** Use one explicit provisional form and fixed lighting. Only glass material node inputs may vary. Do not create liquid, indicator, or chemistry objects.
- [ ] **Step 5: Enforce lighting isolation.** Use one explicit provisional form and glass treatment. Keep geometry/material hashes constant and vary only the named rig.
- [ ] **Step 6: Document exact headless commands** for manifest validation, form build, glass build with form selection, and lighting build with form/glass selection.

### Task 4: Render Matrices and Contact Sheets

**Files**

- Create: `tools/blender/jobs/beaker-250ml-griffin/studies/contact_sheet.mjs`
- Create: `tools/blender/jobs/beaker-250ml-griffin/studies/ab_study.mjs`
- Modify: `tools/blender/jobs/beaker-250ml-griffin/studies/render_study.py`
- Create: `assets/apparatus/masters/beaker-250ml/qa/blender-studies/README.md`

**Interfaces**

- Consumes candidate .blend files and central toolchain settings.
- Produces required view renders, contact sheets, A/B sheets, metadata, and hashes.

- [ ] **Step 1: Render views.** Produce front-light, front-dark, thumbnail-light, thumbnail-dark, alpha, and configured close-ups. Metadata records Blender version/build, backend, color management, resolution, source hashes, output hashes, round, candidate, and inherited IDs.
- [ ] **Step 2: Generate contact sheets.** Use the existing Playwright dependency and local data URLs only. Label each candidate with ID, round, intentional variable, backend, and study-only status.
- [ ] **Step 3: Generate matched A/B.** Compare the current rejected SVG and provisional Blender baseline at front-light, front-dark, and thumbnail views. Label this as visual study evidence, not a quality oracle.
- [ ] **Step 4: Record backend evidence.** Run the form matrix on preferred GPU, repeat one candidate, run one CPU comparison, and record changed-pixel ratio/max/mean differences with the conclusion that cross-backend pixel identity is not required.

### Task 5: Study QA and Evidence Handoff

**Files**

- Modify: `tools/blender/jobs/beaker-250ml-griffin/studies/validate_study.py`
- Create: `assets/apparatus/masters/beaker-250ml/qa/blender-studies/review.md`
- Create: `assets/apparatus/masters/beaker-250ml/qa/blender-studies/validation.json`
- Modify: `docs/research/blender-m6-beaker-vertical-slice.md`
- Modify: `docs/evidence/M6.md`

**Interfaces**

- Consumes all manifests, candidate renders, metadata, contact sheets, A/B sheets, and contract reports.
- Produces a handoff that remains M6 S2/prototype and keeps owner selection pending.

- [ ] **Step 1: Add checks.** Include `M6-STUDY-MANIFEST`, `M6-STUDY-SOURCE-HASHES`, `M6-STUDY-SINGLE-VARIABLE`, `M6-STUDY-SEMANTIC-IDS`, `M6-STUDY-PHYSICAL-ENVELOPE`, `M6-STUDY-NO-CHEMISTRY`, `M6-STUDY-RENDER-MATRIX`, `M6-STUDY-BACKEND`, `M6-STUDY-CONTACT-SHEETS`, and `M6-STUDY-AB-COMPARISON`. P1 failures exit non-zero; missing owner review remains deferred.
- [ ] **Step 2: Write review handoff.** For every candidate record changed controls, supporting references, visual approximation, strengths, risks, and owner fields `formSelection`, `glassSelection`, `lightingSelection`, initially `pending-owner-review`.
- [ ] **Step 3: Update M6 evidence.** Link the spec, Bible, commands, QA JSON, contact sheets, and A/B report. Keep M6 S2; do not claim Gold Master, M7-ready, or MCP approval.

### Task 6: Verify, Self-Review, Commit, and Push

- [ ] **Step 1: Run** `pnpm verify:versions`, `pnpm verify:m6-visual-studies`, all existing M6 guards, `pnpm typecheck`, `pnpm test`, `pnpm verify:schema-artifacts`, and `git diff --check`.
- [ ] **Step 2: Perform one clean rebuild** by deleting only the generated study output directory, then rerunning manifest validation, builds, renders, contact sheets, and QA. Never delete canonical vertical-slice artifacts.
- [ ] **Step 3: Inspect the final diff.** Confirm no scientific/world/runtime package changed, no version literal was duplicated, no external image was embedded, no Gold Master claim was added, and the existing baseline .blend was not overwritten.
- [ ] **Step 4: Commit and push** with `git add`, `git diff --cached --check`, `git commit -m "Add controlled M6 beaker visual studies"`, and `git push`.

## Plan self-review

- Spec coverage: reference Bible is Task 1; study contract is Task 2; isolated Blender studies are Task 3; render matrix/A-B is Task 4; QA/evidence boundary is Task 5; reproducibility and regression are Task 6.
- No persistent world, scientific, Observable, or public runtime schema change is planned.
- Every candidate path is isolated under the beaker QA tree and uses the current source .blend.
- The plan does not require image download, MCP, CPU-only rendering, EXR, or batch apparatus production.
- The plan preserves the owner visual-review stop condition and cannot promote a study automatically.
- There are no unresolved implementation placeholders; candidate controls and output locations are explicit.
