# M6 Final-quality apparatus implementation plan

> This plan executes the authorized M6 slice in small verifiable steps. It
> targets M6 S2 implementation and evidence preparation; it does not grant M6
> S3. The plan uses the repository NOBOOK research and the companion web
> evidence brief as design input, while keeping `SPEC-0001` authoritative.

## Step 1 — Central version and asset package

**Objective:** establish one original, inspectable apparatus asset package with
no manually duplicated active version.

**Files/packages:** `contracts/version-manifest.json`, generated schema
versions, `packages/render/src/assets/`, `assets/apparatus/`.

**Interfaces touched:** representation version manifest; new typed apparatus
manifest; no world/scientific schema.

**Implementation detail:** add the apparatus asset version to the central
manifest and regenerate. Author the titration-bench vector master and manifest
with mm dimensions, parts, ports, regions, capabilities, profile identity and
accessibility metadata. Keep text, graduations, liquid level and chemical tint
out of the baked master.

**Tests/evidence:** manifest schema/unit tests; source/license/package review;
version distribution guard; no external URL in runtime assets.

**Stop/go:** GO only when the manifest is parseable, identity is centralised,
and the asset can be reviewed without opening the web app.

## Step 2 — RenderState apparatus realization

**Objective:** represent the final apparatus in the renderer-neutral state
without allowing the renderer to inspect chemistry.

**Files/packages:** `packages/render/src/state/`, render tests, `packages/render/src/index.ts`.

**Interfaces touched:** `RenderState` gains a M6-specific constructor/helper;
existing generic `toRenderState` semantics remain compatible.

**Implementation detail:** create `toTitrationRenderState(...)` from the same
`ObservableModel` and asset manifest. Emit static apparatus nodes, dynamic
liquid-level/readout nodes, optical status/tint data and semantic part/port
metadata. Do not add pH/Ka logic or duplicate volume conversion.

**Tests/evidence:** deterministic state fixture; profile-derived height;
optical refusal has no tint; exactly one pH policy node; deep-freeze and
same-input equality tests.

**Stop/go:** GO only when a RenderState contains everything the visual adapter
needs and no raw Sci/World object is required.

## Step 3 — Pixi renderer adapter

**Objective:** draw the original asset family from `RenderState` only.

**Files/packages:** `packages/render/src/pixi/`, package exports/dependencies,
Pixi tests.

**Interfaces touched:** new `@chemrealm/render/pixi` subpath; no scientific or
world import.

**Implementation detail:** use PixiJS v8 async `Application.init()`, a fixed
logical mm-inspired scene coordinate system, responsive fit, one family-wide
light/material token set, vector glass/liquid/meniscus/stand/burette/flask/beaker
layers, and explicit update/destroy lifecycle. The adapter draws only values
already present in render nodes. It must not run on a world clock or mutate
WorldState.

**Tests/evidence:** package typecheck/build, dependency-cruiser, browser mount,
destroy/re-mount, no third-party requests, no prohibited core imports.

**Stop/go:** GO only when the built page can mount the adapter and failure is
visible without replacing the scientific inspection output.

## Step 4 — Web composition and surface separation

**Objective:** add the world-dominant apparatus surface to the existing
committed composition while preserving the read-only inspection surface.

**Files/packages:** `apps/web/src/App.tsx`, `main.tsx`, local CSS, web tests.

**Interfaces touched:** web-only composition; `RenderState` consumer.

**Implementation detail:** mount Pixi from the composed `RenderState`; expose a
DOM-readable companion with world/frame/readout identity; keep catalog/setup
surfaces out of this M6 slice. Keep all asset code self-hosted and use one pH
policy per view.

**Tests/evidence:** built-browser assertions for canvas, frame hash, pH policy,
optical refusal/result, DOM readouts, and no network changes.

**Stop/go:** GO only when a single committed frame reaches both canvas and DOM
without a second data source.

## Step 5 — Named viewports and performance evidence

**Objective:** produce reproducible visual evidence and catch responsive or
performance regressions before owner review.

**Files/packages:** `tests/browser/m6-visual.spec.ts`,
`tests/visual/captures/m6/`, `docs/visual/review-m6.md`, evidence packet.

**Interfaces touched:** browser evidence only.

**Implementation detail:** capture the four named viewports from the same
deterministic fixture; check canvas fitting, DOM readout visibility, target
geometry metadata and no prototype labels. Record a 30-second static/scripted
performance sample without turning animation time into world truth.

**Tests/evidence:** Playwright, candidate screenshots, visual checklist and
performance artifact. Candidate captures are evidence inputs, not approved
baselines; owner visual review remains pending until the owner reviews them.

**Stop/go:** STOP if any viewport hides essential state, assets look like
prototype art, chemistry is inferred by renderer code, or visual quality is not
at the written standard. Do not polish around a failed geometry/identity test.

## Acceptance matrix

| Criterion | Required proof | Current target |
|---|---|---|
| M6-ASSET | manifest/master/source/license and unit tests | S2 implementation |
| M6-GEOMETRY | profile-derived level + original coherent family | S2 + owner review |
| M6-RENDER | Pixi built adapter consumes RenderState only | S2 |
| M6-STATE | one frame reaches canvas and DOM | S2/browser |
| M6-RESPONSIVE | four named viewport captures | S2 evidence; owner review later |
| M6-PRIVACY | artifact/network checks | S3 prerequisite |
| M6-PERF | scripted performance sample | S3 prerequisite |
| M6-S3 | all visual standard checklist rows owner accepted | not claimed |

## Reproduction commands

```text
pnpm install
pnpm generate:versions
pnpm typecheck
pnpm typecheck:tests
pnpm test
pnpm build
pnpm depcruise
pnpm guards
pnpm test:browser
```

## Handoff boundary

Until Step 5 and owner visual review are complete, the repository must say
`M6 authorized / in progress` or `M6 S2`; it must not claim final-quality visual
acceptance or authorize M7 solely because the Pixi canvas renders.
