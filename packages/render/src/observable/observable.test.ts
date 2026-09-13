import { describe, expect, it } from "vitest";
import { litre, millimetre, taughtHydrogenIonExponent } from "@chemrealm/schema";
import { buildObservableModel, type ObservableInput } from "./index.js";
import { scientificState } from "../../test/fixtures.js";

function input(): ObservableInput {
  return {
    scientificState: scientificState(),
    projection: {
      taughtHydrogenIonExponent: taughtHydrogenIonExponent(2),
    },
    liquidVolume: litre(0.5),
    volumeProfile: {
      maxVolume: litre(1),
      heightAtVolume: () => millimetre(20),
    },
    burette: {
      initialVolume: litre(0.05),
      deliveredVolumes: [litre(0.01)],
    },
    curveFrames: [],
    symbolicLines: [],
  };
}

describe("observable model", () => {
  it("composes pure transforms and preserves the accuracy qualification", () => {
    const model = buildObservableModel(input());
    expect(model.readouts.taughtPh).toBe("pH 2.00");
    expect(model.readouts.modelPh).toContain("model pH (Davies)");
    expect(model.readouts.withinProposedAccuracyEnvelope).toBe(true);
    expect(model.buretteReading).toBe(0.04);
  });

  it("is deterministic, frozen, and does not mutate its input", () => {
    const source = input();
    const first = buildObservableModel(source);
    const second = buildObservableModel(source);
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.indicators)).toBe(true);
    expect(Object.isFrozen(first.readouts)).toBe(true);
    expect(source.scientificState.indicators[0]?.protonationRatio).toBe(0.5);
  });
});
