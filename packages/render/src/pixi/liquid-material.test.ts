import { describe, expect, it } from "vitest";

import {
  BEAKER_LIQUID_FRAGMENT_GLSL,
  buildBeakerLiquidMaterialInput,
  type BeakerLiquidMaterialActor,
} from "./liquid-material.js";

function actor(
  appearance: BeakerLiquidMaterialActor["liquid"]["appearance"],
): BeakerLiquidMaterialActor {
  return {
    liquid: { appearance },
  };
}

describe("beaker GPU liquid material boundary", () => {
  it("passes through only an admitted optical tint", () => {
    const material = buildBeakerLiquidMaterialInput(actor({
      status: "observed",
      source: "observable-optical-observation",
      indicatorId: "phenolphthalein",
      tintSrgb: [0.22, 0.56, 0.92],
      tintStrength: 0.74,
    }));

    expect(material).toMatchObject({
      opticalStatus: "observed",
      tintSrgb: [0.22, 0.56, 0.92],
      tintStrength: 0.74,
    });
    expect(material).not.toHaveProperty("indicatorId");
  });

  it("uses a neutral refusal material when optical data is unavailable", () => {
    const material = buildBeakerLiquidMaterialInput(actor({
      status: "unavailable",
      source: "observable-optical-observation",
      reason: "optical profile is unavailable",
    }));

    expect(material.opticalStatus).toBe("unavailable");
    expect(material.tintStrength).toBe(0);
    expect(material.tintSrgb).not.toEqual([0.22, 0.56, 0.92]);
  });

  it("keeps the fragment program chemistry-blind and non-palette-based", () => {
    expect(BEAKER_LIQUID_FRAGMENT_GLSL).toContain("uTintStrength");
    expect(BEAKER_LIQUID_FRAGMENT_GLSL).toContain("uWallBand");
    expect(BEAKER_LIQUID_FRAGMENT_GLSL).toContain("uBottomBand");
    expect(BEAKER_LIQUID_FRAGMENT_GLSL).toContain("uSurfaceRing");
    expect(BEAKER_LIQUID_FRAGMENT_GLSL).toContain("uTransmission");
    expect(BEAKER_LIQUID_FRAGMENT_GLSL).not.toContain("indicatorId");
    expect(BEAKER_LIQUID_FRAGMENT_GLSL).not.toMatch(/phenolphthalein|methyl-orange|methylOrange/i);
    expect(BEAKER_LIQUID_FRAGMENT_GLSL).not.toMatch(/\bpH\b|\bKa\b|\bKw\b|\bspecies\b|\bequilibrium\b/i);
  });
});
