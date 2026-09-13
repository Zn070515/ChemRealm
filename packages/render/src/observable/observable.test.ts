import { describe, expect, it } from "vitest";
import { litre, millimetre, taughtHydrogenIonExponent } from "@chemrealm/schema";
import { buildObservableModel, type ObservableInput } from "./index.js";
import { scientificState } from "../../test/fixtures.js";

function input(): ObservableInput {
  return {
    frame: {
      sourceStateHash: "state-hash",
      scientificState: scientificState(),
      projection: {
        sourceStateHash: "state-hash",
        taughtHydrogenIonExponent: taughtHydrogenIonExponent(2),
      },
    },
    liquidVolume: litre(0.5),
    volumeProfile: {
      maxVolume: litre(1),
      roundTripTolerance: litre(1e-12),
      heightAtVolume: () => millimetre(20),
      volumeAtHeight: () => litre(0.5),
    },
    burette: {
      initialScaleReading: litre(0),
      initialContainedVolume: litre(0.05),
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
    expect(model.burette?.currentScaleReading).toBe(0.01);
    expect(model.burette?.containedVolume).toBe(0.04);
  });

  it("is deterministic, frozen, and does not mutate its input", () => {
    const source = input();
    const first = buildObservableModel(source);
    const second = buildObservableModel(source);
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.indicators)).toBe(true);
    expect(Object.isFrozen(first.readouts)).toBe(true);
    expect(source.frame.scientificState.indicators[0]?.protonationRatio).toBe(0.5);
  });

  it("rejects a projection from a different source-state identity", () => {
    expect(() =>
      buildObservableModel({
        ...input(),
        frame: {
          ...input().frame,
          projection: {
            ...input().frame.projection,
            sourceStateHash: "other-state",
          },
        },
      }),
    ).toThrow(/source identities differ/);
  });

  it("uses the declared identity when presenting multiple indicator palettes", () => {
    const source = input();
    const withMethylOrange: ObservableInput = {
      ...source,
      frame: {
        ...source.frame,
        scientificState: {
          ...source.frame.scientificState,
          indicators: [
            ...source.frame.scientificState.indicators,
            { indicatorId: "methyl-orange", protonationRatio: 0.5 },
          ],
        },
      },
    };

    const model = buildObservableModel(withMethylOrange);
    expect(model.indicators).toHaveLength(2);
    expect(model.indicators[0]?.color).not.toEqual(model.indicators[1]?.color);
  });
});
