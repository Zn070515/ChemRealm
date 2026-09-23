import { describe, expect, it } from "vitest";

import {
  assertBeakerLayeredCompositionPlan,
  BEAKER_BODY_SPRITE_FRAME,
  BEAKER_LAYER_ORDER,
  buildBeakerLayeredCompositionPlan,
} from "./beaker-layered-compositor.js";

describe("beaker layered compositor contract", () => {
  it("has one declared sprite frame for the authored body and front detail", () => {
    expect(BEAKER_BODY_SPRITE_FRAME).toEqual({
      left: 760,
      top: 290,
      width: 250,
      height: 300,
    });
  });

  it("keeps a single declared visual layer order and never becomes measurement geometry", () => {
    const plan = buildBeakerLayeredCompositionPlan(0.4, "observed");

    expect(plan.layerOrder).toEqual([
      "backBody",
      "liquidBody",
      "surface",
      "frontDetail",
      "graduations",
      "interaction",
    ]);
    expect(plan.layerOrder).toBe(BEAKER_LAYER_ORDER);
    expect(plan.measurementUse).toBe("forbidden");
    assertBeakerLayeredCompositionPlan(plan);
  });

  it("clamps only the visual fill and preserves optical refusal status", () => {
    const plan = buildBeakerLayeredCompositionPlan(2, "unavailable");

    expect(plan.fillFraction).toBe(1);
    expect(plan.opticalStatus).toBe("unavailable");
    expect(plan.sourceManifestSha256).toMatch(/^sha256:/);
    expect(plan.calibrationSha256).toMatch(/^sha256:/);
  });
});
