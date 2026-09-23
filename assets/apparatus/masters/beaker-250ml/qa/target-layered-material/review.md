# Beaker target-layered material review

**Status:** prototype evidence only; M6 S2; not Gold Master evidence.

This review records the current 250 mL Griffin `100 mL blue` GPU slice after
the layered compositor change. It is intentionally separate from the approved
target render: the target is a visual reference and is not loaded by runtime,
shader, test fixture, or build tooling.

## Runtime path

```text
committed RenderState
  → BeakerSceneActor
  → generated visual calibration
  → Pixi WebGL back body
  → GPU liquid body material with back-buffer sampling
  → GPU free-surface pass
  → authored front-detail derivative
  → deterministic graduations
```

The material is presentation-only. It receives an already-admitted tint and
the already-derived fill height; it does not calculate chemistry, optical
admission, volume, `h(V)`, Beer–Lambert, or indicator behaviour.

## Evidence inputs

| Item | Path |
|---|---|
| Approved visual target (reference only) | `qa/visual-body/target-renders/100ml-blue.png` |
| Runtime body | `source/visual-body/body.png` |
| Generated calibration | `packages/render/src/assets/beaker-visual-calibration.json` |
| Layer manifest | `source/visual-body/runtime/layer-manifest.json` |
| Current browser capture | `tests/visual/captures/m6/visual-stress-100ml-blue.png` |

## What this slice proves

- The same named visual-stress actor path reaches the GPU compositor.
- The authored body is not globally alpha-reduced.
- The liquid mask uses generated cavity calibration, not a renderer-local
  rectangle or graduation bounds.
- The material samples already-rendered scene colour through Pixi's WebGL
  back-buffer path and has a separate surface pass.
- The front-detail role is restored after the liquid passes.
- Unavailable/ambiguous optical states retain the neutral/refusal boundary.
- Runtime roles, source manifest, calibration, and front-detail identity are
  hash-checked by the visual-body guard.

## What this slice does not prove

- It does not prove pixel equivalence with the target render.
- It does not prove a physical optical model or a Beer–Lambert calculation.
- It does not prove GPU-backend pixel determinism.
- It does not prove light/dark or thumbnail owner visual acceptance.
- It does not admit the target image, the NOBOOK references, or the authored
  body package as M6 Gold Master production art.

The current capture remains below the target's richer liquid-side and
thick-base response at full review scale. The next visual work must be a
controlled material/calibration iteration, not a relaxation of this evidence
boundary.

## Reproduction

```text
pnpm generate:beaker-visual-body-layers
pnpm verify:beaker-visual-body
pnpm typecheck
pnpm build
$env:M6_CAPTURE='1'; pnpm test:browser -- tests/visual/capture.spec.ts -g "visual-stress"
```
