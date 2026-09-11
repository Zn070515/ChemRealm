# Apparatus visual standard — v1

- **Status:** **Binding.** `SPEC-0001` was accepted 2026-09-11, which is the
  condition this line named, so the M6 gate in §6 is now a real gate rather than
  a proposal. Repointed from "Proposed" during the M1 contract remediation's
  document audit.
- **Scope:** 2D / 2.5D experiment view. Governs all apparatus entering a release path.
- **Related:** `GOAL.md` §5.7, §15; `CLAUDE.md` §4.7, §10; `AGENTS.md` §14; `ADR-0006`

## Why this document exists before the art

`GOAL.md` §5.7 makes visual quality a product requirement rather than deferred
polish, and §15 states that "good enough for a prototype" must not silently
become the production art standard.

The trap is that art direction written *after* the assets is a rationalization of
whatever was already drawn. So the standard is written first, and `PLAN-0001` M6
gates asset production against it. Nothing ships in this round, so there is no
placeholder to accidentally promote.

**This document specifies how to build, not what to copy.** The NOBOOK-class
products named in `GOAL.md` §5.7 are a *quality benchmark*, not a source.
Layout, assets, and visual identity must be original. M6 includes an explicit
originality check in its review checklist.

## 1. Scene convention

| Property | Rule | Rationale |
|---|---|---|
| Projection | **Orthographic, straight-on.** No perspective convergence. | Volumetric readings (burette graduations, meniscus position) must be readable as a true side elevation. Perspective makes a reading ambiguous. |
| Camera | Fixed. No orbiting in the core experiment view. | A student reading a burette cannot be looking at it from an angle. Orbit belongs in a separate inspection view if ever used. |
| Up axis | Screen up = world up. | Meniscus, liquid surface, and gravity must agree. |
| **Coordinate unit** | **Millimetre (mm) — a LENGTH.** | Geometry coordinates are lengths. See the correction note below. |

### Correction: geometry coordinates are lengths, not volumes

An earlier version of this document said "one world unit = one millilitre of
liquid volume in apparatus geometry". **That was a dimensional error** (owner
review finding P2-1): a geometry coordinate is a length-like quantity, and mL is
a volume. Encoding volume into a length axis produces a scale factor that is
correct only for one vessel cross-section — that is, it works for a straight
cylinder and is silently wrong for everything else, including the conical flask
this slice depends on.

**The corrected contract:**

1. **Geometry uses millimetres.** Every coordinate, stroke width, and offset is a
   length (`ADR-0004` type `Millimetre`).
2. **Volumetric vessels expose an explicit volume profile**, as two monotone
   functions over fill height:

   ```
   V(h) -> Litre        volume contained at fill height h
   h(V) -> Millimetre   fill height for volume V  (inverse of V(h))
   ```

   Both are declared per vessel, sourced from the authoring tool or measured from
   the asset. They are the *only* permitted route from volume to height.

3. **The observable layer calls `h(V)`.** It never multiplies a volume by a
   fudge factor, and it never assumes a cylindrical cross-section
   (`ADR-0006`).
4. **Assets that cannot publish a profile are marked `non_volumetric`** and
   accept an approximate liquid level. A beaker drawn for decoration is allowed;
   a beaker pretending to be volumetric is not.

Why this matters more than it looks: a conical flask drawn to look right is not
the same object as a conical flask whose interior volume is a known function of
height. The first cannot support a liquid-level readout at all. The second can,
and the difference is invisible until someone checks the curve against a real
titration — which is exactly the kind of failure `GOAL.md` §17 says must be
caught, not shipped.

## 2. Materials

### Glass

| Attribute | Rule |
|---|---|
| Body | Cool neutral, low saturation. Glass is not blue-tinted. |
| Edge / stroke | Darker than body, consistent weight per apparatus size class. |
| Highlight | Two vertical highlights — one strong narrow, one soft wide — at a consistent side. |
| Specular | Present on rims and curves. Not on flat sheet faces. |
| Transparency | Glass occludes its contents partially. Reference liquid colour through the glass, never flat-composited. |

### Liquid

| Attribute | Rule |
|---|---|
| Surface (meniscus) | A concave meniscus is required for water in glass. It is the reading reference point. |
| Meniscus reading convention | Read at the **bottom of the meniscus**. This is a taught convention and the apparatus must support it visually. |
| Body shading | Vertical gradient: slightly darker at depth. Never a flat fill. |
| Colour source | **From `ObservableModel` only.** No hard-coded fills (`ADR-0006`). |
| Turbidity / precipitate | Separate layer above the liquid body, alpha from scientific state. |

### Consistency rule

All apparatus in one scene shares one light direction, one glass tint, one
highlight side, and one stroke family. `AGENTS.md` §14 prohibits inconsistent
apparatus perspective or material style. A burette and a flask that disagree
about where the light comes from read as a collage, not a scene.

## 3. Typography and readouts

| Element | Rule |
|---|---|
| Graduations | Numerals at major ticks only. Numerals align to the tick, not to the stroke. |
| Unit labels | Present. A bare number is never a reading. |
| pH readout | **Maximum 2 decimal places**, derived from the ±0.02 pH model tolerance (`ADR-0003`). Showing more is fake precision (`GOAL.md` §5.2). |
| Volume readout | 2 decimal places for a burette (0.01 mL is the instrument's real resolution), matching the graduated scale. |
| Font family | One family, tabular figures for all numeric readouts. Proportional figures make columns of numbers wobble. |
| Contrast | Readouts must meet WCAG AA against their background. A reading a student cannot read is a missing feature. |

## 4. Colour and contrast

- The palette must be defined as tokens, not literals in components.
- Indicator colours (phenolphthalein pink, methyl orange red/yellow) are the one
  place where saturated colour is required. They must be checkable against a
  labelled reference swatch, because the *colour is the observation*.
- The scene must be legible under a light and a dark background setting if both
  are offered. `GOAL.md` §15 names light/dark/background contrast tests.
- Colour must never be the sole channel carrying scientific information.
  Indicator colour is accompanied by a numeric pH readout and a species view,
  which is a genuine accessibility requirement as well as a pedagogical one.

## 5. Named viewports

Visual acceptance is defined at these sizes. A screenshot outside this set is
not evidence.

| Name | Size (CSS px) | Purpose |
|---|---|---|
| `desktop-primary` | 1440 × 900 | Primary review target. Owner visual sign-off happens here. |
| `desktop-compact` | 1280 × 720 | Common classroom projector. |
| `tablet` | 1024 × 768 | Shared-device and classroom-tablet case. |
| `narrow` | 768 × 1024 | Degraded-but-usable boundary. Below this, the core experiment flow is not required to work in v0, but must not render broken. |

## 6. Review checklist (M6 gate)

Every item is pass/fail. Any fail blocks the stage (`GOAL.md` §16 Gate D).

**Originality**
- [ ] No asset traced, copied, or derived from an existing product.
- [ ] Layout and visual identity are original to ChemRealm.
- [ ] Benchmark comparison against the `GOAL.md` §5.7 quality bar is a
      side-by-side screenshot, not a written claim.

**Geometry and correctness**
- [ ] Every volumetric asset publishes `V(h)` **and** `h(V)`, and the two are
      mutually consistent within a stated tolerance.
- [ ] Non-volumetric assets are explicitly marked in metadata.
- [ ] No coordinate, stroke, or offset carries a volume; all are `mm`.
- [ ] Liquid level is obtained by calling `h(V)`, never by scaling a volume.
- [ ] Meniscus concave and read at the bottom.
- [ ] Projection is orthographic; no perspective convergence.

**Consistency**
- [ ] Single light direction across all apparatus in the scene.
- [ ] Single glass tint and highlight side.
- [ ] Stroke weights follow the size-class rule.

**State linkage**
- [ ] Every coloured element traces to an `ObservableModel` output.
- [ ] No hard-coded chemical colour literal anywhere in the render path.
- [ ] Dependency rule verified: `packages/render` does not import `packages/sci`.

**Evidence**
- [ ] Screenshots captured at all four named viewports.
- [ ] Baseline stored under `tests/visual/baselines/` and reviewed by the owner.
- [ ] Deterministic fixture world used, so screenshots are reproducible.
- [ ] No prototype labels, watermark, or placeholder geometry in any capture.

**Accessibility**
- [ ] Readouts meet WCAG AA contrast.
- [ ] No scientific information carried by colour alone.
- [ ] Tabular figures on all numeric readouts.

## 7. What this document deliberately does not specify

- Specific hex values for glass, liquid, or chrome. Those belong in the token
  file created at M6, and pinning them here without seeing them rendered would
  be guessing.
- Iconography and UI chrome outside the experiment view.
- Molecular / crystal viewer style. That is a separate artifact for a later slice.

Fixing these now would produce a document that looks thorough and constrains
choices that have not yet been informed by anything real.
