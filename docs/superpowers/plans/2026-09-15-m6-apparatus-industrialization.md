# M6 器材资产工业化实施计划

> Historical plan only; it is not an active implementation authority. Current
> M6 work follows the hybrid apparatus asset-pipeline plan.

> This is the original technical-slice plan. It is retained as historical
> context only and is not an active implementation authority. Current M6 work
> follows [`docs/visual/m6-art-direction.md`](../../visual/m6-art-direction.md)
> and the current M6 specifications; a green technical slice does not close
> the M6 visual gate.

## Step 1 — 研究与版本入口

- **Objective:** 固定浙江/标准/NOBOOK 研究边界，新增唯一中央 catalog 版本。
- **Files/packages:** `docs/research/`, M6 spec, this plan,
  `contracts/version-manifest.json`, generated versions.
- **Interfaces:** representation version only; no World/Event/Scientific shape.
- **Implementation:** add `representation.apparatusCatalog`; regenerate, never
  write a live version literal in render code.
- **Tests/evidence:** version guard, docs/source review.
- **Stop/go:** GO only if `verify:versions` sees one active source.

## Step 2 — Catalog contract (TDD)

- **Objective:** make multiple specifications and detachable apparatus parts
  machine-readable before rendering them.
- **Files/packages:** `packages/render/src/assets/apparatus-catalog.ts`, tests,
  `assets/apparatus/catalog/manifest.json`.
- **Interfaces:** Representation Engine only.
- **Implementation:** define deep-frozen specs, provenance classes, ports,
  detachable parts and validation; add ≥18 vessel specs and connection parts,
  including explicit beaker pouring outlets.
- **Tests/evidence:** write the multiplicity/compatibility/freeze tests first,
  run the expected failure, then implement and rerun green.
- **Stop/go:** GO only if malformed duplicate/unresolved/incompatible catalog
  entries fail loud and valid specs all validate.

## Step 3 — Original master and package QA

- **Objective:** replace the low-detail SVG with a reviewable multi-layer original
  master plus catalog reference sheet.
- **Files/packages:** `assets/apparatus/titration-bench/master.svg`,
  `assets/apparatus/catalog/*`, source/license/QA records, asset tests.
- **Interfaces:** asset package metadata; no runtime chemistry.
- **Implementation:** draw detailed glassware, hardware, scale, stopcock, ports,
  detachable parts and size variants; keep runtime values out of baked art. The
  semantic package remains millimetre-based while the review master declares its
  logical artboard separately.
- **Tests/evidence:** no external references, required layers/tokens, source record
  says original, no prototype labels, and master-artboard bounds agree with the
  semantic asset bounds.
- **Stop/go:** GO only when a human can identify the main apparatus and variants
  from the master without reading implementation code.

## Step 4 — Runtime renderer realization

- **Objective:** bring the same visual vocabulary into Pixi without violating
  RenderState-only ownership.
- **Files/packages:** `packages/render/src/pixi/renderer.ts`, tokens/tests,
  `packages/render/src/state/titration.ts`.
- **Interfaces:** RenderState additive metadata only.
- **Implementation:** layered shadow/glass/highlight/liquid/meniscus/scale/metal
  drawing, logical mm-inspired sizing, dynamic state from existing nodes; no
  ScientificState/World imports and no chemistry branches.
- **Tests/evidence:** renderer boundary, visual layer fixture, optical refusal and
  numeric/readout regression tests.
- **Stop/go:** STOP on any chemistry inference, duplicate physical source, or
  render-only hard-coded state.

## Step 5 — Two-round audit and evidence

- **Objective:** verify cross-document/code consistency and candidate visual output.
- **Files/packages:** `docs/evidence/M6.md`, `docs/visual/review-m6.md`, browser
  tests/captures, M6 contract guard.
- **Interfaces:** evidence only.
- **Implementation:** update status to S2 only where locally proven, list all
  unrun owner visual gates, inspect four named viewports twice, and compare the
  asset against the written standard and Zhejiang coverage matrix.
- **Tests/evidence:** typecheck, test typecheck, full test, build, depcruise,
  guards, versions, M4/M5/world/optical checks, browser, lint, captures,
  artifact/network scan.
- **Stop/go:** no S3 claim; any regression in version centralization, replay,
  profile hash, optical refusal, quantity boundary or world/science ownership
  blocks the round.

## Acceptance matrix

| Criterion | Required proof | Round target |
|---|---|---|
| M6-CATALOG | typed catalog + checked-in manifest | S2 |
| M6-DETACH | port/detachable compatibility tests | S2 |
| M6-PROVENANCE | source-class/source-record audit | S2 evidence |
| M6-MASTER | detailed original master and QA | S2 + owner review |
| M6-RENDER | Pixi RenderState-only boundary | S2 |
| M6-STATE | dynamic state still comes from observable | S2/browser |
| M6-VIEWPORT | four captures and DOM assertions | S2 evidence |
| M6-S3 | owner visual/originality/accessibility acceptance | not claimed |

## Reproduction commands

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
pnpm verify:m6-entry
pnpm verify:m6-renderer
pnpm verify:world
pnpm test:browser
pnpm lint
```
