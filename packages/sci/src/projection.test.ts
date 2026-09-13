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
import { projectScientificState } from "./projection.js";

function state(
  hydrogenAmount = 0.05,
  hydrogenMolality = 0.1,
): ScientificState {
  return {
    species: [
      {
        symbol: "H+",
        reducedMolality: reducedMolality(hydrogenMolality),
        molality: molPerKilogram(hydrogenMolality),
        amount: mol(hydrogenAmount),
        activityCoefficient: activityCoefficient(0.8),
        activity: activity(0.16),
      },
    ],
    ionicStrengthMolal: ionicStrengthMolal(0.2),
    ionicStrengthReduced: reducedIonicStrength(0.2),
    modelPh: ph(1.1064),
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

describe("scientific projection", () => {
  it("derives molarity from hydrogen amount and solution volume", () => {
    const scientificState = state(0.05, 0.1);
    const projection = projectScientificState(scientificState, {
      liquidVolume: litre(0.5),
      sourceStateHash: "state-a",
    });

    expect(projection.sourceStateHash).toBe("state-a");
    expect(projection.hydrogenIonMolarity).toBeCloseTo(0.1, 15);
    expect(projection.taughtHydrogenIonExponent.value).toBeCloseTo(1, 14);
    expect(scientificState.modelPh.value).toBeCloseTo(1.1064, 4);
    expect(projection.taughtHydrogenIonExponent.value).not.toBe(
      scientificState.modelPh.value,
    );
  });

  it("does not substitute molality for amount when projecting concentration", () => {
    const projection = projectScientificState(state(0.05, 0.2), {
      liquidVolume: litre(0.5),
      sourceStateHash: "state-b",
    });

    expect(projection.hydrogenIonMolarity).toBeCloseTo(0.1, 15);
    expect(projection.taughtHydrogenIonExponent.value).toBeCloseTo(1, 14);
  });

  it("returns a frozen projection without mutating scientific state", () => {
    const scientificState = state();
    const species = scientificState.species;
    const projection = projectScientificState(scientificState, {
      liquidVolume: litre(0.5),
      sourceStateHash: "state-c",
    });

    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.keys(projection)).toEqual([
      "sourceStateHash",
      "hydrogenIonMolarity",
      "taughtHydrogenIonExponent",
    ]);
    expect(scientificState.species).toBe(species);
    expect(scientificState.species[0]?.amount).toBe(0.05);
  });

  it.each([
    ["zero volume", state(), { liquidVolume: litre(0), sourceStateHash: "invalid" }],
    ["zero hydrogen amount", state(0), { liquidVolume: litre(0.5), sourceStateHash: "invalid" }],
    ["missing hydrogen species", { ...state(), species: [] }, { liquidVolume: litre(0.5), sourceStateHash: "invalid" }],
    [
      "duplicate hydrogen species",
      { ...state(), species: [...state().species, ...state().species] },
      { liquidVolume: litre(0.5), sourceStateHash: "invalid" },
    ],
  ])("rejects %s rather than producing a projection", (_label, scientificState, input) => {
    expect(() => projectScientificState(scientificState, input)).toThrow(RangeError);
  });
});
