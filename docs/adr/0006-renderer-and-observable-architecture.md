# ADR-0006: Renderer and observable architecture

- **Status:** **Accepted** — owner, 2026-09-11 (baseline `8310c685`)
- **Deferred decisions:** see the ADR's own `## Open questions` / `## Open decisions`;
  acceptance covers the decision, not the deferred sub-questions.
- **Date:** 2026-09-11
- **Deciders:** Project owner
- **Related:** `GOAL.md` §5.3, §5.7, §6.3, §15; `CLAUDE.md` §10; `AGENTS.md` §14
- **Blocks:** `PLAN-0001` M5, M6, M7

## Context

`GOAL.md` §5.3 is unambiguous:

> Scientific state -> observable model -> visual state -> renderer
> Hard-coded shortcuts such as `if FeCl3 then yellow` are prohibited unless they
> are implemented as a documented empirical observable model with provenance and
> a clear applicability range.

`GOAL.md` §5.7 makes visual quality a product requirement rather than deferred
polish, and `GOAL.md` §15 requires objective visual review artifacts.

The tension in the titration slice is specific. The solution's colour is driven
by an indicator's acid-base equilibrium, which is *real chemistry* with real
constants — but it is also an *empirical colour perception* fact that no
first-principles calculation produces. Phenolphthalein's pink is not derivable
from quantum chemistry at the fidelity this project needs. So the colour path
crosses from rigorous equilibrium (the indicator's protonation ratio) into
empirical observation (what that ratio looks like to a human eye).

Getting this boundary wrong produces the two failure modes the project is most
exposed to: chemistry logic inside a rendering component (untestable, violates
§5.3) or a hard-coded colour table masquerading as science (violates §5.2).

## Decision

**Four layers with a strict, machine-enforced direction. The renderer receives
geometry, material, and transform only, and cannot import the scientific
package.**

```
ScientificState        packages/sci
      │  (pure data: concentrations, species amounts, T, P)
      ▼
ObservableModel        packages/render/observable
      │  (pure TypeScript, no DOM, no PixiJS, fully unit-testable)
      │  computes: indicator protonation ratio, solution colour, liquid level,
      │            pH-curve points, precipitate/bubble presence, species table
      ▼
RenderState            packages/render/state
      │  (renderer-agnostic scene description: shapes, fills, positions,
      │   z-order, transforms, text runs. No numbers that mean "chemistry".)
      ▼
Renderer               packages/render/pixi
         (PixiJS. Consumes RenderState. Knows nothing about chemistry.)
```

### Layer ownership for the titration slice

| Visual element | Owner | Notes |
|---|---|---|
| Glassware geometry, stroke, highlights | Renderer | Pure drawing |
| Liquid level in a vessel | ObservableModel | Derived by calling the vessel's declared `h(V)`; never by scaling a volume into a geometry axis |
| Liquid fill geometry | Renderer | Consumes level from RenderState |
| Indicator **protonation ratio** | **Scientific Core** | Equilibrium — `Ka_in`, `γ`, `a_H`. Not the renderer's business. |
| Indicator **colour** | ObservableModel | Empirical perceptual mapping: `(indicatorId, ratio)` → colour via a declared palette |
| Model pH value | Scientific Core | `−log₁₀ a(H⁺)` |
| `c(H⁺)` / `−lg c(H⁺)` | **ScientificProjection** | Needs scientific state **and** world volume |
| Readout text and precision | Renderer | Formatting only; precision rule from `ADR-0004` §5 |
| pH-volume curve points | ScientificProjection (values) + ObservableModel (geometry) | Values from the state sequence; the renderer draws |
| Curve axes, gridlines, labels | Renderer | Pure presentation |
| Burette state | ObservableModel | Derived: scale reading `initialScaleReading + Σ delivered`; contained volume is tracked separately |
| Species composition table | ObservableModel | **Re-presents** scientific values; computes no chemistry |
| Bubbles, precipitate, flames | **Scientific Core** decides presence; Renderer animates | Deferred past M5 |

**The rule for the observable layer:** it may *re-present* a scientific value —
list it, format it, map it to a geometry or a colour, scale it for display. It
may not *compute new chemistry*. If answering a display question requires
`Ka`, `Ksp`, an activity, or a reaction direction, the answer comes from the
Scientific Core.

### M5 contract remediation — representation identity and readout policy

**Revised 2026-09-13 (SPEC-0001 revision 21 Candidate).** M5 does not weaken
the canonical representation criteria. A vessel profile publishes both
`h(V)` and `V(h)` and the observable layer verifies their declared round-trip
tolerance. Burette state keeps `containedVolume`, `deliveredVolume`, and the
graduated `currentScaleReading` separate; the latter is displayed on the
instrument's `mL` scale at `0.01 mL` precision.

Indicator colour is selected from a declarative empirical palette keyed by
`indicatorId`; it never infers chemistry from a colour token. A
`HydrogenIonPresentationPolicy` chooses exactly one hydrogen-ion convention
for a view. The default taught view may call `−lg c(H⁺)` “pH”; the scientific
model view names its activity convention. No scene is assembled with both
readouts and then expected to hide one later.

Scientific expressions are schema-owned records carrying model and source-state
identity. Render may present and freeze them, but it cannot author an arbitrary
string as an exact scientific expression.

### The indicator boundary — corrected

**Revised 2026-09-11 (round 3, finding P1-C).** The previous version of this
section identified the right problem and then drew the boundary in the wrong
place. It correctly observed that indicator colour has two halves — real
acid-base equilibrium, and an empirical perceptual mapping — and then assigned
**both** to the observable model, which computed

```
m(In⁻)/m(HIn) = Ka_in · γ_HIn / (a_H · γ_In)
```

That expression contains `Ka`, an activity, and an activity coefficient. It is
**equilibrium chemistry**, not an observable mapping, and it belongs to the
Scientific Reality Core. Computing it in `packages/render` would require the
renderer to import or reimplement the activity model — exactly what `GOAL.md`
§5.3 forbids.

The corrected split:

```
Scientific Core
   │  solves the indicator's acid-base equilibrium alongside the analyte's
   ▼
indicators: [{ indicatorId, protonationRatio }]     ← scientific output
   │
Observable Model
   │  empirical mapping ONLY: ratio → colour
   ▼
colour
```

| Half | Owner | Input → output |
|---|---|---|
| **Indicator equilibrium** | Scientific Core | `Ka_in`, activity coefficients, mixture state → `protonationRatio` |
| **Colour perception** | Observable Model | `protonationRatio` → colour, via a declared mixing model with measured/standard endpoints and an explicitly stated transition range |

The dividing line is: **"how much In⁻ is there" is chemistry; "what does 50 %
In⁻ look like" is perception.** The observable model may own the latter and must
never own the former.

**This is the general rule, not an indicator special case.** The same pattern
would otherwise repeat for every future observable:

- precipitate colour ← needs `Q` vs `Ksp` — **chemistry**, not the renderer;
- flame colour ← needs the emitting species — **chemistry**;
- gas evolution presence ← needs the reaction — **chemistry**;
- bubble animation rate ← presentation.

If the "does the observable model compute…" question is answered per-feature by
convenience, the Scientific Core is hollowed out one observable at a time. The
rule is stated once, here, so it does not have to be re-litigated.

Three properties make the colour half compliant:

- **It is continuous.** There is no `if ratio > 0.5 then pink`. The transition
  range is a property of the model, not a branch in the code.
- **It has provenance and a range.** The model records the indicator identity,
  the transition interval, and the perceptual endpoints. The *equilibrium* half,
  including `Ka_in` and its source, is recorded by the scientific core under
  `ADR-0003`.
- **It is labelled empirical, not first-principles.** Per `GOAL.md` §12, a
  perceptual mapping must not be presented as calculated science. The inspection
  view says which half produces which number.

### Enforcement

- `packages/render` must not depend on `packages/sci`. A dependency-cruiser (or
  equivalent) rule fails the build on violation. A convention that is not
  machine-checked is a convention that will be broken under deadline.
- `packages/render/observable` must not import PixiJS. This keeps the observable
  layer testable in Node with no browser, which is what makes it verifiable at
  all (`AGENTS.md` §8).
- Observable-model tests assert *derived* properties, not pixel values: e.g.
  endpoint/continuity properties for both named indicator palettes. The
  phenolphthalein transition ratio itself is supplied by the Scientific Core;
  render never computes or infers it.

### Assets and the visual bar

Per the owner's 2026-09-11 decision, this round writes the standard
(`docs/visual/apparatus-standard.md`) and M6 authors assets against it. Nothing
ships as placeholder because nothing ships yet. The rule that survives into M6:

> An asset enters the release path only with a captured baseline screenshot at
> the named viewports, reviewed against the written standard.

## Alternatives considered

**Let Pixi components read `ScientificState` directly and compute colour
inline.** Rejected. This is the `if FeCl3 then yellow` pattern with extra steps,
untestable without a browser, and impossible to reuse across the macro/micro/
symbolic views that `GOAL.md` §17 requires.

**Compute colour in the scientific layer.** Rejected. Colour perception is not
chemistry. Putting it in `packages/sci` would make the scientific core depend on
a display concern and would blur the "measured vs empirical vs pedagogical"
distinction that `GOAL.md` §12 requires.

**Render SVG/DOM for glassware, PixiJS for liquids.** Rejected for v0 as two
rendering stacks to maintain and two sources of geometry truth. Revisit only if
PixiJS proves unable to hit the visual bar for glass highlights, which is a real
risk and is why M6 is a gate rather than a task.

**A generic scene-graph abstraction over multiple renderers.** Rejected as
premature abstraction. `RenderState` is already the abstraction; adding a
renderer-agnostic intermediate between `RenderState` and PixiJS would be a layer
with no second consumer.

**Defer the visual standard until assets are built.** Rejected by owner
decision. A bar written after the art is a rationalization of the art.

## Consequences

### Positive
- Observable behaviour is testable in Node with no browser, which is the only
  reason the visual layer can have real acceptance criteria at all.
- The same `ObservableModel` serves the sandbox view, the guided view, the
  challenge view, and the branch-comparison view. `GOAL.md` §2's "one world,
  multiple projections" is achievable rather than asserted.
- Swapping or augmenting the renderer later (e.g. adding an SVG export for
  teachers) does not touch chemistry.

### Negative
- Three hops from science to pixels, and each hop is code that must exist and be
  tested.
- `RenderState` must be designed to be expressive enough for a *good-looking*
  renderer without becoming a chemistry API. That is a genuine design tension
  and will need iteration at M6.
- Animation that is visually stochastic must not leak into world truth
  (`ADR-0007`); this needs a clear rule about which layer owns randomness.

### Neutral
- The enforcement rule is one more CI check to maintain. Cheap, and it protects
  the property `GOAL.md` §5.3 cares most about.

## Reversibility

**Moderate.** The layer boundaries are cheap to keep and expensive to
re-establish once violated. If the observable layer proves too coarse, splitting
it is easy. If it is bypassed in a few places under pressure, the boundary is
gone — which is why the dependency rule is a build failure rather than a
guideline.

## Open decisions

### M5 S1 decision — pH-volume curve ownership

**Decided by the owner on 2026-09-13:** the pH-volume curve belongs to the
ObservableModel. It consumes an ordered sequence of ScientificState and already
computed ScientificProjection values; it may preserve order and map values to
presentation geometry, but it may not solve chemistry or invent a curve from a
volume-only table. This closes the former curve-ownership question without
adding a fifth core or analysis package.

The animation clock remains deferred to M6. It is renderer-owned presentation
state and must never be written to WorldState or included in a replay hash.

## Open questions

1. Where does animation-time live? The renderer needs a clock; the world must
   not have one (`ADR-0002`). **Leaning: the renderer owns a presentation clock
   that is never written to world state and never hashed.** Confirm at M6.
