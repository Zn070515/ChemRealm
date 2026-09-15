import { describe, expect, it } from "vitest";

import { TITRATION_BENCH_ASSET } from "../assets/titration-bench.js";
import { TITRATION_LOGICAL_SIZE, TITRATION_RENDER_TOKENS } from "./tokens.js";

describe("M6 Pixi renderer boundary", () => {
  it("keeps the visual adapter on a fixed logical canvas and renderer tokens", () => {
    expect(TITRATION_LOGICAL_SIZE).toEqual({ width: 1200, height: 760 });
    expect(TITRATION_BENCH_ASSET.coordinateUnit).toBe("mm");
    expect(TITRATION_RENDER_TOKENS.liquidNeutral).not.toBe(0);
  });

  it("does not make a refusal state imply an indicator tint", () => {
    // The renderer reads tint only from the render-node data. The asset token
    // set contains neutral materials, but no indicator endpoint palette.
    expect(TITRATION_RENDER_TOKENS).not.toHaveProperty("phenolphthalein");
    expect(TITRATION_RENDER_TOKENS).not.toHaveProperty("methylOrange");
  });
});
