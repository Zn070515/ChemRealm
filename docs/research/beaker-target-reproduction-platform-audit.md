# Beaker Target Reproduction: Platform and Renderer Audit

- Status: `S0 researched / implementation decision pending`
- Scope: `250 mL Griffin beaker`, `100 mL blue visual target` only
- Owner: Representation Engine
- Does not advance: M6 S3, Gold Master admission, Scientific Reality, World
  Runtime, optical science, or NOBOOK equivalence claims
- Research date: 2026-09-23

## Executive conclusion

The current Pixi output is not a near-target rendering with a few weak
parameters. It is the wrong material/compositing class. The shader currently
draws a tinted mask over an authored body that is largely opaque in the
interior; it does not have a verified front/back glass decomposition, scene
colour sampling, thickness/refraction map, or a target-calibrated liquid
surface. Replacing one flat polygon with a more elaborate polygon cannot close
that gap.

The recommended route is:

```text
Blender/Cycles GPU authoring and calibration
        ↓
original layered source scene + reproducible render passes
        ↓
verified runtime derivatives/maps
        ↓
PixiJS/WebGL multi-pass materialization
        ↓
World → ScientificFrame → Observable → RenderState → renderer
```

Blender is an authoring and calibration backend, not a second scientific or
world runtime. PixiJS remains the production web renderer. Three.js and Unity
HDRP are useful comparison points and may be used for isolated experiments,
but adding a second production renderer is not justified by the current
evidence.

“Nearly identical to the Target” must be defined for the fixed approved camera,
background, resolution, and visual state. It cannot mean that a target PNG is
embedded as a dynamic liquid asset, nor that pixel identity across GPUs is a
scientific invariant.

## Repository authority and hard boundaries

The implementation must remain subordinate to:

- `GOAL.md` §5.3 and §5.7: scientific state flows through Observable before
  rendering; visual quality is a product requirement;
- `docs/adr/0006-renderer-and-observable-architecture.md`: renderer receives
  representation data and does not calculate chemistry;
- `docs/adr/0018-hybrid-apparatus-asset-pipeline.md`: a complete asset is a
  package, not a single bitmap or one procedural SVG;
- `docs/visual/apparatus-standard.md`: orthographic experiment view,
  measurement separation, dual-background readability and layer ownership;
- `docs/visual/m6-art-direction.md`: authored visual body, deterministic
  runtime state layers and no vendor asset/layout reuse;
- `docs/research/beaker-liquid-material-reconstruction.md`: the current GPU
  spike is explicitly prototype-rejected for visual acceptance.

The following are not allowed in the target-reproduction work:

1. Computing `h(V)`, volume, pH, Beer–Lambert, indicator equilibrium, or
   optical admission in GLSL or a renderer-side helper.
2. Introducing a renderer-local blue palette or an indicator-ID branch.
3. Reducing the complete `body.png` alpha to expose a liquid layer.
4. Using the Target PNG, an NOBOOK screenshot, or a vendor texture as runtime
   state or as an untracked source asset.
5. Replacing the current Pixi boundary with a parallel Three.js/Unity runtime
   before the Pixi multi-pass experiment has been evaluated.
6. Calling an offline render or a visual stress fixture scientific evidence.

## What the public NOBOOK evidence actually supports

Public NOBOOK material describes a chemistry virtual laboratory with a large
apparatus/reagent surface, classic guided experiments, a free-form laboratory,
drag/assembly operations, and dynamic demonstrations. It explicitly describes
moving and combining apparatus and observing dynamic experimental processes.
That is evidence for product affordance density, state visibility and
interaction scope, not evidence of NOBOOK’s internal shader, asset format or
scientific solver. [NOBOOK product description](https://www.nobook.com/view/148),
[NOBOOK virtual-laboratory description](https://www.nobook.com/view/146), and
[official chemistry product surface](https://hx.nobook.com/index.html).

The public evidence does not expose enough renderer detail to responsibly say
“NOBOOK uses engine X” or to reproduce its implementation. The correct use of
NOBOOK here is therefore:

| Observed benchmark | ChemRealm interpretation | Boundary |
|---|---|---|
| apparatus library and free laboratory | asset packages must scale beyond one demo | do not copy catalog art, layout or icons |
| drag, combine and operate apparatus | scene actors need parts, ports and capabilities | interaction commits through World Runtime |
| dynamic demonstrations and pouring | state layers must be visibly distinct and composable | no fake state in renderer |
| readable apparatus and process feedback | material, silhouette and state legibility are acceptance criteria | no claim of internal NOBOOK equivalence |
| teacher/student/product surfaces | keep world, inspection and future editor concerns separable | no NOBOOK panel/layout recreation |

The target image is the more precise visual authority for this slice. NOBOOK is
the product-quality benchmark; it is not a pixel source.

## Platform comparison

### Blender 5.2.2 + Cycles/OptiX

Blender Cycles is a path-traced production renderer with GPU backends
including NVIDIA OptiX, CUDA, AMD HIP, Intel oneAPI and Apple Metal. Blender’s
Glass/Refraction BSDFs model reflection/transmission and refraction, and the
renderer can emit passes for compositing. [Blender rendering overview](https://www.blender.org/features/rendering/),
[Glass BSDF](https://docs.blender.org/manual/en/4.4/render/shader_nodes/shader/glass.html),
[Refraction BSDF](https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/refraction.html).

**Decision:** use Blender GPU for the authored/calibration vertical slice.

It is the best available local tool for producing a controllable original glass
and liquid reference with real front/back geometry, lights, reflection cards,
thickness, normals, depth and object/material passes. GPU is not a waste here;
it is the fastest way to explore the visual space that the current flat Pixi
mask cannot represent. It remains offline authoring evidence, not production
chemistry and not the browser runtime.

### PixiJS 8 WebGL

PixiJS v8 documents WebGL as the stable recommended renderer and WebGPU as
still maturing. Its `Mesh` API exposes geometry, UVs, indices, shaders and GPU
state; its renderer can render a container to a texture. Its v8 texture system
also supports renderable texture sources and explicit texture formats.
[PixiJS renderers](https://pixijs.com/8.x/guides/components/renderers),
[PixiJS Mesh](https://pixijs.com/8.x/guides/components/scene-objects/mesh),
[PixiJS textures](https://pixijs.com/8.x/guides/components/textures), and
[PixiJS v8 migration/render-texture guidance](https://pixijs.com/8.x/guides/migrations/v8).

**Decision:** keep Pixi/WebGL as the production runtime and replace the current
single-mask material with a bounded multi-pass compositor.

The present code uses a filtered white `Graphics` mask and creates a tinted
fragment colour from UV position. That can produce bounded gradients, but it
cannot reproduce the Target’s integrated transmission because it does not
sample a back layer or retain a verified front-glass detail layer. The next
implementation must use Pixi `Mesh`/custom shader and render textures where
needed, not keep increasing the number of UV heuristics in the existing filter.

### Three.js WebGL/WebGPU

Three.js `MeshPhysicalMaterial` exposes physically based transmission, IOR,
thickness, attenuation, roughness, specular response and optional dispersion.
The documentation also warns that these features have a higher per-pixel cost
and work best with an environment map. [MeshPhysicalMaterial documentation](https://threejs.org/docs/pages/MeshPhysicalMaterial.html).

**Decision:** use Three.js only as an isolated reference experiment if Blender
cannot provide the needed calibration, not as a second application renderer.

Three.js would make physical-looking transmission easier, but introducing it
beside Pixi would create a second scene/render boundary, another asset-loading
path and another browser portability surface. That is too much architectural
cost before the current Pixi compositor has been tested with proper layers.

### Unity HDRP

Unity’s public high-quality transparent-material guidance documents that a
standard transparent material alone does not reproduce realistic glass
refraction, and describes explicit back-then-front ordering and transparent
sort priority as ways to control transparent artifacts. [Unity high-quality
transparent-material guide](https://docs.unity3d.com/es/current/uploads/ExpertGuides/Create_High-Quality_Light_Fixtures_in_Unity.pdf).

**Decision:** treat Unity HDRP as a corroborating rendering reference, not a
ChemRealm dependency. Its important lesson is the ordering contract:

```text
back glass / background
        → liquid transmission
        → front glass / rim / edge detail
```

This is exactly the missing compositing relationship in the current Pixi
capture.

### Canvas/CSS/SVG and shader-only primitive fill

**Decision:** reject as the primary target-reproduction path. They remain useful
for deterministic graduations, masks, accessibility and low-cost fallback
geometry. They do not provide the target’s material response by merely replacing
a `<rect>` with a path or adding a gradient.

## Diagnosis of the current mismatch

The approved Target visibly contains:

1. a neutral transparent upper body with non-uniform front/rear edge response;
2. a blue liquid body whose centre, side contact and base have different
   transmission/attenuation cues;
3. a shallow elliptical free surface with front/rear edge differences;
4. wall contact that is soft and optical, not a UI stroke;
5. thick-base interaction that remains glass rather than becoming a blue slab;
6. a strong rim/spout/base response that is not weakened when liquid is present.

The current capture instead has this relationship:

```text
nearly opaque body.png
        + filtered white path
        + UV-derived tint/alpha
        + separate ellipse
```

That explains the “cyan card/trapezoid” result. It is not primarily a colour
problem. It is missing optical layering and missing scene/background response.

## Recommended implementation architecture

### 1. Offline authored/calibration scene

Create one original Blender scene for the 250 mL beaker. It must consume the
existing physical/semantic records but must not generate or alter a
`VolumeProfileSnapshot`.

The scene should contain:

- the authored beaker geometry/material, aligned to the approved body and
  physical envelope;
- a separate liquid volume with a verified upright surface;
- neutral and light/dark background rigs;
- controlled reflection cards/area lights;
- orthographic camera matching the approved visual target;
- a blue stress material only for visual calibration, explicitly not chemistry
  evidence;
- named render passes for body/front detail, liquid, surface, depth/thickness,
  normal/edge response and object masks.

Use the local GPU backend for interactive and review renders. Record Blender
version/build, backend, scene hash, render settings, color-management identity
and output hashes. Do not use pixel SHA-256 as cross-backend correctness.

### 2. Runtime derivative package

The complete package should evolve from one opaque body into explicit declared
roles. The exact file names are subject to the next implementation spec, but
the minimum conceptual package is:

```text
body/back-glass        authored neutral rear/interior response
liquid-cavity          verified visual cavity geometry/mask
liquid-material-maps   thickness/edge/normal/response maps, if needed
liquid-surface         state-derived surface geometry/material inputs
glass-front-detail     authored rim/spout/front/base response
graduations            deterministic runtime marking layer
manifest               semantic IDs, source hashes, calibration identity
```

The Target PNG remains a visual comparison reference. It is not copied into
the runtime package and does not supply a scientific tint.

### 3. Production Pixi multi-pass compositor

The first implementation should use the existing `BeakerSceneActor` and
`Observable` inputs, but change materialization to:

```text
background / scene
        ↓
authored back-glass/body layer
        ↓
liquid mesh inside the manifest-owned cavity
  - fill boundary from Observable h(V)
  - admitted tint/status only
  - scene/back-layer sample or bounded UV distortion
  - thickness/edge/depth maps from visual calibration
        ↓
separate free-surface mesh
        ↓
authored front-glass/rim/spout/base detail
        ↓
deterministic graduations and interaction overlays
```

The liquid shader may approximate visual transmission. It must not claim to
recompute colourimetry, Beer–Lambert, indicator chemistry or volume. A
`RenderTexture`/scene-colour input is a representation input, not a scientific
input. If a render-texture path is unavailable, the explicit fallback is
neutral/refusal or a separately reviewed lower-fidelity material; it must not
silently present the target-quality claim.

### 4. Colour and colour management

The runtime consumes admitted `tintSrgb`/strength from Observable. It should
not treat sRGB bytes as linear shader arithmetic. The calibration and shader
contract must state where conversion occurs and whether maps are colour data or
non-colour data. Pixi’s texture format/source contract should be used for
explicit map loading and filtering; no hidden canvas recolour step is allowed.

The target matching is empirical presentation work. It must not be used to
back-solve a new indicator palette or to bypass the current optical refusal
boundary.

## Visual acceptance that can support “near-target”

The next spike must not use syntax checks such as “there is no `<rect>`” as
visual evidence. It needs a fixed comparison protocol:

| Check | Required evidence |
|---|---|
| 100 mL blue | same 1145×1374 logical target view, light and dark backgrounds |
| body preservation | empty-body and loaded-body difference outside the liquid region; no global alpha reduction |
| surface | rear/front edge response and wall contact visible at full size |
| liquid depth | centre/side/base values are non-flat and remain integrated with glass |
| silhouette/cavity | no bleed outside the manifest-owned visual cavity |
| graduations | independent runtime marks remain legible and inside the vessel |
| thumbnail | liquid still reads as a medium, not a flat panel |
| refusal | unavailable/out-of-coverage state does not use target blue |
| repeatability | same backend repeat is stable; cross-backend differences are reported as perceptual/configuration differences |

Target comparison should be region-aware: silhouette/rim, free surface, liquid
body, wall contact, base, and background compatibility are reviewed separately.
Perceptual similarity may support review, but it cannot replace owner visual
review or prove chemistry.

## Ordered next action

This audit deliberately does not change production code. The next implementation
plan should be limited to one 100 mL blue target slice:

1. freeze the current target and body hashes;
2. author and render the original layered Blender scene on GPU;
3. validate source geometry, semantic IDs, render passes and color-management
   identity;
4. export only the smallest required runtime derivatives;
5. implement one Pixi multi-pass compositor using those derivatives;
6. preserve the existing Observable/RenderState identity and refusal behavior;
7. capture light/dark/full/thumbnail comparisons;
8. reject the spike if it still looks like a panel or if it introduces a
   second source of scientific truth.

Do not extend to 25/200 mL, tilt, pouring, other indicators or MCP integration
until the fixed 100 mL slice passes owner visual review.

## Go / stop decision

### Go to implementation plan

- the route is Blender GPU authoring + Pixi WebGL runtime;
- a layered package is accepted as the necessary asset boundary;
- Target remains reference-only;
- the existing science/world/observable contracts stay unchanged;
- near-target claims are limited to fixed, reviewed view/state conditions.

### Stop and revisit architecture

- the Pixi compositor cannot preserve body/front detail even with verified
  layers;
- achieving the target requires embedding target pixels or vendor assets;
- a shader needs chemistry, volume or optical-model logic;
- a second runtime renderer becomes necessary for ordinary product use;
- visual output remains a flat card after the back/liquid/front experiment.

## What this audit proves

It proves that the current failure is diagnosable and that the repository has a
credible route to a much closer target: offline GPU-authored layered material
plus a bounded Pixi/WebGL compositor. It does **not** prove that the route has
been implemented, that the target has been matched, or that M6 S3 is available.
