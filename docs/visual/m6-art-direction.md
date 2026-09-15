# ChemRealm M6 Art Direction：器材资产系统规范

**Status:** M6 S1 visual-system remediation specified. The current first
apparatus slice is a technical baseline, not a visual acceptance.

**Authority:** `GOAL.md`, `SPEC-0001`, ADR-0006, ADR-0013,
`docs/visual/apparatus-standard.md`, the M6 entry gate, and the research in
`docs/research/m6-zhejiang-apparatus-and-visual-target.md`.

This document is the M6 visual production standard. It does not replace the
Scientific Reality, World Runtime, quantity, optical, replay, persistence or
central-version contracts. It does not copy or reproduce NOBOOK/vendor assets.

## 1. Purpose and benchmark boundary

The existing M6 apparatus implementation established a useful Representation
Engine boundary and a typed catalog, but a visual audit found that this is not
yet a coherent, professional apparatus system. M6 must therefore establish a
repeatable visual language and asset-package contract before claiming a mature
virtual-lab visual bar or expanding the catalog indiscriminately.

NOBOOK is a quality and product-organization benchmark only. At comparable
surface/task scope, the M6 owner target is **NOBOOK-level or better** clarity,
recognizability, affordance density and state legibility; that target is judged
from original side-by-side captures, not asserted from catalog count. NOBOOK is
not treated as an industrial CAD or photorealistic rendering bible. Its public
materials support learning from equipment abundance, separated catalog/editor/
player/information surfaces, free combination and immediate feedback. They do
not prove its internal scientific model or grant permission to copy its assets,
layout, screenshots, icons or distinctive expression. ChemRealm learns the
product result while using its own geometry, construction language, scientific
state and event boundaries.

The permitted learning boundary is explicit:

- **Allowed:** study broad product patterns such as a discoverable apparatus
  catalog, a dominant experiment stage, separated inspection information,
  visible affordances, reusable parts, immediate feedback, readable state
  transitions, and the separation between dense editor controls and a clean
  demo/player surface; compare public laboratory-equipment references for
  physical structure; and derive original proportions from cited standards or
  manufacturer anchors.
- **Prohibited:** copying or tracing any NOBOOK/vendor asset, screenshot, icon,
  texture, model, exact panel position, width, card treatment, toolbar order,
  distinctive interaction choreography, recognizable full-scene arrangement or
  pixel-level visual detail; importing, scraping or runtime-fetching their
  assets; or tuning ChemRealm geometry until it becomes a recognizable
  reproduction of a named product.

Learning a broad product pattern is not copying a layout. ChemRealm may use the
general relationship `stage + catalog + contextual inspection`, and may keep
editor/preview surfaces denser than the clean experiment surface. It must not
reuse a recognizable toolbar sequence, panel geometry, icon language, card
system, scene composition or screenshot. A layout review must record both the
pattern borrowed and the original ChemRealm decision that makes the surface
independent.

Every asset source record must state this boundary and record an originality
review. A visual similarity claim is not evidence of provenance.

Zhejiang examination material is a curriculum and scenario pressure test. The
education-equipment standards and manufacturer references anchor structure
where available. Approximate visual records remain labelled approximate and
are never presented as certified measurements.

## 2. Scope and non-goals

### Required M6 families

| Family | Minimum specifications | Defining structure |
|---|---|---|
| Acid burette | 25 mL | long graduated tube, 0 at top, glass/PTFE rotary stopcock, tip, reading direction |
| Alkali burette | 50 mL | long graduated tube, 0 at top, rubber tube/glass-bead pinch valve, tip, reading direction |
| v0/other burette | 100 mL | long graduated tube, 0 at top, explicitly named actuator, tip, reading direction |
| Beaker | 100, 250, 500, 1000 mL | open thick rim, straight wall, spout, base, coarse scale |
| Erlenmeyer flask | 100, 250, 500 mL | conical body, shoulder, neck, mouth, stable base |
| Graduated cylinder | 25, 50, 100, 250 mL | tall narrow body, base, pouring lip, graduations |
| Volumetric flask | 50, 100, 250, 500 mL | bulb, long neck, calibration line, stopper relation |
| Test tube | at least 16×150 and 18×180 mm | open rim, wall, rounded bottom, holder relation |
| Transfer tools | pipette and dropper variants | grip, stem, tip, liquid region, outlet |
| Support/separation tools | funnel, wash bottle, reagent bottle, stand/clamps | support, mouth, closure and capability identity |
| Detachable parts | straight/bent/U tubes, T/Y joints, rubber tube, 1/2/3-hole stoppers | independent parts, ports, compatibility, insertion geometry |

The first runtime scene may stay bounded to the existing titration fixture, but
the catalog must represent the other specifications as real parameterized data,
not as changed labels on one drawing.

### M6 Gold Master gate

M6 does not begin by drawing the entire high-school catalog at low fidelity. The
first owner-reviewed Gold Master set is deliberately small and representative:

| Gold Master family | Required specifications | Why first |
|---|---|---|
| Acid and alkali burette | acid 25 mL; alkali 50 mL | tests scale, meniscus, reading direction and genuinely different actuators |
| Beaker | 100, 250, 1000 mL | tests open rim, spout, wall/base mass and capacity variation |
| Erlenmeyer flask | 100, 250, 500 mL | tests shoulder/neck/base proportions and liquid profile |

Each Gold Master must pass master, scene, preview and thumbnail review on both
background conditions before the catalog expands to graduated cylinders,
volumetric flasks, test tubes and the full connector library. The remaining
families are still required in the catalog contract, but their production is
not evidence that the first three families meet the visual bar.

### Non-goals

- no new chemistry, equilibrium, activity, density or optical model;
- no renderer-side reagent/equilibrium branches;
- no NOBOOK/vendor asset, screenshot, layout or distinctive expression reuse;
- no static image accepted as a substitute for parts, ports, states and QA;
- no event persistence for pointer noise or renderer animation;
- no catalog editor/search/player UI implementation in this remediation; the
  future surface modes are specified only so assets do not acquire a hidden
  second interaction contract;
- no strong-acid phenolphthalein orange implementation; its refusal-only status
  remains owned by the optical contract.

## 3. Visual language

### 3.1 Composition and view modes

The main experiment world uses a fixed **orthographic camera** with bounded,
low-intensity 2.5D depth cues. Parallel verticals remain parallel; there is no
perspective convergence, distance-based shrink, or cinematic foreshortening.
The depth cues may expose a rim ellipse, wall thickness, rear hardware, liquid
interior and detachable ports, but they must not alter the declared millimetre
geometry or make a scale reading ambiguous.

A separate **measurement-qualified frontal presentation** is used whenever a
student must read burette graduations, a cylinder scale, a calibration mark or a
meniscus. This presentation is straight-on/side-elevation, with the measurement
plane facing the camera. It is the only presentation that can supply quantitative
visual evidence. The same world can therefore have a readable orthographic
experiment composition and a stricter frontal measurement presentation without
pretending that all apparatus geometry is a flat icon.

Catalog, inspector and construction-preview surfaces may use bounded 2.5D or
axonometric depth to reveal mouths, wall thickness, ports, detachable parts and
actuators, but must carry the label **non-measurement view**. The future surface
modes are:

| Mode | Projection | Measurement-qualified | Purpose |
|---|---|---:|---|
| `experiment-world` | orthographic camera with bounded 2.5D depth cues | no, unless it explicitly enters measurement presentation | stable world composition and process context |
| `measurement` | frontal orthographic/side elevation | **yes** | graduations, meniscus and calibration evidence |
| `catalog-preview` | bounded 2.5D allowed | **no** | discoverability and specification comparison |
| `inspector` | bounded 2.5D allowed | **no** | parts, ports, actuators and provenance |
| `construction` | bounded 2.5D allowed | **no** | asset QA and detachable-part inspection |
| `demo-player` | orthographic world presentation | only where a measurement subview is explicitly declared | clean read-only demonstration |

Apparatus must read as an instrument before it reads as an icon. The intended
style is clean 2.5D with restrained material values—not photorealism and not
cartoon illustration. The measurement presentation stays visually flatter only
because measurement truth takes priority over depth decoration.

- silhouette and functional proportions come first;
- perspective convergence is forbidden everywhere in the experiment and
  measurement camera; bounded orthographic 2.5D depth is allowed in the world
  and in labelled non-measurement previews;
- measurement evidence must use the `measurement` presentation, never infer a
  reading from an oblique edge or a decorative 2.5D layer;
- highlights are narrow and directional, not candy-like outlines;
- shadows ground objects without inflating them;
- contrast supports material/state legibility, not decoration.

The visual target is a restrained laboratory palette: low-saturation neutral
bench/background, bright neutral glass and hardware value steps, visible rear and
front edges, controlled transparency and narrow highlights. A dark scene is not
an excuse for thick black outlines; a light scene is not an excuse for white
halos. Material value separation, silhouette and functional markings must carry
the recognition burden.

### 3.2 Construction layers

Every master and runtime adapter follows this semantic order:

```text
background / bench
support / rear hardware
glass-back / body silhouette
liquid / gas / solid state region
meniscus / interface
graduation / labels / calibration marks
functional hardware
glass-front / rim / edge
directional highlights / contact shadows
interaction overlay / accessibility outline
```

Stable layer names are required whether the implementation uses SVG groups,
Pixi objects or another approved adapter. Runtime values remain RenderState
values; the renderer does not infer chemistry from a layer.

Apparatus geometry and phenomena are separate layers and separate contracts:

```text
apparatus geometry
  → body / rim / wall / base / hardware / ports
state overlays
  → liquid / meniscus / gas / solid / precipitate / bubbles / thermal cue
explanatory overlays
  → measurement guide / selection / accessibility / teaching annotation
```

The same beaker asset must be reusable for empty, loaded, precipitate or
supported optical states. Do not create `bubbling-beaker.svg`,
`precipitate-beaker.svg` or another chemistry-specific copy of the vessel.
Effects are produced from upstream observation/state and clipped to declared
regions; an unsupported effect remains absent or explicitly refused.

### 3.3 Edges and material

- The outer silhouette is the strongest edge; internal detail is subordinate.
- Rims, necks, bases and walls are structural surfaces, not unclosed strokes.
- Every line terminates at its owning surface; crossings need an explicit
  refraction/overlap reason.
- Glass has body tint, rear edge, front edge, rim/base thickness, directional
  highlight and restrained contact shadow.
- Liquid is clipped to its declared interior region and has a state-provided
  meniscus. Optical refusal uses neutral liquid material, never invented color.
- Metal uses neutral value steps and real hardware edges; rubber/plastic uses
  matte contrast and visible openings/seats.
- Stroke weights, corner radii, light direction and typography are family
  tokens, not per-asset improvisations.

### 3.3a Visual Token Contract

The token file is a measurable contract, not a mood-board. A fixed 1440 px
stroke recipe is invalid: it makes a 150 px thumbnail look like a signboard and
turns fine graduations into black bars. The default rule is relative to the
rendered apparatus bounding-box height `H`, with a size-class clamp:

```text
base stroke ≈ 0.6%–1.2% × H
silhouette  = 1.00 × base stroke
structural  = 0.60–0.75 × silhouette
major mark  = 0.45–0.60 × silhouette
minor mark  = 0.30–0.45 × silhouette
micro       = 0.25–0.35 × silhouette
```

The following are recommended pixel clamps, not permission to hand-tune each
asset. The selected class, rendered `H`, scale factor and final token values
must be recorded in QA so a screenshot can be reproduced.

| Size class | Typical rendered H | Silhouette | Structural | Major mark | Minor/micro |
|---|---:|---:|---:|---:|---:|
| `thumbnail` | 32–96 px | 0.75–1.25 px | 0.50–0.90 px | 0.45–0.75 px | omit or merge |
| `scene-small` | 96–240 px | 1.00–2.20 px | 0.70–1.40 px | 0.60–1.10 px | 0.45–0.80 px |
| `scene-primary` | 240–720 px | 1.50–3.00 px | 1.00–2.00 px | 0.80–1.40 px | 0.55–0.95 px |
| `inspection-large` | 720–1600 px | 2.00–3.80 px | 1.30–2.40 px | 1.00–1.70 px | 0.70–1.10 px |

Shared non-stroke tokens remain bounded across size classes:

| Token | Allowed band | Review meaning |
|---|---|---|
| glass body alpha | 0.10–0.24 | transparent body without candy fill |
| glass edge alpha | 0.45–0.82 | front/rear boundary remains legible |
| narrow highlight alpha | 0.45–0.78 | directional glass highlight; width follows size class |
| soft highlight alpha | 0.14–0.32 | restrained broad reflection |
| contact shadow alpha | 0.08–0.20 | grounding, not a black halo |
| metal lightness span | CIELAB L* span 20–42 | neutral value modelling |
| rubber/plastic lightness span | CIELAB L* span 12–30 | matte separation from glass/metal |
| numeric typography | minimum 12 CSS px / 10 canvas px when shown as a reading | readable at named viewports |

`vector-effect="non-scaling-stroke"` may be used only for a line whose device
legibility must remain stable under a declared UI transform; it is not a global
substitute for size-class tokens. The SVG `viewBox` is the logical artboard,
not a license to mix pixel coordinates with millimetres.

### 3.3b LOD and thumbnail contract

`construction.svg` and `preview.svg` are not the same file rendered at two
arbitrary scales. An asset package declares deterministic level-of-detail (LOD)
variants that preserve semantic identity while changing only what is visible:

| LOD | Must retain | May simplify/omit | Measurement use |
|---|---|---|---|
| `master` / `construction` | every structural surface, part, port, actuator, layer and QA marker | nothing except hidden QA guides | no |
| `scene` | silhouette, rim/neck/base, spout/outlet, actuator, major liquid region, major graduations | micro seams, hidden construction guides, minor marks when unreadable | yes only through measurement presentation |
| `preview` | recognizable silhouette, functional opening/neck, spout/outlet, actuator, detachable-part cues | fine graduations, tiny labels, noncritical shadows | **no** |
| `thumbnail` | family silhouette plus the one or two identity-defining features (for example neck, spout, side arm or stopper) | minor graduations, labels, micro seams and subtle shadows | **no** |

LOD is selected by rendered size class and view mode, never by a chemistry-name
branch. A preview may be authored separately, but its manifest must reference
the same family/specification identity, semantic dimensions and profile identity
as the master. It may hide detail; it may not change capacity, `V(h)`, `h(V)`,
part ownership or actuator kind. QA must include full-size and thumbnail
captures because an asset that only works at hundreds of pixels is not a usable
catalog asset.

### 3.3c Background and contrast contract

Every Gold Master is reviewed against both a dark neutral and a light neutral
background. The background is a test condition, not a shortcut to bake a dark
outline or a white halo into the apparatus. On a light background the rear/front
glass edges must remain distinct without black cartoon contours; on a dark
background highlights and neutral liquid/refusal states must remain visible
without neon glow. Meaningful non-text graphics and focus indicators target at
least 3:1 contrast against adjacent colours; ordinary text follows its WCAG AA
target. Thin anti-aliased strokes require visual review rather than relying on a
single sampled pixel.

The QA record must name the background token, size class, viewport, contrast
measurement method and any approved token adjustment. The apparatus must not
change scientific state or indicator meaning merely because the background
changed.

### 3.3d Forbidden visual patterns

The following are automatic rejection triggers in asset QA or owner review:

- rough black outlines used uniformly around glass, liquid and hardware;
- candy-like glass with saturated blue fill, opaque neon body or uncontrolled
  bloom/glow;
- airbrush gradients that erase structural edges or make liquid appear to bleed
  through walls;
- over-rounded or toy-like proportions that obscure the instrument's functional
  identity;
- arbitrary per-asset stroke weights, highlight directions, corner radii or
  typography that break the family token hierarchy;
- liquid, meniscus, precipitate or indicator colour leaking outside its declared
  interior region;
- a baked graduation, reading, pH, reagent label or chemical state that can
  disagree with Observable/RenderState;
- perspective convergence in an experiment/measurement view;
- a decorative connector, valve or clamp that has no semantic part/port record;
- a screenshot, product mark, watermark, recognizable UI arrangement or traced
  silhouette derived from NOBOOK or a vendor source.
- a single master being stretched into every LOD without a declared visibility
  policy, or a thumbnail that loses its family-defining opening, spout, neck,
  side arm, stopper or actuator;
- a dark-background-only edge treatment, white halo or background-dependent
  chemical colour that fails on the alternate neutral background.

### 3.4 Markings and readouts

Graduations are functional data: unit, zero/reference position, direction,
major/minor rhythm and contrast must be declared. Labels and numeric readouts
come from specification/Observable data, never from conflicting baked values.
A burette scale increases downward and its readout is mL at the declared
precision; contained and delivered volumes remain separate.

For a burette, a visual reading is a scale reading, not the amount remaining in
the tube. The asset must preserve the top-zero/downward-increasing convention,
the bottom-meniscus reading point and a two-decimal-millilitre display policy;
the delivered volume is derived from the difference between readings upstream.

## 4. Family geometry rules

### Burette

The scale increases downward from zero at the top. Tube, valve, outlet, tip and
support clamp are separate semantic parts. Acid and alkali burettes are not one
generic silhouette with different labels:

| Type | M6 identity | Actuator/mechanism | Required visible structure |
|---|---|---|---|
| Acid burette | `burette-acid-25ml-class-as` | `rotary-valve` — glass/PTFE stopcock with handle, seat and outlet | stopcock body, rotary handle, tip, graduated tube and clamp relation |
| Alkali burette | `burette-alkali-50ml-class-b` | `pinch-valve` — rubber tube, glass bead and pinch region | rubber tube, bead, pinch region, outlet and support relation |
| v0/other declared type | `burette-v0-100ml` | must name its actual actuator; no implied stopcock | scale, tube, outlet and explicitly documented mechanism |

25/50/100 mL variants must differ in scale length, graduation density, aspect
ratio, marking/support layout or accessory compatibility. Liquid and meniscus
are clipped inside the tube; graduations cannot be overwritten by the fill.
The actuator difference is part of identity and future command intent, not a
decorative detail.

### Beaker

The body has an open thick rim, stable base and physically legible pouring
spout. The spout is a first-class part and fluid-outlet port, not decoration.
Capacity variants change height/width ratio, rim/base mass, spout scale and
graduation rhythm; uniform scaling with a changed label is insufficient.

### Erlenmeyer flask

The broad base, tapered body, shoulder, cylindrical neck, mouth/rim and stopper
relationship are explicit. The neck is integral unless a specification says
otherwise. 100/250/500 mL variants change body/shoulder/neck proportions and
marking scale while retaining the family silhouette.

### Graduated cylinder

The cylinder reads as tall and narrow relative to a beaker and has a stable
base, pouring lip, vertical scale and profile-driven liquid region. 25 mL must
not be a miniature 100 mL silhouette with unchanged proportions and label density.

### Volumetric flask

Bulb, long narrow neck, single calibration line and stopper/mouth relationship
are mandatory. The calibration line is not rendered as a graduated-cylinder
scale. Capacity variants change bulb/neck proportions according to catalog data.

### Test tubes, transfer tools and connectors

Open rims, wall thickness, rounded bottoms, holder contact, pipette/dropper
grips, tips and outlets are explicit. Straight/bent/U tubes, T/Y connectors,
rubber tubing and one/two/three-hole stoppers are independent assets with
detachable status, ports, capabilities and nominal/approximate dimensions.

## 5. Specification variation contract

```text
family identity
  → specification identity
  → semantic dimensions/capacity
  → geometry parameters
  → graduation/profile
  → visual master/runtime state
```

Each same-family specification must differ in at least three normalized,
observable dimensions selected from aspect ratio, wall/base/rim thickness,
neck/shoulder/bulb/spout proportion, graduation density, calibration placement,
accessory size and profile range. Catalog tests compare geometry signatures;
IDs, names and capacity labels alone never count. Every changed dimension must
be one of:

- `reported` or `manufacturer-anchor`, with a source record and conditions;
- `standard-family`, where the source establishes the family but not a precise
  dimension; or
- `approximate-visual`, with the rationale, review scope and non-measurement
  limitation recorded.

An approximate visual parameter must never be presented as a certified physical
measurement or silently used to alter Scientific Reality.

### 5.1 Comparison evidence

M6 requires two separate comparison sheets for each represented family:

1. **Physical-scale sheet:** variants placed at their declared millimetre scale
   and labelled with capacity, height/width, graduation and source class. This
   proves physical-size differences and prevents a normalized drawing from
   masquerading as a dimensional reference.
2. **Normalized-shape sheet:** variants fitted to a common artboard and compared
   by normalized geometry signature. This proves that capacity/specification
   differences remain visibly structural rather than being a label-only change.

Each sheet records the changed parameters, their provenance class, source or
rationale, and whether the comparison is measurement-valid or visual-only.

## 6. Visual state and interaction separation

An asset package contains:

```text
visual geometry
semantic parts
fluid/liquid regions
grabbable regions
snap/insertion regions
ports and anchors
collision/support geometry
accessibility label and keyboard target
state variants
source/license/QA evidence
```

Visual and interaction geometry may differ for pointer/touch usability, but each
hit region identifies its owning part and stays inside logical bounds. M6 may
implement only a static subset of empty, loaded, selected, focused, connected,
disconnected, readout and refusal states; unsupported states must be explicitly
marked unsupported rather than invented.

An apparatus also declares its future actuation contract:

```ts
interface ApparatusActuator {
  readonly id: string;
  readonly partId: string;
  readonly kind: "rotary-valve" | "pinch-valve" | "press-bulb" | "grip" | "open-close" | "adjust-clamp" | "read-meniscus";
  readonly intent:
    | "rotate-valve"
    | "pinch-tube"
    | "press-bulb"
    | "grip"
    | "open"
    | "close"
    | "adjust-clamp"
    | "read-meniscus";
  readonly stateVariants: readonly string[];
}
```

The acid-burette rotary stopcock maps to `rotate-valve`; the alkali-burette
rubber-tube/bead mechanism maps to `pinch-valve`. Press-bulb, grip, open/close,
clamp-adjustment and meniscus-reading actuators are declared only where the
asset actually exposes those controls. M6 may expose metadata without
persisting pointer gestures or creating M7 domain events.

## 7. Asset package and architecture

The production unit is an asset package, not a single SVG:

```text
asset-id/
├─ master/       construction.svg, preview.svg
├─ states/
├─ manifest.json
├─ source-record.md
├─ license.md
├─ qa/           geometry, interaction, screenshots
└─ fixture/
```

The manifest points to the sole central catalog version, separates logical
artboard coordinates from semantic millimetre dimensions, and declares family,
specification, parts, ports, anchors, hit regions, capabilities, state
coverage, profile identity, accessibility text and provenance claim scope.

The owning core is Representation Engine. The path remains:

```text
WorldState + ScientificFrame
  → ObservableModel
  → RenderState
  → validated asset/interaction package
  → DOM + Pixi presentation
```

Pixi may map state and declared geometry to pixels, but may not choose
equilibrium direction, create a chemical effect, look up chemistry by label or
fetch a mutable asset. M6 introduces no WorldState/Event/schema change.

## 8. Acceptance gates

M6 visual acceptance is blocked unless every applicable P0 row passes:

| Gate | Binary requirement |
|---|---|
| V-P0-1 | no silhouette overlap, uncontrolled stroke crossing, liquid bleed or clipping at required viewports |
| V-P0-2 | beaker, flask, cylinder, burette and volumetric flask show defining structures correctly |
| V-P0-3 | same-family capacity variants have human-visible structural differences |
| V-P0-4 | empty/loaded/refusal/optical states have documented semantics; unsupported color is never invented |
| V-P0-5 | every interactive part has a distinct hit region, anchor and capability |
| V-P0-6 | no obvious cartoon proportions, candy shading or mixed visual language |
| V-P0-7 | all core families share material, stroke, lighting and typography rules |
| V-P0-8 | experiment world uses bounded orthographic 2.5D cues; quantitative evidence uses strict frontal measurement presentation; all other 2.5D views are labelled non-measurement |
| V-P0-9 | size-class visual token ranges and forbidden-pattern checks pass for every master, LOD and state |
| V-P0-10 | every visible geometry difference has provenance or an explicit approximate-visual rationale |
| V-P0-11 | acid/alkali burette actuators and future command intents are distinct and traceable |
| V-P0-12 | Gold Master families pass full-size and thumbnail review on dark and light neutral backgrounds |

P1 gates additionally require readable materials and graduations, clear focus/
selected states, causal state transitions, accessibility targets, deterministic
LOD selection and deterministic screenshots at `desktop-primary`,
`desktop-compact`, `tablet` and `narrow`.

## 9. Test and evidence contract

Required evidence for M6 S3 review:

- family/spec catalog tests, normalized geometry signatures, ports, anchors,
  hit regions, capabilities and compatibility;
- acid/alkali burette actuator mapping and future command-intent tests;
- package tests for layers, bounds, no external references, provenance,
  license and central version source;
- visual-token range checks and forbidden-pattern scans;
- size-class/LOD tests proving thumbnails retain identity-defining structure and
  preview files do not silently change semantic dimensions or profile identity;
- profile round-trip, liquid clipping and graduation-direction tests;
- physical-scale and normalized-shape comparison sheets, with every changed
  geometry parameter linked to a source or approximation rationale;
- RenderState-only and chemistry-blind renderer checks;
- deterministic fixtures for empty, loaded, refusal and supported observations;
- interaction-region traceability tests without World events;
- four viewport captures reviewed at full and thumbnail scale;
- Gold Master captures on dark and light neutral backgrounds, with measured
  non-text contrast and a recorded visual-review decision;
- accessibility labels, focus targets, contrast and non-canvas readouts;
- two self-audits: contract/regression first, visual/source fidelity second.

Automated tests support specific claims; they do not replace owner visual review.

## 10. Versioning, rollout and current decision

The active catalog version is distributed only from
`contracts/version-manifest.json` through generated versions. Changes to
serializable profile identity, dimensions, parts, ports or capabilities require
catalog/package review. Changes that alter persisted world meaning use the
existing profile/content-hash migration process. Visual polish must not silently
reinterpret historical geometry.

The existing first slice is retained as a technical baseline for RenderState,
profile identity, Pixi isolation and catalog shape. It does not yet prove the
full family construction standard, visibly distinct variants, complete
state/interaction packages, professional visual quality or owner acceptance.

Current status is therefore **M6 S2 implementation baseline / visual gate
NO-GO**, and M7 must not be authorized from this document alone.

## 11. Sources

- [NOBOOK official integration/API](https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/)
- [NOBOOK official custom UI](https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/CustomUI/)
- [NOBOOK chemistry interface/function overview](https://nobook-doc-cdn.nobook.com/chem/NB%E5%8C%96%E5%AD%A6%E5%AE%9E%E9%AA%8C界面及相应功能特性说明.html)
- [Zhejiang Education Examination Authority, 2026 January analysis](https://www.zjzs.net/art/2026/1/9/art_31_11862.html)
- [JY/T 0655-2025](https://www.moe.gov.cn/srcsite/A06/s3732/202507/W020250701322477393561.pdf)
- [DWK 25 mL Class AS burette](https://www.dwk.com/duran-burette-class-as-with-schellbach-stripe-and-ptfe-key-25-ml-243303304)
- [DWK 250 mL Erlenmeyer flask](https://www.dwk.com/duran-erlenmeyer-flask-with-din-thread-without-cap-250-ml-218033604)
- [DWK 100 mL graduated cylinder](https://www.dwk.com/na/duran-measuring-cylinder-with-hexagonal-base-class-a-100-ml-213902402)
- [Corning laboratory glassware selection guide](https://www.corning.com/catalog/cls/documents/selection-guides/CLS-GL-001.pdf)
- [酸式/碱式滴定管结构与使用说明（教学实验参考）](https://www.muhn.edu.cn/ecmd/info/1481/14785.htm)
- [W3C WCAG 2.2 non-text contrast](https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html)。用于有意义图形、控件状态和细线可读性的对比度验收；不是器材颜色来源。
- [MDN SVG `viewBox`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/viewBox) 与 [`preserveAspectRatio`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/preserveAspectRatio)。用于逻辑画布与统一缩放边界；不替代 mm 几何或 LOD 规则。
- [MDN SVG `vector-effect`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/vector-effect)。用于说明 `non-scaling-stroke` 的局部适用性，不把它当成全局线宽策略。
- [MDN `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion)。用于后续状态动效的可访问性约束；M6 静态 Gold Master 不以动画证明质量。
- [Unity Level of Detail guidance](https://docs.unity3d.com/es/2020.2/Manual/LevelOfDetail.html)。用于 LOD 作为距离/尺寸相关表现优化的通用参考，不作为 ChemRealm 资产或科学事实来源。
