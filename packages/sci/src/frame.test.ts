import { describe, expect, it } from "vitest";
import {
  activity,
  activityCoefficient,
  ionicStrengthMolal,
  litre,
  mol,
  molPerKilogram,
  ph,
  reducedIonicStrength,
  reducedMolality,
  type ScientificState,
} from "@chemrealm/schema";
import { projectScientificFrame } from "./frame.js";
import { projectScientificState } from "./projection.js";

function scientificState(): ScientificState {
  return {
    species: [
      {
        symbol: "H+",
        reducedMolality: reducedMolality(0.1),
        molality: molPerKilogram(0.1),
        amount: mol(0.05),
        activityCoefficient: activityCoefficient(0.8),
        activity: activity(0.08),
      },
    ],
    ionicStrengthMolal: ionicStrengthMolal(0.2),
    ionicStrengthReduced: reducedIonicStrength(0.2),
    modelPh: ph(1.1),
    indicators: [],
    validity: {
      inDomain: true,
      withinProposedAccuracyEnvelope: true,
    },
    provenance: {
      modelId: "acidbase-monoprotic-davies",
      modelVersion: "1.0.0",
      activityModel: "Davies",
      category: "calculated",
      parameters: { Kw: 1e-14 },
    },
  };
}

describe("scientific projection frame", () => {
  it("creates projection identity and state together from one authoritative hash", () => {
    const state = scientificState();
    const frame = projectScientificFrame(state, {
      sourceStateHash: "world-state-42",
      liquidVolume: litre(0.5),
    });

    expect(frame.scientificState).toBe(state);
    expect(frame.sourceStateHash).toBe("world-state-42");
    expect(frame.projection.sourceStateHash).toBe("world-state-42");
    expect(Object.isFrozen(frame)).toBe(true);
  });

  it("does not allow a projection to be created without an authoritative identity", () => {
    expect(() =>
      projectScientificState(scientificState(), {
        sourceStateHash: "   ",
        liquidVolume: litre(0.5),
      }),
    ).toThrow(RangeError);
  });
});
