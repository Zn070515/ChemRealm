# Runtime layer boundary — `beaker-250ml`

This directory describes the intended runtime composition for the visual body.
It is deliberately not a second apparatus/science implementation.

## Layer order

```text
back glass response
→ state-derived liquid and meniscus
→ state/effect overlays
→ deterministic approximate-contained graduations and labels
→ front glass response
→ interaction/focus overlays
```

The current body candidate contains none of the dynamic layers above. The
renderer-neutral `BeakerSceneActor` now describes those layers and binds them
to one Observable source frame; it is a composition contract, not a Gold
Master admission.

The single-body compositing limitation is recorded in
`assets/apparatus/masters/beaker-250ml/qa/visual-body/glass-layer-decomposition-spike.md`.
That spike is prototype evidence only. Production liquid composition remains
deferred until an authored glass-back/liquid/glass-front representation is
validated.

The separate `liquid-visual-geometry.svg` is also prototype evidence only. It
uses a hand-authored cavity outline, wall boundaries, and perspective-ellipse
surface paths for 25/100/200 mL visual fixtures. Those fixture heights are not
scientific `h(V)` results, and its blue fill is not an optical observation.
It must not be promoted into production. The NOBOOK-aligned scene boundary is
recorded in `qa/visual-body/nobook-scene-vertical-slice.md`.

The provisional candidate overlays can be regenerated with:

```text
pnpm generate:beaker-visual-body-layers
```

That command also emits the renderer-facing
`packages/render/src/assets/beaker-visual-calibration.json`. It is a generated
artifact whose source-manifest SHA-256 is checked by
`verify:beaker-visual-body`; `beaker-geometry.ts` must not carry a second set
of cavity bounds.

The generated files are placement studies only. Their pixel anchors are not a
measurement transform and must not be used as liquid-height evidence.

## Graduation ownership

The 250 mL beaker uses the existing `approximate-contained` marking contract:
25, 50, 75, 100, 125, 150, 175, and 200 mL increasing upward from the vessel
base. These are visual contained-volume marks, not analytical measurements.

The generated candidate layer reads the marking record from
`packages/render/src/assets/gold-master-construction.json`; the visual-body
manifest does not duplicate those values. The eventual runtime layer must use
the existing `InstrumentMarking` contract and shared formatter/LOD policy. It
must not parse or infer graduation values from pixels in `body.png`.

The manifest also declares a per-specification normalized graduation box with
independent horizontal/vertical placement and a larger endpoint-safe clip box.
This is intentional: different vessel sizes and body artworks must not stretch
marks to the mouth or base, and the top/bottom labels must not be clipped at
the first or last graduation. The 250 mL candidate leaves a visible clearance
below the rim and above the contact base; other specifications must publish
their own scale and label-safe calibration box.

## Liquid ownership

The `interior-mask.svg` and `liquid-mask.svg` artifacts use the manifest's
`anchors.cavityTop` and `anchors.cavityBottom`. They deliberately do not use
`graduationRegion`: a scale's visual clearance is not the physical liquid
cavity. Liquid height must come from a validated `VolumeProfileSnapshot`
through the existing `h(V)` path when the vessel is treated as volumetric.
This visual body does not generate, approximate, or mutate a profile. Until a
profile is bound, the composition must keep liquid-level evidence deferred
rather than invent a fill height.

## Current stop point

The first renderer-neutral scene wiring and browser identity evidence now
exist. Production visual admission still stops here: the body remains a
candidate, the old liquid spike remains prototype-only, and a complete
NOBOOK-level scene study must still prove body/layer quality, pouring and
state-effect composition before M6 S3.
