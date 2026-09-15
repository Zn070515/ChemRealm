# ChemRealm apparatus catalog source record

## Purpose and boundary

This package is the reusable visual/semantic inventory for the M6 apparatus
family. It is not a chemistry database and it does not assign equilibrium
behavior to a material. A specification describes what an object is, its
physical size class, ports, detachable parts, readable graduations and visual
state layers.

The catalog is original ChemRealm vector work. NOBOOK is a product-quality and
interaction-surface benchmark only; no NOBOOK bitmap, mesh, screenshot trace,
icon or proprietary asset is included. The Zhejiang examination and laboratory
equipment research is used to prioritize familiar apparatus and operations,
not to copy a product interface.

## Evidence classes

- `manufacturer-anchor`: a cited manufacturer record supplies a concrete size,
  capacity or graduation anchor.
- `standard-family`: an education-equipment standard identifies a family or
  laboratory use; it is not silently treated as a dimensional measurement.
- `approximate-visual`: an explicitly labelled teaching-size visual variant.
  Approximate geometry is never used as a volumetric truth unless a separate
  frozen `VolumeProfileSnapshot` exists.

The runtime catalog in `packages/render/src/assets/apparatus-catalog.ts` is the
typed source for validation. This manifest is the inspectable asset-package
index; a release process must compare their specification IDs and source
records before packaging.

The construction sheet uses a logical review artboard (`1400 × 940` scene
units). Its catalog specifications remain millimetre-based semantic records;
the artboard coordinates are not claimed physical dimensions.

## Research anchors

- Zhejiang Education Examination Authority chemistry analyses (2024–2026)
  repeatedly emphasize preparation, purification, titration, operation order,
  condition control and experimental evaluation.
- Ministry education equipment standard JY/T 0655-2025 and the JY/T 0427
  teaching-equipment family register provide the domestic equipment vocabulary.
- DWK/DURAN product records anchor the 25 mL burette, 250 mL Erlenmeyer,
  250 mL volumetric flask and 25/100 mL cylinder size families.
- Fisher's tapered stopper assortment anchors the one-/two-hole detachable
  closure family.

Source URLs and repository-relative source references, together with claim-level notes, are maintained in
`docs/research/m6-zhejiang-apparatus-and-visual-target.md`.
