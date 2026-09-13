import { describe, expect, it } from "vitest";
import {
  INDICATOR_COLOUR_TOKENS,
  mapIndicatorRatioToColor,
} from "./color.js";

describe("indicator colour observable", () => {
  it("maps the acid and base endpoints without a threshold branch", () => {
    expect(mapIndicatorRatioToColor(0)).toEqual(INDICATOR_COLOUR_TOKENS.acidForm);
    expect(mapIndicatorRatioToColor(Number.MAX_VALUE)).toEqual(
      INDICATOR_COLOUR_TOKENS.baseForm,
    );
  });

  it("changes continuously around the transition", () => {
    const below = mapIndicatorRatioToColor(0.999);
    const at = mapIndicatorRatioToColor(1);
    const above = mapIndicatorRatioToColor(1.001);

    expect(Math.abs(at.red - below.red)).toBeLessThan(1);
    expect(Math.abs(above.red - at.red)).toBeLessThan(1);
    expect(at).not.toEqual(below);
    expect(at).not.toEqual(above);
  });

  it("returns frozen finite colour data and rejects invalid ratios", () => {
    const color = mapIndicatorRatioToColor(0.5);
    expect(Object.isFrozen(color)).toBe(true);
    expect(Object.values(color).every(Number.isFinite)).toBe(true);
    expect(() => mapIndicatorRatioToColor(-1)).toThrow(RangeError);
    expect(() => mapIndicatorRatioToColor(Number.NaN)).toThrow(RangeError);
  });
});
