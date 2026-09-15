# M6 Gold Master source record

## Package identity

This is the first owner-review Gold Master package for ChemRealm's original
apparatus family. It contains acid/alkali burettes, three beaker capacities and
three Erlenmeyer flask capacities. Every file is generated from the checked-in
construction source `tools/create_gold_master_assets.mjs`; the generated SVGs
are static review assets, not runtime chemistry data.
Regenerate the package with: node tools/create_gold_master_assets.mjs

## Originality boundary

The geometry, construction layers, gradients, proportions and comparison sheets
are original ChemRealm work. NOBOOK and vendor references informed broad
recognizability and apparatus structure only. No NOBOOK/vendor asset, screenshot,
icon, traced silhouette, texture, brand mark or distinctive layout is included.

## Geometry provenance

| Asset family | Source class | Anchors | Approximation boundary |
|---|---|---|---|
| Acid burette 25 mL | manufacturer-anchor + standard-family | DURAN 25 mL Class AS record; JY/T 0655 family | SVG proportions are a visual master; calibration truth remains upstream |
| Alkali burette 50 mL | standard-family | JY/T 0655 teaching-equipment family | 50 mL dimensions and pinch hardware are approximate visual anchors |
| Beakers 100/250/1000 mL | standard-family + approximate-visual | JY/T 0655 family and ChemRealm family proportions | capacity variants are visibly distinct but not certified drawings |
| Erlenmeyer 100/250/500 mL | manufacturer-anchor + standard-family | DURAN 250 mL anchor; JY/T 0655 family | 100/500 mL proportions are approximate visual variants |

The declared `dimensionsMm` are catalog geometry anchors. Runtime liquid level,
meniscus, readings, optical observation and chemical colour never come from
these SVGs.

## Construction decisions

- Glass uses rear/front edges, rim thickness, restrained body tint and a narrow
  directional highlight; it does not use a black cartoon outline or neon fill.
- Burette graduations increase downward and are geometry marks only; runtime
  values are not baked into any LOD.
- The acid burette exposes a glass/PTFE rotary mechanism; the alkali burette
  exposes a rubber-tube/glass-bead pinch mechanism.
- Beaker spouts and flask necks remain present through thumbnail LOD because
  they are family identity features.
- LODs remove detail deterministically while retaining semantic identity,
  declared dimensions, family identity and actuator identity.

## State and fixture boundary

The states/manifest.json record declares reusable state-layer coverage. The
SVGs intentionally expose empty runtime liquid and meniscus layers;
Observable/RenderState supplies their values and effects. The
fixture/render-fixture.json record fixes the first review set, four LODs,
two neutral backgrounds and the review sheets without embedding chemistry,
quantities or readings.

## Review boundary

This package is implementation evidence only. Dark/light background captures,
physical/normalized comparison review, accessibility review and owner visual
acceptance remain open in `docs/evidence/M6.md`. It does not claim M6 S3.
