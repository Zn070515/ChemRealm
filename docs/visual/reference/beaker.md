# 250 mL Griffin beaker reference

This is a visual decomposition for the first M6 study asset. It is not a
replacement for `measurement-sheet.json`, `source-record.md`, or a frozen
`VolumeProfileSnapshot`.

## Source-backed observations

The Corning 1003-250 record is the primary public physical reference for this
study. It describes a 250 mL heavy-duty Griffin beaker with a spout, an
approximately 74.3 mm outside diameter, an approximately 90 mm height, 25 mL
graduation increments, a double scale, a large marking spot, and an ASTM E-960
reference. These facts constrain interpretation; they do not require ChemRealm
to copy Corning's brand treatment or exact artwork.

## Observe

- The Griffin body is low-form: the body reads wider than a tall laboratory
  cylinder, but the upper opening still has a clear mouth and rim.
- The rim is a structural optical event, not a dark outline. It has a front
  edge, a rear edge, and a visible thickness cue.
- The spout is a continuous deformation of the rim/body transition. It must not
  read as a triangular sticker attached to a cylinder.
- The base carries more visual mass than the wall. A subtle bottom thickness
  cue stabilizes the silhouette without becoming a heavy opaque pedestal.
- Graduations are approximate contained marks, not a second scientific model.
  They must remain subordinate to the apparatus silhouette and remain readable
  in the final review size.
- A marking spot is a material/graphic region, not a liquid or chemistry layer.

## Classifications

| Cue | Classification | Study consequence |
|---|---|---|
| capacity, nominal envelope, graduation increment | `source-backed` | Read from existing ChemRealm records and public manufacturer record |
| exact curve of the shoulder, spout blend, and base transition | `visual-approximation` | Compare as form candidates; do not change source dimensions silently |
| front/rear wall hierarchy and restrained edge tint | `ChemRealm-policy` | Evaluate against light, dark, and thumbnail views |
| uniform cyan fill, white full-height stripe, crude triangular spout | `rejected` | Never use as the default visual solution |

## Candidate review questions

1. Does the silhouette identify a Griffin beaker without the label?
2. Does the spout look like glass that was formed, rather than a mesh
   primitive placed on the side?
3. Does the rim remain legible on both light and dark backgrounds without a
   cartoon outline?
4. Does the base feel heavier than the wall without looking like a solid cup?
5. Do the marks support later reading without dominating the object?
6. Does the thumbnail retain the low-form mass and spout direction?
