import { describe, expect, it } from "vitest";
import {
  INDICATOR_COLOUR_PALETTES,
  mapIndicatorRatioToColor,
} from "./color.js";

describe("indicator colour observable", () => {
  it("maps the acid and base endpoints without a threshold branch", () => {
    expect(mapIndicatorRatioToColor("phenolphthalein", 0)).toEqual(
      INDICATOR_COLOUR_PALETTES.phenolphthalein.acidForm,
    );
    expect(mapIndicatorRatioToColor("methyl-orange", Number.MAX_VALUE)).toEqual(
      INDICATOR_COLOUR_PALETTES["methyl-orange"].baseForm,
    );
  });

  it("changes continuously around the transition", () => {
    const below = mapIndicatorRatioToColor("phenolphthalein", 0.999);
    const at = mapIndicatorRatioToColor("phenolphthalein", 1);
    const above = mapIndicatorRatioToColor("phenolphthalein", 1.001);

    expect(Math.abs(at.red - below.red)).toBeLessThan(1);
    expect(Math.abs(above.red - at.red)).toBeLessThan(1);
    expect(at).not.toEqual(below);
    expect(at).not.toEqual(above);
  });

  it("selects a distinct empirical palette by indicator identity", () => {
    expect(
      mapIndicatorRatioToColor("phenolphthalein", 0),
    ).not.toEqual(mapIndicatorRatioToColor("methyl-orange", 0));
    expect(() => mapIndicatorRatioToColor("unknown-indicator", 0)).toThrow(RangeError);
  });

  it("returns frozen finite colour data and rejects invalid ratios", () => {
    const color = mapIndicatorRatioToColor("phenolphthalein", 0.5);
    expect(Object.isFrozen(color)).toBe(true);
    expect(Object.values(color).every(Number.isFinite)).toBe(true);
    expect(() => mapIndicatorRatioToColor("phenolphthalein", -1)).toThrow(RangeError);
    expect(() => mapIndicatorRatioToColor("phenolphthalein", Number.NaN)).toThrow(RangeError);
  });
});
