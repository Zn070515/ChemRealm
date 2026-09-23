# 250 mL Beaker Target-Layered Compositor

## Context

The current M6 Pixi liquid material is a GPU-accelerated prototype, but its
output remains visibly below the approved `100ml-blue.png` target. The current
path shades a white mask with UV-derived colour and draws it over an authored
body whose interior is largely opaque. This makes the liquid read as a cyan
panel instead of a transparent medium integrated with glass.

The platform audit in
`docs/research/beaker-target-reproduction-platform-audit.md` established that
the next step should not be another parameter pass over the current filter. It
should introduce a bounded layered compositor calibrated offline with Blender
GPU and consumed at runtime by the existing Pixi/WebGL adapter.

## Goal

For the existing 250 mL Griffin beaker and the existing visual-stress-only
`100 mL blue` fixture:

1. Preserve the existing `World → ScientificFrame → Observable → RenderState`
   identity and refusal boundaries.
2. Replace the flat liquid-mask appearance with a layered visual material that
   retains authored glass response, has a non-flat liquid medium, and has a
   separate free-surface response.
3. Keep all physical/scientific inputs outside the renderer shader.
4. Produce reproducible light/dark/full/thumbnail evidence without claiming
   M6 S3 or production optical equivalence.

## Non-goals

- no Scientific Reality, World Runtime, `VolumeProfileSnapshot` or optical
  model changes;
- no Three.js, Unity, WebGPU or new production renderer dependency;
- no tilt, pouring, turbulence, bubbles, precipitate or other phenomena;
- no other apparatus family or beaker capacity;
- no target PNG, NOBOOK screenshot or vendor asset in runtime output;
- no hard-coded production blue or indicator palette in `packages/render`;
- no claim that empirical visual materialization is Beer–Lambert or a new
  optical calculation;
- no global body-alpha reduction.

## Architecture

Blender 5.2.2/Cycles GPU is the offline authoring and calibration backend.
PixiJS 8/WebGL remains the production renderer. The runtime path is:

```text
validated actor / Observable optical observation
        ↓
renderer-neutral layered material input
        ↓
authored back-glass/body derivative
        ↓
GPU liquid mesh/material inside manifest-owned cavity
        ↓
GPU surface pass
        ↓
authored front-glass/rim/base detail derivative
        ↓
graduations and interaction layers
```

The target is a review reference. Blender outputs are authored/calibration
evidence and must carry source/configuration hashes. Runtime maps are derived
assets with an explicit visual-approximation classification.

## Scientific design

The renderer receives only:

- the already-bound liquid height/level from `ObservableModel`;
- the already-admitted `tintSrgb`, strength and optical status;
- the verified visual calibration identity;
- the bound frame identity.

The shader must not calculate volume, `h(V)`, pH, species, equilibrium,
Beer–Lambert, indicator transitions or optical admission. Render-space
thickness, edge response and scene-colour sampling are presentation inputs,
not scientific truth.

Unavailable or out-of-coverage optical observations use the existing neutral /
refusal path and never receive the target blue.

## Asset and runtime contract

The asset package adds only declared visual roles. The first accepted derivative
set may use a minimal two-part decomposition:

```text
body-back.png             static authored rear/interior response
glass-front-detail.png    static authored rim/spout/base/edge response
liquid-response.png       visual calibration map, non-scientific
surface-response.png      visual calibration map, non-scientific
```

If the offline pass does not produce stable maps, the implementation may keep
the body source and use verified vector masks, but the runtime must still have
an explicit back/liquid/front ordering. A single opaque body plus a tinted
rectangle is not an admitted implementation.

The existing manifest remains the semantic owner of asset identity,
coordinates, and calibration status. Runtime code may not redeclare cavity
coordinates, profile values, or capacity.

## Representation design

The liquid body must be a mesh or equivalent bounded GPU primitive generated
from the manifest-owned cavity outline and fill height. It must contain:

- a soft depth-dependent transmission response;
- side-wall contact response without a UI stroke;
- bottom/glass-thickness response;
- a surface pass with front/rear edge variation;
- optional bounded scene-colour/refraction offset from a Pixi render texture;
- no fixed blue gradient as a production palette.

The authored front detail remains at full opacity. The renderer must not lower
the complete body sprite alpha to reveal liquid.

## QA and acceptance

The vertical slice is accepted only as an M6 implementation spike when all are
true:

1. The same actor path renders the fixture; no test-only liquid renderer exists.
2. 100 mL body/surface composition remains inside the verified cavity.
3. Empty body pixels outside the liquid region are unchanged by the loaded
   composition; no global alpha workaround exists.
4. Full-size light/dark captures show non-flat medium, free-surface depth,
   glass-front response and preserved rim/base quality.
5. Thumbnail captures do not read as a rectangular or trapezoidal card.
6. Unavailable/out-of-coverage state remains neutral/refusal.
7. Source, calibration, shader-input and output identities are recorded.
8. The target remains reference-only and the evidence remains prototype/S2
   until owner visual review.

The following are explicitly insufficient as visual evidence:

- absence of an SVG `<rect>`;
- a passing shader compile;
- identical PNG hashes across different GPU backends;
- unit tests that only inspect path syntax;
- a synthetic fixture being reported as scientific colour evidence.

## Failure modes

- If the body/front derivative cannot be aligned, stop and keep the current
  material explicitly rejected rather than use alpha hacks.
- If scene-colour sampling is unstable across browsers, use the calibrated
  derivative maps and report the limitation; do not silently switch to a fake
  palette.
- If a future change needs a new optical quantity, stop at the Observable
  boundary and update the scientific/optical contract first.

## Rollout

This is a renderer/asset-package change only. No persisted schema migration is
needed. The current candidate remains available as a rejected baseline. The
new derivative artifacts are admitted only after package hash, light/dark,
thumbnail and visual review evidence are present.

## Open questions

The implementation spike must answer one bounded question: can the existing
authored body be decomposed into stable back/front derivatives without visibly
changing the empty beaker? If not, the owner must choose between a new original
layered master render and keeping the current body as visual-only reference.
