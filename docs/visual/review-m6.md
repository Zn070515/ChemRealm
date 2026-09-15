# M6 visual review record

**Status:** M6 S2 technical evidence; visual-system gate NO-GO; owner visual acceptance is pending.

The governing production standard is
[`m6-art-direction.md`](m6-art-direction.md). This review must assess an
apparatus system, not only whether the current titration screenshot looks
clean. A green asset/package test is not visual owner acceptance.

## Current audit disposition

The current first slice demonstrates a useful RenderState/Pixi boundary and a
typed multi-spec catalog, but it is not yet the required final-quality family
system. The following must be visibly proven before M6 S3:

- no contour overlap, liquid bleed, stroke crossing or clipping;
- correct beaker, Erlenmeyer, graduated-cylinder, burette and volumetric-flask
  geometry;
- visibly different capacity variants, not uniform scaling with changed labels;
- coherent glass/liquid/metal/rubber material language;
- explicit visual, state and interaction layers for detachable parts;
- consistent non-cartoon style at full-size and thumbnail-size review;
- accessible readouts and interaction targets at all named viewports.

## Required comparison review

Review two separate same-family comparison sheets. The physical-scale sheet is
measurement-valid and preserves declared millimetre dimensions; the
normalized-shape sheet is visual-only and fits variants to a common artboard:

| Family | Minimum comparison | Required visible differences |
|---|---|---|
| Acid/alkali/v0 burette | acid 25 mL / alkali 50 mL / v0 100 mL | scale length/density, aspect ratio, capacity marking, support relation and rotary-vs-pinch actuator |
| Beaker | 100/250/500/1000 mL | height/width, base/rim mass, spout scale and graduation rhythm |
| Erlenmeyer | 100/250/500 mL | body/shoulder/neck proportions and base scale |
| Graduated cylinder | 25/50/100/250 mL | slenderness, base, scale density and profile |
| Volumetric flask | 50/100/250/500 mL | bulb/neck proportions, calibration placement and stopper relation |

Labels alone do not count as a visible difference. Every changed geometry
parameter must name its provenance class and source, or be explicitly marked
`approximate-visual` with a rationale and non-measurement limitation.

This record deliberately does not call the candidate captures an approved
visual baseline or claim M6 S3. The apparatus is an original, self-hosted
vector realization of the semantic package in
`assets/apparatus/titration-bench/`, backed by the reusable multi-spec catalog
in `assets/apparatus/catalog/`; the page consumes the committed
World → ScientificFrame → ObservableModel → RenderState path.

## Research-informed review frame

The candidate surface follows the local NOBOOK research synthesis: the world
stage is dominant, inspection remains a separate readable surface, and the
apparatus is represented as reusable parts/ports rather than a single image.
This is an architectural/product interpretation, not a claim about NOBOOK's
internal scientific implementation. The stage also follows the M6 web
evidence brief's separation of visual representation from scientific truth and
keeps essential readings in the DOM companion.

## Candidate evidence

| Criterion | Current result | Evidence |
|---|---|---|
| M6-ASSET | PASS locally at package level; visual gate NO-GO | `assets/apparatus/titration-bench/`, asset manifest tests, Art Direction review |
| M6-CATALOG | PASS locally | multiple vessel specifications and detachable connection catalog |
| M6-DETACH | PASS locally | typed ports, detachable state variants and compatibility tests |
| M6-GEOMETRY | PASS locally at contract level | frozen profile-derived level, mm manifest, parts/ports/regions, render-state tests |
| M6-RENDER | PASS locally | Pixi v8 adapter, `pnpm verify:m6-renderer`, built browser canvas mount |
| M6-STATE | PASS locally | `tests/browser/m6-visual.spec.ts`, canvas state version and DOM identity/readout assertions |
| M6-RESPONSIVE | PASS locally / owner review pending | `desktop-primary`, `desktop-compact`, `tablet`, `narrow` candidate captures |
| M6-PRIVACY | PASS on existing local checks | artifact scan and browser network-boundary test |
| M6-PERF | NOT RUN | static first slice has no animation loop; scripted performance sample remains open |
| M6-S3 | NOT RUN | originality, visual consistency, accessibility and final baseline require owner review |

## Visual-system gate

These are separate from the technical package rows above and are the blocking
visual acceptance rows from `m6-art-direction.md`:

| Gate | Result | Reason |
|---|---|---|
| V-P0-1 no overlap/bleed/clipping | BLOCKED | full-size and thumbnail review of family masters is not complete |
| V-P0-2 defining geometry | BLOCKED | all required family construction sheets are not reviewed together |
| V-P0-3 visible capacity differences | BLOCKED | catalog multiplicity exists; comparison-sheet geometry evidence is incomplete |
| V-P0-4 state/semantic coverage | PARTIAL | refusal/readout state exists; complete family state coverage is not evidenced |
| V-P0-5 interaction geometry | PARTIAL | parts/ports exist; complete anchors/hit/capability package is not evidenced |
| V-P0-6 no cartoon/mixed style | BLOCKED | owner visual review is pending |
| V-P0-7 coherent family language | BLOCKED | family comparison and material review are pending |
| V-P0-8 strict measurement view / labelled 2.5D preview | BLOCKED | view-mode separation and captures are not owner-reviewed |
| V-P0-9 token ranges / forbidden visual patterns | BLOCKED | token QA and forbidden-pattern review are not complete |
| V-P0-10 geometry provenance or approximation rationale | BLOCKED | per-parameter source review is not complete |
| V-P0-11 acid/alkali actuator mapping | PARTIAL | actuator contract is specified; asset/catalog evidence is not complete |

Candidate captures are intentionally stored under
`tests/visual/captures/m6/` and are not approved baselines. Regenerate them
from the built preview with:

```text
$env:M6_CAPTURE = "1"
pnpm exec playwright test tests/visual/capture.spec.ts --project=chromium
```

The normal browser suite skips capture generation unless `M6_CAPTURE=1`.

## Review checklist

| Review item from `apparatus-standard.md` | Result |
|---|---|
| Original, self-hosted package and source record | Candidate implementation; owner originality review pending |
| One orthographic family and coherent material tokens | Candidate implementation; owner visual review pending |
| Geometry and liquid level remain profile-derived | PASS locally at RenderState boundary |
| Runtime text/graduations/liquid are not baked into the master | PASS locally |
| Optical refusal is not replaced by an invented tint | PASS locally; default fixture displays refusal in DOM and canvas uses neutral liquid |
| Essential readings remain available without canvas pixels | PASS locally; DOM companion |
| Four named viewport captures | Generated locally; owner review pending |
| WCAG target size/contrast and final screen-reader language | Partial; DOM controls are in place, final owner accessibility review pending |

## Stop/go boundary

The current evidence supports M6 S2 implementation only. Do not mark this
record S3, approve the captures as the v1 visual bar, add M7 pointer commands,
or claim that visual inspection alone demonstrates learning. The next gate is
owner review of the candidate captures and a bounded performance/accessibility
sample.
