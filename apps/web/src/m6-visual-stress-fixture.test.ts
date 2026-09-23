import { describe, expect, it } from "vitest";

import { applyM6VisualStressFixture } from "./m6-visual-stress-fixture.js";
import type { RenderState } from "@chemrealm/render";

function sourceState(): RenderState {
  return {
    version: 2,
    nodes: [
      {
        id: "beaker-apparatus",
        kind: "shape",
        zIndex: 2,
        data: {
          sceneActor: {
            sceneKind: "apparatus-actor",
            assetId: "beaker-250ml",
            assetVersion: "asset-v1",
            sourceStateHash: "state-100",
            sequence: 3,
            runtimeLayers: ["glass-back", "liquid-body", "liquid-surface", "state-effects", "glass-front", "graduation", "interaction"],
            interactionPorts: ["beaker.opening", "beaker.spout"],
            geometry: {
              kind: "authored-cavity-perspective-ellipse",
              measurementUse: "forbidden",
              source: "visual-body-runtime-calibration",
              surface: { kind: "perspective-ellipse" },
            },
            liquid: {
              volumeL: 0.1,
              heightMm: 40,
              profileMaxHeightMm: 100,
              source: "observable-liquid-level",
              appearance: {
                status: "unavailable",
                source: "observable-optical-observation",
                reason: "fixture source state",
              },
            },
          },
        },
      },
      {
        id: "unrelated-node",
        kind: "text",
        zIndex: 20,
        data: { text: "untouched" },
      },
    ],
  };
}

describe("M6 visual stress fixture", () => {
  it("marks synthetic tint as visual-only while preserving world identity", () => {
    const result = applyM6VisualStressFixture(sourceState());
    const node = result.nodes.find((candidate) => candidate.id === "beaker-apparatus");
    const actor = node?.data.sceneActor as {
      sourceStateHash: string;
      liquid: { appearance: Record<string, unknown> };
    };

    expect(actor.sourceStateHash).toBe("state-100");
    expect(actor.liquid.appearance).toMatchObject({
      status: "observed",
      source: "m6-visual-stress-fixture",
      fixtureId: "beaker-100ml-blue",
      tintSrgb: [0.04, 0.32, 0.82],
      tintStrength: 0.82,
    });
    expect(result.nodes.find((candidate) => candidate.id === "unrelated-node")?.data.text)
      .toBe("untouched");
  });
});
