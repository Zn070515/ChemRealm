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

function frame(withAcidFamily = false) {
  const species = (symbol: string, value: number, gamma = 1) => ({
    symbol,
    reducedMolality: reducedMolality(value),
    molality: molPerKilogram(value),
    amount: mol(value * 0.25),
    activityCoefficient: activityCoefficient(gamma),
    activity: activity(value * gamma),
  });
  const state: ScientificState = {
    species: [
      species("H+", 0.1, 0.8),
      species("OH-", 1e-13, 0.8),
      species("HOAc", withAcidFamily ? 0.06 : 0),
      species("OAc-", withAcidFamily ? 0.04 : 0, 0.8),
      species("Na+", 0.02, 0.8),
      species("Cl-", 0.12, 0.8),
    ],
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
      parameters: {
        Kw: 1e-14,
        Ka_HOAc: 1.7539e-5,
        Davies_A: 0.509,
        Davies_b: 0.3,
      },
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
    expect(expressions).toHaveLength(5);
    expect(expressions[0]).toMatchObject({
      producerId: "scientific-core",
      producerVersion: "3.0.0",
      label: "exact",
      sourceStateHash: "world-state-44",
      modelId: "acidbase-monoprotic-davies",
      equationId: "charge-balance",
    });
    expect(expressions[0]?.formula).toContain("m(H+)");
    expect(expressions[0]?.expression).toContain("0.1");
    expect(expressions[0]?.substitutions).toEqual(
      expect.arrayContaining([{ symbol: "m(H+)", value: 0.1, unit: "mol/kg" }]),
    );
    expect(expressions[1]?.equationId).toBe("water-autoprotolysis");
    expect(expressions[1]?.omittedTerms).toContain(
      "non-unit water activity is not modeled in the v0 unit-water-activity convention",
    );
    expect(expressions.map((entry) => entry.equationId)).toEqual([
      "charge-balance",
      "water-autoprotolysis",
      "ionic-strength-fixed-point",
      "davies-activity-coefficient",
      "activity-definition",
    ]);
    expect(expressions[2]?.formula).toContain("I(species) - I = 0");
    expect(expressions[2]?.substitutions).toEqual(
      expect.arrayContaining([
        { symbol: "I(species)", value: 0.2, unit: "mol/kg" },
        { symbol: "I", value: 0.2, unit: "mol/kg" },
      ]),
    );
    expect(expressions[3]?.formula).toContain("log10(γ_i)");
    expect(expressions[3]?.substitutions).toEqual(
      expect.arrayContaining([
        { symbol: "I", value: 0.2, unit: "mol/kg" },
        { symbol: "γ(H+)", value: 0.8, unit: "1" },
      ]),
    );
    expect(expressions[4]?.formula).toBe("a_i = γ_i · m̂_i");
    expect(expressions[4]?.substitutions).toEqual(
      expect.arrayContaining([
        { symbol: "m̂(H+)", value: 0.1, unit: "1" },
        { symbol: "γ(H+)", value: 0.8, unit: "1" },
        { symbol: "a(H+)", value: 0.08000000000000002, unit: "1" },
      ]),
    );
    expect(Object.isFrozen(expressions)).toBe(true);
    expect(Object.isFrozen(expressions[0])).toBe(true);
    expect(Object.isFrozen(expressions[0]?.substitutions)).toBe(true);
    expect(Object.isFrozen(expressions[1]?.omittedTerms)).toBe(true);
    expect(() => {
      (expressions[0]?.substitutions as Array<unknown>).push({});
    }).toThrow();
  });

  it("emits acid-family equilibrium and balance equations when that family is present", () => {
    const expressions = createScientificExpressions(frame(true));

    expect(expressions.map((entry) => entry.equationId)).toEqual([
      "charge-balance",
      "water-autoprotolysis",
      "ionic-strength-fixed-point",
      "davies-activity-coefficient",
      "activity-definition",
      "acid-family-equilibrium",
      "acid-family-balance",
    ]);
    expect(expressions[5]?.formula).toBe("Ka_HOAc = a(H+) · a(OAc-) / a(HOAc)");
    expect(expressions[5]?.substitutions).toEqual(
      expect.arrayContaining([
        { symbol: "Ka_HOAc", value: 1.7539e-5, unit: "1" },
        { symbol: "a(OAc-)", value: 0.032, unit: "1" },
      ]),
    );
    expect(expressions[6]?.expression).toContain("m_A,total");
  });
});
