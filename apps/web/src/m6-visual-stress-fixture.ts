import type { BeakerSceneActor } from "@chemrealm/render";
import type { RenderState } from "@chemrealm/render";

export const M6_VISUAL_STRESS_FIXTURE = Object.freeze({
  id: "beaker-100ml-blue" as const,
  tintSrgb: [0.04, 0.32, 0.82] as const,
  tintStrength: 0.82,
  purpose: "visual-review-only" as const,
});

function sceneActor(value: unknown): BeakerSceneActor {
  if (typeof value !== "object" || value === null) {
    throw new Error("M6 visual stress fixture: beaker scene actor is missing");
  }
  return value as BeakerSceneActor;
}

/**
 * Apply the named M6 visual stress input without changing the committed world,
 * scientific frame, or ObservableModel. This is intentionally an application
 * fixture for GPU visual review; it is not a scientific optical observation
 * and must never be used by the default composition.
 */
export function applyM6VisualStressFixture(state: RenderState): RenderState {
  const nodes = state.nodes.map((node) => {
    if (node.id !== "beaker-apparatus") return node;
    const actor = sceneActor(node.data.sceneActor);
    const nextActor: BeakerSceneActor = Object.freeze({
      ...actor,
      liquid: Object.freeze({
        ...actor.liquid,
        appearance: Object.freeze({
          status: "observed",
          source: "m6-visual-stress-fixture",
          fixtureId: M6_VISUAL_STRESS_FIXTURE.id,
          indicatorId: "visual-stress-fixture",
          tintSrgb: M6_VISUAL_STRESS_FIXTURE.tintSrgb,
          tintStrength: M6_VISUAL_STRESS_FIXTURE.tintStrength,
        }),
      }),
    });
    return Object.freeze({
      ...node,
      data: Object.freeze({ ...node.data, sceneActor: nextActor }),
    });
  });
  return Object.freeze({ ...state, nodes: Object.freeze(nodes) });
}
