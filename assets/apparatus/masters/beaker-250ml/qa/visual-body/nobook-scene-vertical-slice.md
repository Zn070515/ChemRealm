# NOBOOK-aligned scene vertical slice

Status: `prototype-evidence-only`

This document records the first implementation step after the NOBOOK public
product audit. It does not admit the beaker body or liquid renderer as an M6
Gold Master.

## Observed NOBOOK product contract

Public NOBOOK material describes a virtual chemistry workspace rather than a
collection of isolated pictures. The user can select or drag apparatus and
chemicals into a scene, move and rotate apparatus, connect compatible parts,
and perform operations such as pouring from one vessel into another. The
product also presents state-dependent phenomena such as bubbles, liquid
columns, tubing behaviour, fluid effects, particles, and reaction results.

References:

- https://www.nobook.com/view/396
- https://www.nobook.com/view/2
- https://www-v1.nobook.com/view/100
- https://nobook-doc-cdn.nobook.com/chem/NB%E5%8C%96%E5%AD%A6%E5%AE%9E%E9%AA%8C%E7%95%8C%E9%9D%A2%E5%8F%8A%E7%9B%B8%E5%BA%94%E5%8A%9F%E8%83%BD%E7%89%B9%E6%80%A7%E8%AF%B4%E6%98%8E.html

These sources document product behaviour and public visual examples. They do
not establish NOBOOK's internal renderer or asset file format.

## ChemRealm implementation boundary

The new `BeakerSceneActor` is a renderer-neutral scene contract:

```text
ObservableModel
  -> beaker scene actor
  -> glass-back
  -> liquid-body
  -> liquid-surface
  -> state effects
  -> glass-front
  -> graduation
  -> interaction ports
```

The actor is bound to one `sourceStateHash` and sequence. Liquid height comes
from the already validated Observable liquid level. Chemical colour is present
only when Observable supplies an admitted optical observation; refusal or
out-of-coverage states do not receive a guessed indicator palette.

The visual geometry remains explicitly non-scientific artwork geometry. It may
not generate, replace, or calibrate a `VolumeProfileSnapshot`.

## What this vertical slice proves

- The beaker is represented as a scene actor, not only as a bitmap.
- Liquid, surface, state effects, glass response, markings, and interaction
  are separate runtime responsibilities.
- The beaker actor, liquid level, and optical observation share one Observable
  source identity.
- An unadmitted optical result remains visible as unavailable rather than
  becoming a fabricated blue liquid.
- The browser composition path exposes the actor identity and layer contract.
- The visible 25–200 mL marking set is projected from the central apparatus
  marking contract; it is not a renderer-local list of pixel offsets.

## What it does not prove

- It does not prove NOBOOK-level visual quality.
- It does not prove that the current provisional screen-space cavity calibration
  is suitable for measurement or for another beaker specification.
- It does not admit the current blue/neutral liquid spike as production art.
- It does not prove a complete back-glass/front-glass raster decomposition.
- It does not implement pouring, tilt, gravity-aligned free surface, bubbles,
  precipitate, or multi-vessel connection behaviour.
- It does not close M6 S3 or authorize the next apparatus family.

The old `liquid-visual-geometry.svg` remains negative/prototype evidence only.
It must not be promoted into the production liquid renderer.
