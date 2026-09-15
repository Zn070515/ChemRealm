# M6 NOBOOK and web evidence brief

> Status: research input for M6 implementation; not a replacement for
> `SPEC-0001`, an ADR, or the M6 visual acceptance record.
> Research date: 2026-09-15.

## Question

What should ChemRealm borrow from a mature virtual-laboratory product such as
NOBOOK when implementing its first final-quality apparatus view, and what must
be independently verified rather than inferred from product marketing?

## Evidence boundary

The NOBOOK evidence is product-surface evidence. It can establish what the
public product and integration API expose to users and integrators. It does not
establish that NOBOOK's internal chemistry is a single auditable scientific
model. ChemRealm therefore borrows interaction and information-architecture
lessons, while retaining its own Scientific Reality, provenance, validity and
replay contracts.

## Findings from the repository research

The canonical NOBOOK research in [`from-nobook.md`](./from-nobook.md) and the
asset playbook in [`agent-visual-asset-production.md`](./agent-visual-asset-production.md)
converge on six implementation rules for M6:

1. A mature experiment view is not only a canvas. Catalog/discovery, setup,
   world interaction, entity inspection and presentation are distinct surfaces
   even when they share a screen.
2. A useful apparatus asset is a reusable semantic package: master geometry,
   parts, ports, regions, capabilities, state variants, accessibility name,
   provenance and deterministic QA—not a single PNG.
3. State legibility is more important than decorative realism. Liquid level,
   meniscus, scale reading, connection state, units and current consequence
   must remain readable at the named viewports.
4. Geometry proposes an interaction; world semantics commit it. M6 may expose
   visual regions and future targets, but it must not mutate WorldState or
   infer chemistry from a drag.
5. Generated imagery may explore silhouettes and material direction, but
   deterministic vector/2.5D layers own dimensions, graduations, text, liquid
   level, ports and runtime state.
6. The first slice should prove the reusable path from committed world to
   apparatus view, not claim the mature catalog breadth or the M7 interactive
   titration loop.

## External web evidence

### NOBOOK product and integration surface

The current NOBOOK site describes its chemistry product as having rate,
equilibrium and pressure systems, and presents teacher, student and school use
cases. Those are vendor product claims, not independent evidence of internal
solver correctness. [NOBOOK product site](https://www.nobook.com/index.html)

The NOBOOK Open Platform 2.0 integration documentation exposes separate
configuration switches for the top/left/right/bottom toolbars, equipment
settings, save controls, player toolbar and equipment information. It also
documents `getData()`/`setData()` for serialized experiment data and
`switchModule()` for inorganic, organic and electrochemistry modules. This is
direct evidence for surface separation and serializable scene integration, not
for event sourcing or deterministic replay. [Experiment API](https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/)
and [UI component configuration](https://open.nobook.com/docs/2.0/tutorial-integration/experimental-integration/phy-or-chem-integration/CustomUI/)

### Learning and interaction evidence

PhET reports that each simulation is refined through research on design and
use, including four to six think-aloud interviews per simulation. It also
explicitly distinguishes conceptual-learning strengths from equipment skills
that simulations do not replace. ChemRealm should therefore treat M6 as a
legibility and interaction-foundation slice, not as proof of learning or
laboratory-skill transfer. [PhET research](https://phet.colorado.edu/en/research)

A systematic review of virtual chemical laboratories reports benefits over
passive media, mixed comparisons with hands-on laboratories, and the importance
of inquiry-based design, scaffolding and cognitive-load management. M6 should
make observations and consequences easy to inspect, while leaving guided
learning and ACE decisions to later scope. [Virtual chemical laboratories:
a systematic literature review](https://doi.org/10.1016/j.caeo.2021.100053)

### Renderer and accessibility evidence

PixiJS v8 uses asynchronous `Application.init()`, supports resize-aware
renderers, and recommends WebGL for production while WebGPU remains less
mature. M6 consequently uses a self-hosted PixiJS v8 adapter with a fixed
logical scene coordinate system and a DOM-readable companion surface; it does
not let Pixi own scientific state. [PixiJS Application guide](https://pixijs.com/8.x/guides/components/application),
[PixiJS renderers](https://pixijs.com/8.x/guides/components/renderers), and
[PixiJS v8 migration guide](https://pixijs.com/8.x/guides/migrations/v8)

WCAG 2.2 Success Criterion 2.5.8 sets a 24×24 CSS pixel minimum target size
or a spacing/equivalent exception. M6 uses this as an interaction-target
floor for future apparatus controls and keeps important readouts in accessible
DOM text rather than relying on canvas pixels. [W3C Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

## M6 decisions derived from the evidence

| Evidence | ChemRealm decision | What it does not authorize |
|---|---|---|
| NOBOOK separates equipment library, settings, player and info surfaces | M6 uses a world-dominant apparatus stage plus a separate inspection panel | A full catalog, authoring editor or M7 interaction loop |
| NOBOOK exposes serializable experiment data | M6 preserves the existing committed-world/frame identity path | Treating a scene document as an event log |
| NOBOOK shows high apparatus/state density | M6 ships one coherent original asset family and a package contract | Copying NOBOOK assets, layout or brand language |
| PhET uses iterative research and multiple representations | M6 keeps canvas and DOM inspection views synchronized | Claiming that visual interaction alone teaches |
| PixiJS v8 is async and resize-aware | M6 mounts Pixi asynchronously and fits a fixed logical scene to named viewports | Allowing renderer timing into WorldState |
| WCAG target-size guidance | Future controls use explicit hit regions and equivalent DOM controls | Pixel-perfect dragging as the only operation path |

## M6 research stop condition

The research is sufficient for the first slice when the implementation can be
reviewed against: original silhouette and material language, semantic asset
manifest, frozen geometry/profile identity, RenderState-only drawing,
accessible readouts, four named viewports, and reproducible local captures.
Further NOBOOK feature inventory should not expand this slice; it belongs to
the later catalog/content-production track.
