# Gold Master QA

## Required matrix

Every asset is reviewed in `master`, `scene`, `preview` and `thumbnail`
LOD at both `dark-neutral` and `light-neutral` backgrounds. The current
package records the assets and deterministic LOD source; owner captures are
still pending.

| Check | Rule | Current package evidence |
|---|---|---|
| Structure | rim/base/body/neck/spout/scale/actuator remain family-owned layers | SVG `data-layer` records + manifest |
| LOD identity | capacity, dimensions, family and actuator identity do not change | manifest + four LOD files per asset |
| Material | restrained glass/metal/rubber values, no cartoon contour or halo | shared construction tokens |
| Background | dark-neutral and light-neutral remain legible | manifest matrix; owner captures pending |
| Runtime separation | no pH, reagent, reading, liquid quantity or chemical colour baked in | SVG package test |
| Originality | no NOBOOK/vendor artwork or external references | source record + self-contained SVGs |
| State coverage | declared empty/filled/connected variants remain RenderState-owned | states/manifest.json + deterministic fixture |
| Reproducibility | bounded asset set, LODs, backgrounds and review sheets are fixed | fixture/render-fixture.json |

## Gold Master set

`burette-acid-25ml-class-as`, `burette-alkali-50ml-class-b`,
`beaker-100ml`, `beaker-250ml`, `beaker-1000ml`,
`conical-flask-100ml`, `conical-flask-250ml`,
`conical-flask-500ml`.

The physical-scale sheet is measurement-valid for declared dimensions. The
normalized-shape sheet is explicitly visual-only and must not supply readings.

## Reproduction

Run node tools/create_gold_master_assets.mjs, then run the Gold Master package
test from the repository root. The generator is deterministic and does not
fetch external assets.
