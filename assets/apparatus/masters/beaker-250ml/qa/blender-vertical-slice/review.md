# Blender beaker vertical-slice review

Status: **candidate / human visual review required**. This is not a Gold
Master acceptance record and does not claim M6 S3.

## Backend decision

The pinned local Blender toolchain has an RTX 4090 OptiX device. OptiX is the
preferred review backend and is recorded in
`render-metadata.json`; CPU is retained as an explicit fallback. Geometry,
semantic IDs, source hashes, configuration, and QA are backend-independent
contracts. Rendered pixel identity is not treated as cross-backend truth.

Evidence:

- `gpu-repeat-comparison.json`: repeated OptiX renders differ only in sparse
  edge samples. The largest observed channel difference is approximately
  `0.00392`; the front-light changed-channel ratio is approximately
  `0.0000293`.
- `gpu-cpu-comparison.json`: CPU and OptiX remain visually close but are not
  bit-identical, especially around transparent/alpha edges. This is recorded,
  not hidden behind a PNG hash claim.

## Render matrix

The canonical review matrix is the OptiX run recorded by
`render-metadata.json`:

- `renders/front-light.png`
- `renders/front-dark.png`
- `renders/thumbnail-light.png`
- `renders/thumbnail-dark.png`
- `renders/closeup-rim.png`
- `renders/closeup-spout.png`
- `renders/alpha-check.png`

The A/B sheets compare the same front framing against the rejected SVG:

- `ab/ab-front-light.png`
- `ab/ab-front-dark.png`

## Visual disposition

The Blender candidate is technically reviewable and is materially different
from the rejected flat SVG: it has editable body/rim/base/spout geometry,
wall thickness, glass depth cues, orthographic framing, and backend-recorded
light/dark/alpha renders. It is **not** yet admitted as Gold Master. The
current visual issues for owner review are:

- the Griffin spout still needs an artist-specific silhouette pass;
- glass contrast and marking hierarchy need refinement against the NOBOOK/M6
  visual bar;
- the current markings remain explicitly approximate-contained marks;
- the current beaker record has no frozen `VolumeProfileSnapshot`, so no
  volumetric truth is claimed.

## QA disposition

`validation.json` is `PASS_WITH_DEFERRED`: all structural/toolchain/render
checks pass, while profile validation is correctly deferred because the
existing beaker source record does not provide a frozen profile. No Blender
job is allowed to invent that scientific/runtime truth.

The render and A/B hashes identify this candidate only. They do not prove
cross-platform pixel determinism or owner visual acceptance.
