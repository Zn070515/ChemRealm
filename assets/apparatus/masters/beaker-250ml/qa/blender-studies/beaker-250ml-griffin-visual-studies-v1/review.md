# 250 mL Griffin beaker controlled visual studies

Status: **study-only / S2 prototype evidence**.

This review records the first controlled Blender visual exploration. It does
not select a Gold Master, approve the visual system, or authorize M7.

## Review inputs

- Canonical study manifest: `tools/blender/jobs/beaker-250ml-griffin/studies/study.json`
- Positive reference system: `docs/visual/reference/`
- M6 visual constraints: `docs/visual/apparatus-standard.md` and
  `docs/visual/m6-art-direction.md`
- Rejected baseline: `assets/apparatus/masters/beaker-250ml/master.svg`
- Contact sheets: `form/contact-sheet.png`, `glass/contact-sheet.png`, and
  `lighting/contact-sheet.png`
- A/B sheets: `ab/ab-front-light.png`, `ab/ab-front-dark.png`,
  `ab/ab-thumbnail-light.png`, and `ab/ab-thumbnail-dark.png`
- Backend comparison: `backend-comparison/F03-optix-vs-cpu.json`

## Controlled study observations

### Form round

| Candidate | Intentional variable | Observation | Current disposition |
|---|---|---|---|
| F01 | quieter spout transition | Preserves the least assertive lip; the spout is readable but close to the base prototype. | Study candidate only; no owner selection. |
| F02 | more pronounced spout transition | Makes the pouring lip easier to find, but the improvement is subtle at thumbnail size. | Study candidate only; do not treat as a final spout design. |
| F03 | heavier rim profile | Gives the rim the clearest visual weight in this round and improves the dark-background read. | Strongest form study signal, still not a Gold Master. |
| F04 | quieter base mass | Gives the lower edge more mass without changing the semantic envelope; the distinction is subtle in the contact sheet. | Study candidate only; needs a deliberate base/foot study if retained. |

The form round confirms that the job can vary one declared geometry variable
without changing the source envelope or semantic object identity. It does not
yet establish a final Griffin silhouette: the current study inherits the
vertical-slice prototype's broad body proportions and therefore remains below
the approved visual bar for a finished asset.

### Glass round

| Candidate | Intentional variable | Observation | Current disposition |
|---|---|---|---|
| G01 | near-neutral body and edge | Most restrained body treatment; rim and edge remain readable without a strong cyan wash. | Viable reference point for a neutral baseline. |
| G02 | stronger edge readability | Improves the boundary read on dark neutral, with a higher risk of stylized tint. | Viable study direction; needs owner review. |
| G03 | softer product-render treatment | Produces a more obvious body presence, but can read as tinted material rather than transparent glass. | Keep as a comparison, not an accepted material. |
| G04 | educational readability emphasis | Gives markings and edge cues the strongest separation, with the highest risk of leaving the restrained-glass target. | Useful upper-bound study, not a default. |

No candidate is allowed to introduce liquid, indicator colour, optical path, or
chemical state. The blue/teal appearance is a material/lighting experiment,
not scientific colour evidence.

### Lighting round

| Candidate | Intentional variable | Observation | Current disposition |
|---|---|---|---|
| L01 | soft neutral rig | Balanced light/dark readability and the quietest overall contrast. | Baseline rig candidate. |
| L02 | edge/reflection-card emphasis | Gives the rim, base, and front wall more separation; it is the clearest controlled lighting study. | Strong study direction, pending owner choice. |
| L03 | quiet studio rig | Reduces highlight drama, but markings and wall depth become less assertive. | Useful lower-contrast bound. |

The lighting round demonstrates why material parameters alone are not the
ChemRealm visual language: reflection-card placement materially changes glass
readability while geometry and material identity remain fixed.

## A/B findings against the rejected SVG

The Blender candidate has a more physical rim/base response, stable dark/light
render coverage, and a useful close-up/thumbnail matrix. The rejected SVG still
has the stronger explicit graduation contrast and a more immediately legible
spout silhouette. The Blender result therefore demonstrates a promising
authoring backend, not visual victory over the rejected candidate.

The candidate still shows the following prototype limitations:

- body silhouette and spout curvature are not yet individually art-directed;
- the light-background render is low-contrast in places;
- the glass treatment is still close to a controlled material study rather than
  a settled ChemRealm glass language;
- the contact sheets do not establish final marking typography or scale;
- no manual owner choice has been made for form, glass, or lighting.

These are recorded as limitations rather than hidden by tolerance or QA status.

## Owner selection

```yaml
formSelection: pending-owner-review
glassSelection: pending-owner-review
lightingSelection: pending-owner-review
goldMasterAdmission: not-admitted
```

## Reproducibility

```text
python tools/blender/jobs/beaker-250ml-griffin/studies/validate_study.py --manifest tools/blender/jobs/beaker-250ml-griffin/studies/study.json --require-outputs --report assets/apparatus/masters/beaker-250ml/qa/blender-studies/validation.json
```

The candidate `.blend` files, scene reports, render metadata, contact sheets,
and A/B reports are evidence artifacts for this study only. Render hashes
identify outputs; they are not claims of cross-GPU pixel identity.

The F03 backend comparison records a GPU OptiX review render against a CPU
fallback render at the same settings. It is configuration/backend evidence,
not a requirement that the PNGs be bit-identical.
