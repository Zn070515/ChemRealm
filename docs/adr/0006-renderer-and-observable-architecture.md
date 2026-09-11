# ADR-0006: Renderer and observable architecture

- **Status:** Proposed
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
| Indicator colour | ObservableModel | Empirical model, see below |
| pH readout text | ObservableModel (value) + Renderer (formatting) | Precision rule from `ADR-0004` §5 and `SPEC-0001` |
| pH-volume curve points | ObservableModel | Derived from the scientific state sequence |
| Curve axes, gridlines, labels | Renderer | Pure presentation |
| Burette reading | ObservableModel | Derived: `initial − Σ delivered` |
| Species composition table | ObservableModel | Projection of ScientificState |
| Bubbles, precipitate, flames | ObservableModel decides presence; Renderer animates | Deferred past M5 |

### The indicator colour model

Colour is produced by a documented empirical observable model, not a lookup
table keyed on pH:

1. The indicator is modelled as a weak acid with its own `Ka_in`, taken from
   literature with provenance (`SPEC-0001` carries the values and sources).
2. The observable model computes the protonation ratio
   `[In⁻]/[HIn] = Ka_in / [H⁺]` — **a ratio, not a log** (see `ADR-0007`).
3. That ratio maps to a colour through a declared mixing model whose endpoints
   are measured/standard colours, with an explicitly stated transition range.

Three properties make this compliant rather than merely convenient:

- **It is continuous and derived.** There is no `if pH > 8.2 then pink`. The
  transition range is a property of the model, not a branch in the code.
- **It has provenance and a range.** The model records: indicator identity,
  `Ka_in` and its source, the transition interval, and the ionic-strength
  validity range. Outside that range the model reports reduced confidence rather
  than pretending.
- **It is labelled empirical, not first-principles.** Per `GOAL.md` §12, an
  empirical colour model must not be presented as calculated science. The
  inspection view says which is which.

### Enforcement

- `packages/render` must not depend on `packages/sci`. A dependency-cruiser (or
  equivalent) rule fails the build on violation. A convention that is not
  machine-checked is a convention that will be broken under deadline.
- `packages/render/observable` must not import PixiJS. This keeps the observable
  layer testable in Node with no browser, which is what makes it verifiable at
  all (`AGENTS.md` §8).
- Observable-model tests assert *derived* properties, not pixel values: e.g.
  "at 0.1 M HCl the model reports colour category `colourless`", "at the
  phenolphthalein transition the computed ratio crosses 1 at pH ≈ pKa_in".

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

## Open questions

1. Does the pH-volume curve belong to the observable layer or to a fifth
   "analysis" layer? It is a *derived view over a sequence of states*, not a
   projection of one state. **Leaning: observable layer, taking the state
   sequence rather than a single state, with its own pure tests.** Confirm at M5.
2. Where does animation-time live? The renderer needs a clock; the world must not
   have one (`ADR-0002`). **Leaning: the renderer owns a presentation clock that
   is never written to world state and never hashed.** Confirm at M6.
