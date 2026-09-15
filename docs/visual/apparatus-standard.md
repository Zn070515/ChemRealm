# Apparatus visual standard — v2

- **Status:** **Binding for M6 asset admission; not evidence of visual acceptance.**
  The current rough SVG batch remains rejected visual candidate material. This
  version defines the hybrid source/body/runtime package used by the active M6
  specification.
- **Scope:** an orthographic-camera experiment world with bounded 2.5D depth
  cues, a strict frontal measurement presentation, and explicitly labelled
  non-measurement 2.5D catalog/inspector/construction previews. Governs all
  apparatus entering a release path.
- **Related:** `GOAL.md` §5.7, §15; `CLAUDE.md` §4.7, §10; `AGENTS.md` §14; `ADR-0006`; `ADR-0018`

## Gold Master first wave

The first owner-reviewed visual baseline is intentionally bounded:

- acid 25 mL and alkali 50 mL burettes;
- a 250 mL Griffin beaker;
- a 250 mL Erlenmeyer flask.

The catalogue may carry 100/500/1000 mL beaker and 100/500 mL Erlenmeyer
specifications as planned or reference-only variants. They are not Gold Master
visual evidence until each has its own authored master and review packet.

These families exercise scale reading, meniscus, two different valve
mechanisms, open-rim/spout geometry, shoulder/neck transitions and visibly
different capacities. Graduated cylinders, volumetric flasks, test tubes and
detachable connectors remain required catalog families, but their existence
does not make the first visual baseline accepted. Each Gold Master must pass
full-size and thumbnail review on dark-neutral and light-neutral backgrounds.

## Why this document exists before the art

`GOAL.md` §5.7 makes visual quality a product requirement rather than deferred
polish, and §15 states that "good enough for a prototype" must not silently
become the production art standard.

The trap is that art direction written *after* the assets is a rationalization of
whatever was already drawn. So the standard is written first, and `PLAN-0001` M6
gates asset production against it. Nothing ships in this round, so there is no
placeholder to accidentally promote.

**This document specifies how to build, not what to copy.** The NOBOOK-class
products named in `GOAL.md` §5.7 are a *quality benchmark*, not a source.
ChemRealm may learn broad relationships such as a dominant stage beside a
catalog and contextual inspector, or a dense editor surface beside a clean demo
surface. It may not reproduce exact panel positions, widths, icons, toolbar
order, card treatment, scene composition or interaction choreography. Layout,
assets and visual identity must be original. M6 includes an explicit originality
check in its review checklist.

## Master materialization and admission

The standard is deliberately hybrid. An authored high-resolution transparent
image may carry the visual body when it gives better control of glass, wall
thickness, rim, spout, hardware, highlights and asset-specific proportions.
Structured SVG/path/mask data remains required wherever liquid clipping,
measurement geometry, hit regions or detachable parts need deterministic
runtime addressing.

The complete package must contain, or reproducibly identify:

- an editable layered source or an owner-approved frozen source record;
- a high-resolution visual body and deliberate runtime exports;
- optional structured geometry/masks with stable role names;
- semantic manifest, parts, ports, capabilities and accessibility labels;
- frozen volume-profile identity when the apparatus is volumetric;
- source, licence, export settings and artifact hashes;
- empty/loaded/selected/connected/detached state evidence where applicable.

A standalone bitmap is concept/reference material, not a Gold Master. An SVG
that only embeds a bitmap is not a vector master. The source format never
substitutes for semantic identity, state separation or QA.

## 1. Scene convention

| Property | Rule | Rationale |
|---|---|---|
| Experiment projection | **Orthographic camera with bounded 2.5D depth cues.** No perspective convergence, distance shrink or cinematic foreshortening. | The world can show rim, wall, rear hardware and detachable parts while preserving stable scale relationships. |
| Measurement presentation | **Strict frontal orthographic/side elevation.** | Burette graduations, meniscus, cylinder scale and volumetric-flask mark require an unambiguous reading plane. |
| Camera | Fixed in experiment and measurement presentations. No orbiting in the core view. | Orbit belongs in a separate inspector/construction view and is never measurement evidence. |
| Up axis | Screen up = world up. | Meniscus, liquid surface, and gravity must agree. |
| **Coordinate unit** | **Millimetre (mm) — a LENGTH.** | Geometry coordinates are lengths. See the correction note below. |

The measurement presentation is the only view used for graduations, meniscus
reading, scale comparison or quantitative evidence. The experiment world may
use restrained orthographic 2.5D to establish depth and context, but a numeric
reading must enter the measurement presentation before it is accepted as
evidence. Catalog, inspector and construction-preview surfaces may use bounded
2.5D/axonometric projection to reveal mouths, wall thickness, ports and
detachable parts, but must be labelled as non-measurement views.

The permitted view-mode contract is:

| Mode | Camera/projection | Measurement-qualified | Allowed visual content |
|---|---|---:|---|
| `experiment-world` | fixed orthographic camera, bounded 2.5D depth | no by default | process context and stable apparatus composition |
| `measurement` | fixed frontal orthographic/side elevation | **yes** | scales, menisci, calibration marks and readouts |
| `catalog-preview` | bounded 2.5D allowed | no | family recognition and specification comparison |
| `inspector` / `construction` | bounded 2.5D allowed | no | parts, ports, actuators and construction QA |

### Correction: geometry coordinates are lengths, not volumes

An earlier version of this document said "one world unit = one millilitre of
liquid volume in apparatus geometry". **That was a dimensional error** (owner
review finding P2-1): a geometry coordinate is a length-like quantity, and mL is
a volume. Encoding volume into a length axis produces a scale factor that is
correct only for one vessel cross-section — that is, it works for a straight
cylinder and is silently wrong for everything else, including the conical flask
this slice depends on.

**The corrected contract:**

1. **Geometry uses millimetres.** Every coordinate, stroke width, and offset is a
   length (`ADR-0004` type `Millimetre`).
2. **Volumetric vessels expose an explicit volume profile**, as two monotone
   functions over fill height:

   ```
   V(h) -> Litre        volume contained at fill height h
   h(V) -> Millimetre   fill height for volume V  (inverse of V(h))
   ```

   Both are declared per vessel, sourced from the authoring tool or measured from
   the asset. They are the *only* permitted route from volume to height.

3. **The observable layer calls `h(V)`.** It never multiplies a volume by a
   fudge factor, and it never assumes a cylindrical cross-section
   (`ADR-0006`).
4. **Assets that cannot publish a profile are marked `non_volumetric`** and
   accept an approximate liquid level. A beaker drawn for decoration is allowed;
   a beaker pretending to be volumetric is not.

Why this matters more than it looks: a conical flask drawn to look right is not
the same object as a conical flask whose interior volume is a known function of
height. The first cannot support a liquid-level readout at all. The second can,
and the difference is invisible until someone checks the curve against a real
titration — which is exactly the kind of failure `GOAL.md` §17 says must be
caught, not shipped.

### Apparatus actuator distinction

Actuators are part of apparatus identity and future command mapping. In
particular, an acid burette is not interchangeable with an alkali burette:

| Apparatus | Physical mechanism | Representation actuator | Future intent |
|---|---|---|---|
| acid burette | glass/PTFE rotary stopcock | `rotary-valve` | `rotate-valve` |
| alkali burette | rubber tube, glass bead and pinch region | `pinch-valve` | `pinch-tube` |

Press bulb, grip, open/close, clamp adjustment and meniscus reading receive
the same explicit mapping when present. A static M6 package may declare these
records without persisting pointer gestures or implementing M7 commands.

## 2. Materials

### Glass

| Attribute | Rule |
|---|---|
| Body | Cool neutral, low saturation. Glass is not blue-tinted. |
| Edge / stroke | Darker than body, consistent weight per apparatus size class. |
| Highlight | Two vertical highlights — one strong narrow, one soft wide — at a consistent side. |
| Specular | Present on rims and curves. Not on flat sheet faces. |
| Transparency | Glass occludes its contents partially. Reference liquid colour through the glass, never flat-composited. |

### Liquid

| Attribute | Rule |
|---|---|
| Surface (meniscus) | A concave meniscus is required for water in glass. It is the reading reference point. |
| Meniscus reading convention | Read at the **bottom of the meniscus**. This is a taught convention and the apparatus must support it visually. |
| Body shading | Vertical gradient: slightly darker at depth. Never a flat fill. |
| Colour source | **From `ObservableModel` only.** No hard-coded fills (`ADR-0006`). |
| Turbidity / precipitate | Separate layer above the liquid body, alpha from scientific state. |

Phenomena are overlays, not family-specific vessel drawings. The same beaker or
flask geometry must support empty, loaded, gas, precipitate, bubble, thermal and
optical-observation states through declared state/effect layers. A file such as
`bubbling-beaker.svg` is not an acceptable substitute for a reusable beaker plus
an upstream state overlay.

### Consistency rule

All apparatus in one scene shares one light direction, highlight side and
stroke family, while each declared material profile may have its own restrained
glass tint and response. `AGENTS.md` §14 prohibits inconsistent apparatus
perspective or material style. A burette and a flask that disagree about where
the light comes from read as a collage, not a scene. Family-specific profiles
must remain visually compatible; they are not a license for unrelated recipes.

## 3. Typography and readouts

| Element | Rule |
|---|---|
| Graduations | Numerals at major ticks only. Numerals align to the tick, not to the stroke. |
| Unit labels | Present. A bare number is never a reading. |
| pH readout | **Maximum 2 decimal places**, derived from the ±0.02 pH model tolerance (`ADR-0003`). Showing more is fake precision (`GOAL.md` §5.2). |
| Volume readout | 2 decimal places for a burette (0.01 mL is the instrument's real resolution), matching the graduated scale. |
| Font family | One family, tabular figures for all numeric readouts. Proportional figures make columns of numbers wobble. |
| Contrast | Readouts must meet WCAG AA against their background; meaningful non-text graphics and focus states target at least 3:1. A reading a student cannot read is a missing feature. |

## 4. Colour and contrast

- Visual tokens must be declared rather than embedded ad hoc in components.
- Labelled indicator reference swatches in
  [`indicator-palettes.json`](reference/indicator-palettes.json) and
  [`indicator-reference-swatches.svg`](reference/indicator-reference-swatches.svg)
  are qualitative QA/sanity references only. They may catch a gross visual
  mismatch, but they are not the source of a production tint and cannot
  override an optical refusal.
- A production indicator tint must come from the tagged `OpticalObservation`
  Beer–Lambert/colourimetry pipeline with identity, source conditions, and
  coverage. Strong-acid phenolphthalein orange is documented as a scientific
  boundary and remains refusal-only until a supporting chemical form and
  reviewed optical profile exist.
- The scene must be legible under a light and a dark background setting if both
  are offered. `GOAL.md` §15 names light/dark/background contrast tests.
- Every Gold Master is captured against both a dark neutral and a light neutral
  background. Edge/highlight tokens may adapt by declared size/background token,
  but the apparatus must not gain a black cartoon outline, white halo or changed
  chemical meaning. Thin anti-aliased marks receive visual review in addition to
  a numeric contrast check.
- Standalone apparatus assets remain free of scene-owned contact shadows, bench
  shadows, clamps and selection/debug overlays. A composition may add a shadow
  or support relation only when that scene relation exists; it must not be baked
  into reusable Gold Master geometry.
- Colour must never be the sole channel carrying scientific information.
  Indicator colour is accompanied by a numeric pH readout and a species view,
  which is a genuine accessibility requirement as well as a pedagogical one.

## 5. Named viewports

Visual acceptance is defined at these sizes. A screenshot outside this set is
not evidence.

| Name | Size (CSS px) | Purpose |
|---|---|---|
| `desktop-primary` | 1440 × 900 | Primary review target. Owner visual sign-off happens here. |
| `desktop-compact` | 1280 × 720 | Common classroom projector. |
| `tablet` | 1024 × 768 | Shared-device and classroom-tablet case. |
| `narrow` | 768 × 1024 | Degraded-but-usable boundary. Below this, the core experiment flow is not required to work in v0, but must not render broken. |

### 5.1 Size classes and LOD

Stroke and detail density are chosen from the rendered apparatus bounding height,
not from one desktop artboard. The default silhouette band is approximately
`0.6%–1.2% × H`, with subordinate structural/major/minor/micro ratios of
`0.60–0.75 / 0.45–0.60 / 0.30–0.45 / 0.25–0.35`. Use these class clamps:

| Class | Typical H | Silhouette | Structural | Major | Minor/micro |
|---|---:|---:|---:|---:|---:|
| `thumbnail` | 32–96 px | 0.75–1.25 px | 0.50–0.90 px | 0.45–0.75 px | omit/merge |
| `scene-small` | 96–240 px | 1.00–2.20 px | 0.70–1.40 px | 0.60–1.10 px | 0.45–0.80 px |
| `scene-primary` | 240–720 px | 1.50–3.00 px | 1.00–2.00 px | 0.80–1.40 px | 0.55–0.95 px |
| `inspection-large` | 720–1600 px | 2.00–3.80 px | 1.30–2.40 px | 1.00–1.70 px | 0.70–1.10 px |

`master`, `scene`, `preview` and `thumbnail` are deterministic LOD roles. A
preview may omit fine graduations, micro seams, tiny labels and noncritical
shadows, but must retain silhouette, opening/neck, spout/outlet, actuator and
detachable-part cues. It must reference the same semantic dimensions, parts,
profile and specification identity as the master. It is not a measurement view.
`viewBox`/`preserveAspectRatio` define logical SVG scaling; they do not make an
approximate preview a physical measurement.

## 6. Review checklist (M6 gate)

Every item is pass/fail. Any fail blocks the stage (`GOAL.md` §16 Gate D).

**Originality**
- [ ] No asset traced, copied, or derived from an existing product.
- [ ] Layout and visual identity are original to ChemRealm.
- [ ] Benchmark comparison against the `GOAL.md` §5.7 quality bar is a
      side-by-side screenshot, not a written claim.

**Geometry and correctness**
- [ ] Every volumetric asset publishes `V(h)` **and** `h(V)`, and the two are
      mutually consistent within a stated tolerance.
- [ ] Non-volumetric assets are explicitly marked in metadata.
- [ ] No coordinate, stroke, or offset carries a volume; all are `mm`.
- [ ] Liquid level is obtained by calling `h(V)`, never by scaling a volume.
- [ ] Meniscus concave and read at the bottom.
- [ ] Experiment world uses a fixed orthographic camera with bounded 2.5D depth
      cues and no perspective convergence; quantitative evidence uses the strict
      frontal `measurement` presentation; every other 2.5D view is labelled
      non-measurement.

**Consistency**
- [ ] Single light direction, highlight side and compatible stroke family across
      all apparatus in the scene.
- [ ] Family-specific glass/material profiles are declared and remain within
      the shared visual language; a universal glass tint is not required.
- [ ] Stroke weights follow the size-class rule.
- [ ] Master/scene/preview/thumbnail LODs retain the required identity-defining
      structures and do not alter semantic dimensions or profile identity.

**State linkage**
- [ ] Every coloured element traces to an `ObservableModel` output.
- [ ] Any qualitative chemical colour literals appear only in the declared,
      provenance-bearing, identity-keyed QA palette catalogue; production tint
      comes from `OpticalObservation`, and no render component embeds an ad-hoc
      chemical colour or makes an equilibrium decision.
- [ ] Dependency rule verified: `packages/render` does not import `packages/sci`.

**Evidence**
- [ ] Screenshots captured at all four named viewports.
- [ ] Gold Masters reviewed at full-size and thumbnail scale against both light
      and dark neutral backgrounds.
- [ ] Baseline stored under `tests/visual/baselines/` and reviewed by the owner.
- [ ] Deterministic fixture world used, so screenshots are reproducible.
- [ ] No prototype labels, watermark, or placeholder geometry in any capture.

**Accessibility**
- [ ] Readouts meet WCAG AA contrast.
- [ ] No scientific information carried by colour alone.
- [ ] Tabular figures on all numeric readouts.

## 7. What this document deliberately does not specify

- Specific hex values for glass, liquid, or chrome. Those belong in the token
  file created at M6, and pinning them here without seeing them rendered would
  be guessing.
- Iconography and UI chrome outside the experiment view.
- Molecular / crystal viewer style. That is a separate artifact for a later slice.

Fixing these now would produce a document that looks thorough and constrains
choices that have not yet been informed by anything real.

## 8. Sources and interpretation boundaries

- [NOBOOK official experiment API](https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/) and [custom UI guidance](https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/CustomUI/): broad product-surface references only; no assets or scientific claims are copied.
- [W3C WCAG 2.2 non-text contrast](https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html): meaningful graphics and focus-state contrast reference.
- [MDN SVG `viewBox`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/viewBox), [`preserveAspectRatio`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/preserveAspectRatio) and [`vector-effect`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/vector-effect): logical SVG scaling and the limited use of non-scaling strokes.
- [MDN `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion): future interaction/transition accessibility reference.
- [Unity Level of Detail guidance](https://docs.unity3d.com/es/2020.2/Manual/LevelOfDetail.html): generic LOD rationale only; it is not a ChemRealm physical or chemistry source.
- [PixiJS Assets](https://pixijs.com/7.x/guides/components/assets) and [PixiJS textures](https://pixijs.com/7.x/guides/components/textures): runtime texture, atlas and format-fallback references.
- [Phaser texture concepts](https://docs.phaser.io/phaser/concepts/textures): image, spritesheet, atlas and SVG rasterization boundary reference.
