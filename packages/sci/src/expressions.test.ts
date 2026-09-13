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
import { createScientificExpressions } from "./expressions.js";
import { projectScientificFrame } from "./frame.js";

function frame() {
  const state: ScientificState = {
    species: [{
      symbol: "H+",
      reducedMolality: reducedMolality(0.1),
      molality: molPerKilogram(0.1),
      amount: mol(0.05),
      activityCoefficient: activityCoefficient(0.8),
      activity: activity(0.08),
    }],
    ionicStrengthMolal: ionicStrengthMolal(0.2),
    ionicStrengthReduced: reducedIonicStrength(0.2),
    modelPh: ph(1.1),
    indicators: [],
    validity: { inDomain: true, withinProposedAccuracyEnvelope: true },
    provenance: {
      modelId: "acidbase-monoprotic-davies",
      modelVersion: "1.0.0",
      activityModel: "Davies",
      category: "calculated",
      parameters: { Kw: 1e-14 },
    },
  };
  return projectScientificFrame(state, {
    sourceStateHash: "world-state-44",
    sequence: 9,
    liquidVolume: litre(0.5),
    volumeProfileHash: "sha256:profile-44",
  });
}

describe("Scientific Core expression producer", () => {
  it("creates identity-bearing expressions from a bound frame", () => {
    const expressions = createScientificExpressions(frame());
    expect(expressions).toHaveLength(1);
    expect(expressions[0]).toMatchObject({
      producerId: "scientific-core",
      producerVersion: "1.0.0",
      label: "exact",
      sourceStateHash: "world-state-44",
      modelId: "acidbase-monoprotic-davies",
    });
    expect(Object.isFrozen(expressions)).toBe(true);
    expect(Object.isFrozen(expressions[0])).toBe(true);
  });
});
