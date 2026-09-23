# Beaker Liquid Material Reconstruction Research

- **Status:** S2 implementation spike complete; target-level visual acceptance not demonstrated
- **Scope:** `beaker-250ml-griffin` liquid materialization only
- **Owner:** Representation Engine
- **Does not advance:** M6 S3, Gold Master admission, or any Scientific Reality contract

## Context

The approved visual target
`assets/apparatus/masters/beaker-250ml/qa/visual-body/target-renders/100ml-blue.png`
is a satisfactory visual target for a loaded 250 mL Griffin beaker. It is not a
production asset, a scientific colour result, or a source of vessel geometry.

The first implementation spike has now replaced the production candidate's
low-opacity polygon/stroke path with one Pixi WebGL custom-filter material for
the liquid body and a second pass for the free surface. This proves the GPU
boundary and refusal behavior, but the current capture still remains a
prototype-quality material study; absence of an SVG `<rect>` is not evidence of
visual quality, and no Gold Master or M6 S3 claim is made.

The repository already defines the required ownership boundary:

```text
WorldState / ScientificState
        -> bound ScientificFrame
        -> ObservableModel
        -> BeakerSceneActor
        -> Pixi materialization
```

`ObservableModel` supplies the validated liquid level and admitted optical
observation. The authored body and visual calibration supply only visual
structure. No new chemistry, volume calculation, optical profile, or indicator
palette is needed for this reconstruction.

## Research findings

### 1. The target is a layered optical composition, not a fill shape

The target has five visible cues that the current prototype does not model well:

1. body transmission remains visible through the liquid;
2. the liquid body has depth-dependent attenuation rather than one flat fill;
3. the free surface is a shallow perspective ellipse with separate surface and
   contact response;
4. the wall contact is a soft optical transition, not a UI outline;
5. the thick glass base changes the apparent depth without becoming an opaque
   blue slab.

The target therefore defines a visual decomposition, not a new physical model:

```text
authored body texture
        + cavity mask / visual calibration
        + admitted Observable tint/status
        + Observable liquid level
        -> GPU liquid-body material
        -> GPU/sprite liquid-surface material
        -> authored body/front detail retained above the state layer when needed
        -> deterministic graduations and interaction layers
```

### 2. The repository already has the right data boundary

The following existing values are sufficient for the first reconstruction:

| Target feature | Existing source | Representation use |
|---|---|---|
| liquid height | `ObservableModel.liquidLevel`, derived through frozen `h(V)` | fill boundary only |
| liquid colour | admitted `IndicatorOpticalObservation.tintSrgb` and `tintStrength` | base observed tint only |
| optical availability | `OPTICAL_MODEL_OK`, `DATA_MISSING`, `OUT_OF_COVERAGE` | observed vs neutral/refusal material |
| visual cavity | generated beaker calibration / manifest-owned visual geometry | clipping and screen projection only |
| rim, wall, spout, base | authored `body.png` | static visual truth |
| graduations | central `InstrumentMarking` contract | runtime overlay |
| identity | `sourceStateHash`, sequence, profile identity | frame binding and evidence |

The renderer must not consume `indicatorId` to choose a palette, infer pH, or
make a chemical branch. The target's blue is a visual stress fixture, not a
claim that the current phenolphthalein production path emits blue.

### 3. GPU is appropriate, but only for representation work

The repository uses PixiJS `8.16.0` with an explicit WebGL preference. PixiJS v8
provides both `Mesh`/`MeshGeometry`/`Shader` for custom geometry and custom
`Filter`/`GlProgram` pipelines for per-pixel effects. Its official renderer
guidance describes WebGL as the stable production renderer, while WebGPU remains
less mature. This makes a small WebGL shader the appropriate next experiment;
it does not justify moving chemistry or volume logic into GLSL.

The preferred implementation is a bounded custom material, not a general
post-processing framework:

```text
verified cavity geometry / mask
        -> static mesh or filtered body bounds
        -> one custom WebGL liquid material
        -> a separate surface pass
        -> optional authored front-detail pass
```

Pixi's `Mesh` is suitable when the liquid body needs explicit UVs and a stable
mesh boundary. A custom `Filter` is suitable when preserving the authored body
pixels under the liquid is more important than introducing a separate raster
layer. The first implementation spike should compare these two techniques on
the same fixture; it must not introduce both as parallel production paths.

## Recommended implementation

### Phase 1 — freeze the representation input

Introduce a renderer-only, serializable material input derived from the existing
actor. It should contain only:

```text
fillFraction / surface projection
admitted tintSrgb + tintStrength, or neutral/refusal status
verified visual calibration identity
sourceStateHash + sequence
```

It must not contain a second volume, profile, chemical form, pH threshold, or
indicator palette. The calibration remains `measurementUse: forbidden`.

The target image and any hand-tuned material coefficients belong in a visual
calibration record with explicit `visualApproximation` status. They must never
be imported by production rendering as a colour, mask, or state fixture.

### Phase 2 — GPU liquid body material

For the first 100 mL blue visual stress fixture, use one GPU material with the
following conceptual inputs:

```text
uTintSrgb             // Observable output, never a renderer palette
uTintStrength        // Observable output
uFillY               // Observable h(V) projection
uCavityMask          // asset-owned visual mask/calibration
uSurfaceBand         // visual surface width/depth
uWallBand            // visual wall-contact width
uBottomBand          // visual base-depth response
uOpticalStatus       // observed vs neutral/refusal branch
```

The fragment operation should be intentionally modest:

1. clip to the verified cavity and the fill half-plane;
2. compute a vertical transmission/depth factor;
3. apply a low-saturation tint derived from `tintSrgb` and bounded by
   `tintStrength`;
4. darken/attenuate near the side walls and thick base using visual calibration
   coefficients, not chemistry;
5. preserve the underlying authored body response through normal alpha/blend
   composition;
6. keep the free surface in a separate pass so it can have a different,
   restrained response.

This is an empirical 2.5D presentation model. It must be documented as such;
it is not Beer–Lambert recomputation and must not be presented as optical path
science. Beer–Lambert and colourimetry remain exclusively in the existing
Representation/Observable boundary.

### Phase 3 — surface and contact passes

The surface must not be a stroked ellipse. Build it from the same generated
visual calibration as the body:

```text
h(V)
  -> calibrated surface centre and left/right wall contact
  -> shallow perspective surface mesh
  -> separate surface shader/material
```

The surface pass may contain:

- a transparent body-tinted interior;
- a narrow rear/front edge response;
- a restrained specular band;
- a soft wall-contact transition.

It must not contain a hard black outline, a full-width white line, or a fixed
blue gradient. The surface depth is visual calibration only and cannot be read
back as volume or height.

### Phase 4 — preserve the authored body

The renderer must never lower the complete body sprite alpha to reveal the
liquid. That destroys the approved rim, spout, wall and base response.

The first spike should try, in this order:

1. preserve the body sprite at full alpha and apply a bounded liquid material
   over the verified cavity;
2. if the target comparison shows that body details need to remain above the
   liquid, derive an authored `glass-front-detail` layer from the body source;
3. only admit a back/liquid/front split after alignment, hash, light/dark,
   transparent-background, and no-bleed checks pass.

The split is an asset-production decision, not a reason to put image-edit output
into the runtime. The target remains a visual reference for comparing the
result.

### Phase 5 — safe refusal and fallback

When optical status is `DATA_MISSING` or `OUT_OF_COVERAGE`, the renderer must
show the existing neutral/refusal material. It must not use the target's blue,
an indicator-specific fallback, or a guessed RGB value. The liquid level may
still be shown if the volume/profile contract is valid; optical colour
availability is a separate representation decision.

If WebGL/custom shader support is unavailable, the first accepted fallback must
be an explicit neutral/refusal presentation or a separately reviewed simple
material. It must not silently claim the target-quality material was rendered.

## Why not the current approaches

| Approach | Decision | Reason |
|---|---|---|
| `Graphics.fill(singleColor)` polygon | reject | produces a panel, not a medium |
| polygon plus stroked ellipse | reject | encodes visual quality in primitive syntax, not appearance |
| reducing `body.alpha` | forbidden | degrades authored body and couples compositing to opacity hack |
| manually drawn white/dark glass lines | reject | repeats the rejected SVG/Blender highlight shortcut |
| image target as runtime liquid | reject | target has no scientific identity, source state, or dynamic semantics |
| CSS/DOM filter as primary material | defer/reject for first path | less controlled cross-browser composition and weaker Pixi layer ownership |
| full 3D fluid simulation | out of scope | unnecessary for upright 2.5D M6 representation |
| new optical calculation in shader | forbidden | would create a second optical/scientific implementation |
| GPU shader for bounded appearance | recommended | preserves GPU headroom while keeping inputs and semantics in existing contracts |

## Test and evidence plan

### Unit and contract evidence

- material parameters are derived only from `BeakerSceneActor`/Observable data;
- unavailable and out-of-coverage optical observations never produce target blue;
- no renderer-local cavity bounds or scientific height calculation exists;
- visual calibration identity is checked against the generated manifest artifact;
- `body.alpha` is not modified by beaker liquid composition;
- the shader/material has no indicator-ID palette branch, chemistry constant, or
  hard-coded production liquid colour;
- fill fraction changes only the visual surface/body boundary and never changes
  the source volume/profile/hash;
- 25, 100, and 200 mL geometry remains inside the cavity and the graduation
  layer remains independent.

### Browser evidence

Use one deterministic bound frame and capture:

```text
100 mL observed visual stress fixture: light / dark / thumbnail
25 mL observed fixture: light / dark
200 mL observed fixture: light / dark
neutral/refusal state: light / dark
```

The observed blue fixture is explicitly marked `visual-stress-fixture`; it is
not an accepted chemical reference. Production evidence must additionally use
the currently admitted optical observation and prove its tint reaches the
renderer without palette substitution.

### Visual acceptance

Owner review must compare the same viewport and background against the target
and check:

- the liquid reads as transparent medium, not a polygon or card;
- body/rim/spout/base quality is not degraded when loaded;
- surface has a shallow 2.5D ellipse and restrained meniscus cue;
- side-wall and base response are soft optical transitions, not strokes;
- there is no bleed outside the calibrated cavity;
- light, dark, full-size, and thumbnail views remain legible;
- neutral/refusal states remain honest and visually distinct from observed
  colour.

Exact PNG equality is not the acceptance rule across GPU/platforms. Capture
source/configuration hashes and use same-backend repeat checks plus owner visual
review/perceptual comparison. Geometry, semantic identity, and shader inputs
must remain deterministic even when rendered pixels vary slightly by backend.

## Ordered next implementation spike

1. Add a pure `buildBeakerLiquidMaterialInput()` boundary; do not alter
   Scientific Reality or World Runtime.
2. Implement one Pixi WebGL material path, preferably a `Mesh`/`Shader` or a
   bounded custom `Filter`, behind the existing `BeakerSceneActor`.
3. Use only the 100 mL target as the visual comparison target.
4. Keep body opacity unchanged and remove the primitive/stroke material path
   from production candidate status.
5. Capture light/dark side-by-side evidence and a neutral/refusal control.
6. If the result reaches the target's visual quality, extend to 25/200 mL and
   then decide whether a front-detail export is necessary.
7. Only after this vertical slice passes should the material become eligible for
   browser composition evidence; pouring, tilt, and other effects remain later
   spikes.

## Stop/go conditions

### Go

- 100 mL observed fixture reaches target-level visual review on light/dark;
- empty body remains unchanged outside the liquid region;
- no new scientific/volume truth is introduced;
- neutral/refusal behavior is explicit;
- all source/profile/frame identities remain bound;
- browser captures and negative tests are reproducible.

### Stop

- material still reads as a filled polygon/card;
- body is weakened through global alpha or baked state;
- renderer needs indicator-specific branches or chemistry constants;
- mask/calibration is duplicated in runtime code;
- target image or hand-authored RGB becomes a production source;
- only exact screenshot hashes, syntax checks, or absence of `<rect>` are used
  as visual evidence.

## What this research does and does not prove

The implementation spike now shows that the target effect is compatible with
the current M6 hybrid architecture and Pixi/WebGL backend without moving
chemistry or volume truth into the renderer. It does not prove that the current
shader matches the target, that the liquid has reached owner-approved visual
quality, that the beaker is a Gold Master, or that M6 S3 is complete.

## Implementation checkpoint — 2026-09-23

Implemented in the shared production Pixi path:

- `buildBeakerLiquidMaterialInput()` accepts only the scene actor's admitted
  tint/status and strips indicator identity before the GPU boundary;
- a WebGL `Filter`/`GlProgram` renders separate body and surface passes with
  bounded visual transmission, wall contact, bottom response and surface-ring
  cues;
- the authored body sprite remains at full opacity; no global-alpha workaround,
  renderer-local indicator palette, or shader chemistry was added;
- the default committed production composition remains optical-refusal/neutral
  when the optical profile is out of coverage;
- `?fixture=visual-stress` uses the same World → ScientificFrame → Observable →
  RenderState → Pixi path, with one explicit 75 mL committed transfer schedule
  so the 25 mL initial target reaches 100 mL for visual review. Its blue tint is
  labelled synthetic and is not scientific evidence;
- the browser regression asserts the fixture warning and the Pixi WebGL
  material compiles in Chromium. The fixture capture is a candidate review
  artifact, not an approved visual baseline.

Current stop condition remains active: the 100 mL capture still requires human
side-by-side review against the approved target, including light/dark and
thumbnail conditions. The next implementation work must improve or replace the
material only if that review identifies a visible mismatch; it must not alter
the scientific scenario merely to obtain a preferred colour.

## References

### Repository authority

- `docs/visual/apparatus-standard.md`
- `docs/visual/m6-art-direction.md`
- `docs/adr/0006-renderer-and-observable-architecture.md`
- `docs/adr/0016-indicator-optical-observation-boundary.md`
- `docs/adr/0018-hybrid-apparatus-asset-pipeline.md`
- `assets/apparatus/masters/beaker-250ml/qa/visual-body/target-render-analysis.md`
- `assets/apparatus/masters/beaker-250ml/source/visual-body/manifest.json`

### External research

- [NOBOOK chemical simulation laboratory overview](https://www.nobook.com/view/148) — public description of dynamic apparatus, liquid operations and experiment flow; not a source for NOBOOK's private renderer.
- [NOBOOK virtual laboratory product overview](https://www.nobook.com/view/396) — public description of apparatus libraries, engines and dynamic demonstrations; used only as a product-quality/interaction benchmark.
- [PixiJS v8 Mesh guide](https://pixijs.com/8.x/guides/components/scene-objects/mesh) — official geometry/UV/shader boundary for GPU materialization.
- [PixiJS v8 custom filters](https://pixijs.com/8.x/guides/components/filters) — official custom `Filter`/`GlProgram` path for per-pixel effects.
- [PixiJS v8 renderer guidance](https://pixijs.com/8.x/guides/components/renderers) — WebGL is the recommended stable production renderer; WebGPU remains less mature.
- [PixiJS v8 masks and scene objects](https://pixijs.com/8.x/guides/components/scene-objects) — official mask options and composition constraints.
