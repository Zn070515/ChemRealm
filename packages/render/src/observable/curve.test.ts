import { describe, expect, it } from "vitest";
import { litre, ph, taughtHydrogenIonExponent } from "@chemrealm/schema";
import { buildCurve, type CurveFrame } from "./curve.js";

describe("pH-volume curve observable", () => {
  const frames: CurveFrame[] = [
    {
      sourceStateHash: "world-state-42",
      sequence: 0,
      modelId: "acidbase-monoprotic-davies",
      modelVersion: "1.0.0",
      deliveredTitrantVolume: litre(0),
      taughtHydrogenIonExponent: taughtHydrogenIonExponent(1),
      modelPh: ph(1.1),
    },
    {
      sourceStateHash: "world-state-43",
      sequence: 1,
      modelId: "acidbase-monoprotic-davies",
      modelVersion: "1.0.0",
      deliveredTitrantVolume: litre(0.025),
      taughtHydrogenIonExponent: taughtHydrogenIonExponent(2),
      modelPh: ph(2.1),
    },
  ];

  it("preserves the ordered values supplied by scientific projection", () => {
    const curve = buildCurve(frames);
    expect(curve.map((point) => point.deliveredTitrantVolume)).toEqual([0, 0.025]);
    expect(curve.map((point) => point.sourceStateHash)).toEqual(["world-state-42", "world-state-43"]);
    expect(curve.map((point) => point.sequence)).toEqual([0, 1]);
    expect(curve.map((point) => point.taughtHydrogenIonExponent.value)).toEqual([1, 2]);
    expect(curve.map((point) => point.modelPh.value)).toEqual([1.1, 2.1]);
  });

  it("rejects a frame without a source identity", () => {
    expect(() => buildCurve([
      { ...frames[0]!, sourceStateHash: "   " },
    ])).toThrow(/source state hash/);
  });

  it("rejects a frame without a solver identity", () => {
    expect(() => buildCurve([
      { ...frames[0]!, modelId: "   " },
    ])).toThrow(/solver identity/);
  });

  it("rejects a curve that is not in committed sequence order", () => {
    expect(() => buildCurve([
      frames[0]!,
      { ...frames[1]!, sequence: 0 },
    ])).toThrow(/strictly increasing/);
  });

  it("copies and freezes the sequence without mutating the input", () => {
    const curve = buildCurve(frames);
    expect(curve).not.toBe(frames);
    expect(Object.isFrozen(curve)).toBe(true);
    expect(Object.isFrozen(curve[0])).toBe(true);
    expect(Object.isFrozen(curve[0]?.modelPh)).toBe(true);
    expect(curve[0]?.modelPh).not.toBe(frames[0]?.modelPh);
    expect(frames[0]?.deliveredTitrantVolume).toBe(0);
  });
});
