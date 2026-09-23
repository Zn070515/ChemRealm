import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

  it("keeps beaker cavity ownership in generated calibration and restores front detail after liquid", () => {
    const source = readFileSync(resolve(process.cwd(), "packages/render/src/pixi/renderer.ts"), "utf8");

    expect(source).toContain("BEAKER_FRONT_DETAIL_ASSET_URL");
    expect(source).toContain("root.addChild(frontDetail)");
    expect(source).toContain("useBackBuffer: true");
    expect(source).toContain("const bodyFrame = BEAKER_BODY_SPRITE_FRAME;");
    expect(source).not.toContain("const bodyFrame = Object.freeze({");
    expect(source).not.toMatch(/const\s+cavityTop\s*=/);
    expect(source).not.toMatch(/const\s+cavityBottom\s*=/);
    expect(source).not.toMatch(/body\.alpha\s*=/);
  });
});
