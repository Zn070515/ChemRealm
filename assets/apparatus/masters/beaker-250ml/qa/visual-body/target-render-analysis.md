# Liquid material target study

Status: `visual-target-only` / `PROTOTYPE_EVIDENCE_ONLY`

The target render is an image-edit study of the existing empty beaker body. It
is not a production export and does not supply a scientific tint, liquid height,
or `VolumeProfileSnapshot`.

## Target

- File: `target-renders/100ml-blue.png`
- Intended state: approximately 100 mL clear blue aqueous solution
- Source body: `source/visual-body/body.png`
- Target SHA-256:
  `sha256:ab8406e5c1c000356c0e179f55a85ae25b46438e95a4b7af0615502e07f718`

## Visual decomposition

The target is used to define what the runtime materialization must approach:

1. body transmission remains visible through the liquid;
2. the free surface has a shallow perspective ellipse and a restrained
   meniscus rather than a hard horizontal cap;
3. liquid-to-wall contact is visible but not outlined as a UI stroke;
4. the surface and body have different optical response;
5. the thick bottom changes the apparent path/depth without becoming a second
   opaque slab;
6. the empty-body rim, spout, side response, and base remain authored details.

The current Pixi liquid materialization is therefore marked
`prototype-rejected` for Gold Master visual evidence. The scene actor and
Observable identity contracts remain valid; this document only rejects the
current material appearance as a visual acceptance result.

## Required reconstruction boundary

`ObservableModel` supplies liquid height and admitted optical observation.
The Representation Engine may derive visual material layers from those inputs,
but it may not invent an indicator palette, change the authored body opacity,
or use this target image as a scientific source. The cavity calibration is
generated from the asset manifest and remains `measurementUse: forbidden`.
