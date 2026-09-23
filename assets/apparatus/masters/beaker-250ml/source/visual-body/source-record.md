# Visual body source record — `beaker-250ml`

Status: **visual-body candidate**. This file is not a Gold Master admission
record and does not replace the existing Blender/SVG candidate records.

## Purpose

`body.png` is the authored visual body layer for a 250 mL Griffin beaker. It is
intentionally empty: no graduations, labels, liquid, meniscus, indicator
colour, state effect, shadow, or brand mark is embedded in the body.

The body is therefore suitable for a later composition of:

```text
body
  + deterministic approximate-contained graduations
  + Observable-owned liquid/meniscus/effect layers
  + interaction/accessibility overlays
```

## Engineering boundary

Physical dimensions, capacity identity, marking semantics, and any future
`V(h)`/`h(V)` profile remain owned by the existing ChemRealm records referenced
in `manifest.json`. The generated image does not certify dimensions, wall
thickness, capacity, calibration, or optical chemistry.

The normalized anchors in the manifest are provisional placement anchors only.
They must not be used as measurement evidence until manually calibrated against
the admitted asset package and its coordinate transform.

## Visual description

- low-form Griffin silhouette;
- open, visibly thick rim;
- rim-continuous pouring spout;
- neutral clear glass;
- modest continuous bottom transition rather than a pedestal;
- transparent background and no baked scene shadow.

## Provenance

The body was generated as an original visual candidate during the ChemRealm
assetization study and is stored locally as the checked-in artifact. No
third-party photograph, texture, logo, font file, or product artwork is
embedded. The artifact SHA-256 and all authoritative engineering inputs are
recorded in `manifest.json`.

## Not yet verified

- light/dark background acceptance;
- thumbnail readability;
- exact anchor calibration;
- runtime graduation composition;
- liquid clipping against a validated profile;
- browser/Observable integration;
- owner visual acceptance.
