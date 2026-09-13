import { describe, expect, it } from "vitest";
import { litre } from "@chemrealm/schema";
import { deriveBuretteState } from "./burette.js";

describe("burette observable", () => {
  it("separates scale reading, delivered volume, and contained volume", () => {
    const state = deriveBuretteState({
      sourceStateHash: "state-0",
      sequence: 0,
      initialScaleReading: litre(0),
      initialContainedVolume: litre(0.05),
      deliveredVolumes: [litre(0.01), litre(0.015), litre(0.005)],
    });
    expect(state.currentScaleReading).toBeCloseTo(0.03, 15);
    expect(state.deliveredVolume).toBeCloseTo(0.03, 15);
    expect(state.containedVolume).toBeCloseTo(0.02, 15);
  });

  it("allows a full draw and returns semantic zero", () => {
    expect(
      deriveBuretteState({
        sourceStateHash: "state-0",
        sequence: 0,
        initialScaleReading: litre(0),
        initialContainedVolume: litre(0.05),
        deliveredVolumes: [litre(0.02), litre(0.03)],
      }),
    ).toMatchObject({ currentScaleReading: 0.05, containedVolume: 0 });
  });

  it("treats a compensated floating-point full draw as exact semantic zero", () => {
    expect(
      deriveBuretteState({
        sourceStateHash: "state-0",
        sequence: 0,
        initialScaleReading: litre(0),
        initialContainedVolume: litre(0.3),
        deliveredVolumes: [litre(0.1), litre(0.1), litre(0.1)],
      }),
    ).toMatchObject({
      currentScaleReading: 0.3,
      deliveredVolume: 0.3,
      containedVolume: 0,
    });
  });

  it("does not turn a genuine near-boundary overdraw into a full draw", () => {
    expect(() =>
      deriveBuretteState({
        sourceStateHash: "state-0",
        sequence: 0,
        initialScaleReading: litre(0),
        initialContainedVolume: litre(0.3),
        deliveredVolumes: [litre(0.1), litre(0.1), litre(0.1000000001)],
      }),
    ).toThrow(RangeError);
  });

  it("rejects a delivery sequence that overdraws the burette", () => {
    expect(() =>
      deriveBuretteState({
        sourceStateHash: "state-0",
        sequence: 0,
        initialScaleReading: litre(0),
        initialContainedVolume: litre(0.05),
        deliveredVolumes: [litre(0.04), litre(0.02)],
      }),
    ).toThrow(RangeError);
  });
});
