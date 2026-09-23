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

The current body candidate contains none of the dynamic layers above.

The provisional candidate overlays can be regenerated with:

```text
pnpm generate:beaker-visual-body-layers
```

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

## Liquid ownership

Liquid height must come from a validated `VolumeProfileSnapshot` through the
existing `h(V)` path when the vessel is treated as volumetric. This visual body
does not generate, approximate, or mutate a profile. Until a profile is bound,
the composition must keep liquid-level evidence deferred rather than invent a
fill height.

## Current stop point

No production renderer wiring is added in this first assetization step. The
next implementation should create a deterministic fixture that consumes this
manifest and the existing Observable/marking contracts, then prove that the
body, labels, liquid, and state layers can be replaced independently.
