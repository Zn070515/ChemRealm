import { describe, expect, it } from "vitest";
import { litre, ph, taughtHydrogenIonExponent } from "@chemrealm/schema";
import { buildCurve, type CurveFrame } from "./curve.js";

describe("pH-volume curve observable", () => {
  const frames: CurveFrame[] = [
    {
      volume: litre(0),
      taughtHydrogenIonExponent: taughtHydrogenIonExponent(1),
      modelPh: ph(1.1),
    },
    {
      volume: litre(0.025),
      taughtHydrogenIonExponent: taughtHydrogenIonExponent(2),
      modelPh: ph(2.1),
    },
  ];

  it("preserves the ordered values supplied by scientific projection", () => {
    const curve = buildCurve(frames);
    expect(curve.map((point) => point.volume)).toEqual([0, 0.025]);
    expect(curve.map((point) => point.taughtHydrogenIonExponent.value)).toEqual([1, 2]);
    expect(curve.map((point) => point.modelPh.value)).toEqual([1.1, 2.1]);
  });

  it("copies and freezes the sequence without mutating the input", () => {
    const curve = buildCurve(frames);
    expect(curve).not.toBe(frames);
    expect(Object.isFrozen(curve)).toBe(true);
    expect(Object.isFrozen(curve[0])).toBe(true);
    expect(Object.isFrozen(curve[0]?.modelPh)).toBe(true);
    expect(curve[0]?.modelPh).not.toBe(frames[0]?.modelPh);
    expect(frames[0]?.volume).toBe(0);
  });
});
