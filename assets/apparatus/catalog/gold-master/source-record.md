# Gold Master Candidate source record

This package is a bounded **Gold Master Candidate**, not an owner-approved Gold Master. The sole construction source is `packages/render/src/assets/gold-master-construction.json`. The generator reads that file and emits the typed catalog projection, manifests, SVG LODs and review sheets.

## Geometry contract

All SVG master coordinates are true millimetres. `bodyEnvelopeMm` records the vessel body; `physicalEnvelopeMm` records the complete visible envelope, including a beaker spout. The generated viewBox is exactly the physical envelope. Landmarks are consumed by geometry constructors and checked against generated paths; they are not decorative metadata.

## Family anatomy

- Acid burette: continuous glass tube, open rim, Schellbach-style reading stripe, PTFE rotary stopcock, rotary key, glass outlet and tip.
- Alkali burette: continuous glass tube, lower glass connector, one rubber delivery path, one glass bead, pinch region and glass tip.
- Beaker: straight-wall open body, rim-continuous local pouring lip/spout, calibrated marks and an integrated rounded contact region.
- Erlenmeyer flask: cylindrical neck, curved cubic shoulder, continuous conical body and an integrated rounded contact region.

Support ports, detachable semantics, liquid, meniscus, optical state, shadows and QA overlays are not clean-master pixels. A stand/clamp and scene shadow belong to composition.

## Source classes

The source records retain official manufacturer anchors where available: DURAN 25 mL Class AS burette (820 mm, 0.05 mL interval), Corning PYREX VISTA 250 mL Griffin beaker (approximately 70 mm OD × 95 mm height, 25 mL marks), and DURAN 250 mL Erlenmeyer (85 mm × 145 mm). Other capacity variants are explicitly approximate visual family profiles and must not be presented as certified metrology.

## LOD and review

The LOD manifest is semantic: master retains full construction and graduations, scene retains functional detail, preview retains recognition features, thumbnail retains identity features. All four LODs are shadow-free standalone geometry; scene shadows are added only when a scene relation supplies a bench/support.

The physical comparison sheet uses one shared millimetre-to-pixel factor and a ruler. The normalized sheet is visual-only. Dark/light full-size and thumbnail captures remain owner-review evidence and are not implied by package tests.
