import { describe, expect, it } from "vitest";
import {
  activity,
  activityCoefficient,
  ionicStrengthMolal,
  kelvin,
  litre,
  mol,
  molPerKilogram,
  ph,
  reducedIonicStrength,
  reducedMolality,
  type ScientificState,
  TEST_MODEL_VERSION,
} from "@chemrealm/schema";
import { projectScientificFrame } from "./frame.js";
import { projectScientificState } from "./projection.js";
import { detLog10 } from "./deterministic-math.js";

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
    indicatorObservations: [],
    validity: {
      inDomain: true,
      withinProposedAccuracyEnvelope: true,
    },
    provenance: {
      modelId: "acidbase-monoprotic-davies",
      modelVersion: TEST_MODEL_VERSION,
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
      sequence: 7,
      liquidVolume: litre(0.5),
      volumeProfileHash: "sha256:profile-42",
      temperature: kelvin(298.15),
      solvent: "water",
      opticalProfiles: [],
    });

    expect(frame.scientificState).not.toBe(state);
    expect(frame.sourceStateHash).toBe("world-state-42");
    expect(frame.sequence).toBe(7);
    expect(frame.projection.sourceStateHash).toBe("world-state-42");
    expect(frame.physical.liquidVolume).toBe(0.5);
    expect(frame.physical.volumeProfileHash).toBe("sha256:profile-42");
    expect(Object.isFrozen(frame.physical)).toBe(true);
    expect(Object.isFrozen(frame)).toBe(true);
  });

  it("uses the frame-owned physical volume for the taught projection", () => {
    const frame = projectScientificFrame(scientificState(), {
      sourceStateHash: "world-state-volume",
      sequence: 10,
      liquidVolume: litre(0.25),
      volumeProfileHash: "sha256:profile-volume",
      temperature: kelvin(298.15),
      solvent: "water",
      opticalProfiles: [],
    });

    expect(frame.projection.taughtHydrogenIonExponent.value).toBeCloseTo(
      -detLog10(0.2),
      12,
    );
    expect(frame.physical.liquidVolume).toBe(0.25);
  });

  it("deep-freezes the scientific payload crossing the frame boundary", () => {
    const frame = projectScientificFrame(scientificState(), {
      sourceStateHash: "world-state-43",
      sequence: 8,
      liquidVolume: litre(0.5),
      volumeProfileHash: "sha256:profile-43",
      temperature: kelvin(298.15),
      solvent: "water",
      opticalProfiles: [],
    });

    expect(Object.isFrozen(frame.scientificState)).toBe(true);
    expect(Object.isFrozen(frame.scientificState.species)).toBe(true);
    expect(Object.isFrozen(frame.scientificState.species[0])).toBe(true);
    expect(() => {
      (frame.scientificState.species as Array<unknown>).push({});
    }).toThrow();
  });

  it("does not allow a projection to be created without an authoritative identity", () => {
    expect(() =>
      projectScientificState(scientificState(), {
        sourceStateHash: "   ",
        liquidVolume: litre(0.5),
      }),
    ).toThrow(RangeError);
  });

  it("rejects malformed profile identity at the frame boundary", () => {
    expect(() => projectScientificFrame(scientificState(), {
      sourceStateHash: "world-state-invalid-profile",
      sequence: 11,
      liquidVolume: litre(0.5),
      volumeProfileHash: undefined as never,
      temperature: kelvin(298.15),
      solvent: "water",
      opticalProfiles: [],
    })).toThrow(RangeError);
  });

  it("freezes the optical profile/path context at the frame boundary", () => {
    const frame = projectScientificFrame(scientificState(), {
      sourceStateHash: "world-state-optics",
      sequence: 12,
      liquidVolume: litre(0.5),
      volumeProfileHash: "sha256:profile-optics",
      temperature: kelvin(298.15),
      solvent: "water",
      opticalProfiles: [],
    });

    expect(frame.physical.optical).toEqual({ path: undefined, profiles: [] });
    expect(Object.isFrozen(frame.physical.optical)).toBe(true);
  });
});
