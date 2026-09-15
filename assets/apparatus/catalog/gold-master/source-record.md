# M6 Gold Master source record

## Package identity

This package is a bounded owner-review Gold Master candidate for ChemRealm's original apparatus family. It contains acid/alkali burettes, three beaker capacities and three Erlenmeyer flask capacities. Every file is generated from the checked-in construction source tools/create_gold_master_assets.mjs; the generated SVGs are static review assets, not runtime chemistry data.

Regenerate with: node tools/create_gold_master_assets.mjs

## Originality boundary

The geometry, construction layers, gradients, proportions and comparison sheets are original ChemRealm work. NOBOOK and vendor references informed broad recognizability and apparatus structure only. No third-party asset, screenshot, icon, traced silhouette, texture, brand mark or distinctive layout is included.

## Family anatomy and landmark contract

The package does not use universal required layers. Each family owns its real anatomy: acid burettes use a PTFE stopcock body and rotary key; alkali burettes use a lower glass connector, rubber delivery tube, glass bead and pinch region; beakers use a rim-continuous spout and glass contact foot; Erlenmeyer flasks use a curved shoulder, cylindrical neck and flat contact foot. Fictitious base and hardware layers are prohibited.

Manifest landmarks are review anchors for mouth/neck diameter, graduated length, shoulder transition, spout projection, flat contact and actuator placement. They are visual proportion contracts, not certified metrology.

## Geometry provenance

| Asset family | Source class | Anchors | Approximation boundary |
|---|---|---|---|
| Acid burette 25 mL | manufacturer-anchor + standard-family | DURAN 25 mL Class AS and PTFE stopcock records; JY/T 0655 family | SVG proportions are a visual master; calibration truth remains upstream |
| Alkali burette 50 mL | standard-family | JY/T 0655 teaching-equipment family | pinch mechanism and proportions are approximate visual anchors |
| Beakers 100/250/1000 mL | standard-family + approximate-visual | JY/T 0655 family and ChemRealm family proportions | capacity variants are visibly distinct but not certified drawings |
| Erlenmeyer 100/250/500 mL | manufacturer-anchor + standard-family | DURAN 250 mL anchor; JY/T 0655 family | 100/500 mL proportions are approximate visual variants |

Declared dimensionsMm and landmarks are catalog geometry anchors. Runtime liquid level, meniscus, readings, optical observation and chemical colour never come from these SVGs.

## Material and contour decisions

- Glass profiles are family-specific: the light direction is shared, but tint, edge restraint and opacity are not blindly reused across burette glass, open vessels and curved vessels.
- No master includes a scene shadow. Shadows are scene-owned and appear only in scene/preview/thumbnail LODs.
- Glass does not use a continuous equal-weight high-contrast closed contour. Edge cues are local, low-contrast rear/front accents with a restrained directional highlight.
- Burette graduations are geometry marks only; runtime values are not baked into any LOD.
- The acid burette exposes a glass/PTFE rotary mechanism; the alkali burette exposes a rubber-tube/glass-bead pinch mechanism. These are not interchangeable hardware tokens.

## LOD and comparison boundary

Master, scene, preview and thumbnail preserve family identity while removing construction detail deterministically. The comparison sheets embed the actual generated master SVGs, so they cannot silently drift to a hand-authored proxy silhouette. The physical sheet is measurement-anchored for declared dimensions; the normalized sheet is visual-only.

## State and fixture boundary

The states/manifest.json record declares reusable state-layer coverage. The SVGs intentionally expose empty runtime liquid and meniscus layers; Observable/RenderState supplies their values and effects. The fixture fixes the first review set, four LODs, two neutral backgrounds and the review sheets without embedding chemistry, quantities or readings.

## Review boundary

This package is implementation evidence only. Dark/light background captures, owner visual review, accessibility review and final visual acceptance remain open in docs/evidence/M6.md. It does not claim M6 S3.
