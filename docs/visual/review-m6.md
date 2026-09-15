# M6 visual review record

**Status:** M6 S2 implementation evidence; owner visual acceptance is pending.

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
| M6-ASSET | PASS locally | `assets/apparatus/titration-bench/`, asset manifest tests |
| M6-CATALOG | PASS locally | multiple vessel specifications and detachable connection catalog |
| M6-DETACH | PASS locally | typed ports, detachable state variants and compatibility tests |
| M6-GEOMETRY | PASS locally at contract level | frozen profile-derived level, mm manifest, parts/ports/regions, render-state tests |
| M6-RENDER | PASS locally | Pixi v8 adapter, `pnpm verify:m6-renderer`, built browser canvas mount |
| M6-STATE | PASS locally | `tests/browser/m6-visual.spec.ts`, canvas state version and DOM identity/readout assertions |
| M6-RESPONSIVE | PASS locally / owner review pending | `desktop-primary`, `desktop-compact`, `tablet`, `narrow` candidate captures |
| M6-PRIVACY | PASS on existing local checks | artifact scan and browser network-boundary test |
| M6-PERF | NOT RUN | static first slice has no animation loop; scripted performance sample remains open |
| M6-S3 | NOT RUN | originality, visual consistency, accessibility and final baseline require owner review |

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
