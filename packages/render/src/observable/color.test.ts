import { describe, expect, it } from "vitest";
import {
  INDICATOR_PALETTES,
  mapIndicatorRatioToTint,
} from "./color.js";

describe("indicator tint observable", () => {
  it("maps endpoints without claiming opacity or spectrophotometric meaning", () => {
    const colourless = mapIndicatorRatioToTint("phenolphthalein", 0);
    expect(colourless).toEqual({
      srgb: [245, 245, 245],
      strength: 0,
      interpolation: "qualitative-srgb",
    });
    expect("alpha" in colourless).toBe(false);

    const methylOrange = mapIndicatorRatioToTint("methyl-orange", Number.MAX_VALUE);
    expect(methylOrange.srgb).toEqual([248, 210, 54]);
    expect(methylOrange.strength).toBe(1);
    expect(methylOrange).toEqual({
      ...methylOrange,
      interpolation: "qualitative-srgb",
    });
  });

  it("changes continuously around the transition", () => {
    const below = mapIndicatorRatioToTint("phenolphthalein", 0.999);
    const at = mapIndicatorRatioToTint("phenolphthalein", 1);
    const above = mapIndicatorRatioToTint("phenolphthalein", 1.001);

    expect(Math.abs(at.srgb[0] - below.srgb[0])).toBeLessThan(1);
    expect(Math.abs(above.srgb[0] - at.srgb[0])).toBeLessThan(1);
    expect(at).not.toEqual(below);
    expect(at).not.toEqual(above);
  });

  it("selects a distinct empirical palette by indicator identity", () => {
    expect(
      mapIndicatorRatioToTint("phenolphthalein", 0),
    ).not.toEqual(mapIndicatorRatioToTint("methyl-orange", 0));
    expect(() => mapIndicatorRatioToTint("unknown-indicator", 0)).toThrow(RangeError);
  });

  it("returns frozen finite tint data and rejects invalid ratios", () => {
    const tint = mapIndicatorRatioToTint("phenolphthalein", 0.5);
    expect(Object.isFrozen(tint)).toBe(true);
    expect(Object.isFrozen(tint.srgb)).toBe(true);
    expect(tint.srgb.every(Number.isFinite)).toBe(true);
    expect(tint.strength).toBeGreaterThanOrEqual(0);
    expect(tint.strength).toBeLessThanOrEqual(1);
    expect(() => mapIndicatorRatioToTint("phenolphthalein", -1)).toThrow(RangeError);
    expect(() => mapIndicatorRatioToTint("phenolphthalein", Number.NaN)).toThrow(RangeError);
  });

  it("keeps endpoint strengths tied to the empirical indicator semantics", () => {
    expect(INDICATOR_PALETTES.phenolphthalein.acidForm.strength).toBe(0);
    expect(INDICATOR_PALETTES.phenolphthalein.baseForm.strength).toBe(1);
    expect(INDICATOR_PALETTES["methyl-orange"].acidForm.strength).toBe(1);
    expect(INDICATOR_PALETTES["methyl-orange"].baseForm.strength).toBe(1);
  });
});
