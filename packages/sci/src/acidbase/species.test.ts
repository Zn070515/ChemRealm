import { describe, expect, it } from "vitest";
import {
  reducedMolality,
  type ReducedMolality,
} from "@chemrealm/schema";
import {
  chargeResidualFromSpecies,
  ionicStrengthFromSpecies,
  type ReducedSpeciesMolalities,
} from "./species.js";

function species(values: readonly number[]): ReducedSpeciesMolalities {
  const [hydrogen, hydroxide, neutralAcid, conjugateBase, sodium, chloride] = values;
  return {
    hydrogen: reducedMolality(hydrogen!),
    hydroxide: reducedMolality(hydroxide!),
    neutralAcid: reducedMolality(neutralAcid!),
    conjugateBase: reducedMolality(conjugateBase!),
    sodium: reducedMolality(sodium!),
    chloride: reducedMolality(chloride!),
  };
}

describe("reduced species algebra", () => {
  it("computes ionic strength from charged species only", () => {
    expect(ionicStrengthFromSpecies(species([0.1, 0.01, 0.2, 0.03, 0.05, 0.04])).value).toBe(
      0.115,
    );
  });

  it("computes signed charge residual without rounding", () => {
    expect(chargeResidualFromSpecies(species([0.1, 0.01, 0.2, 0.03, 0.05, 0.04]))).toBe(
      0.07,
    );
  });

  it("ignores neutral acid in both charge and ionic-strength sums", () => {
    const withoutNeutral = species([0.1, 0.01, 0, 0.03, 0.05, 0.04]);
    const withNeutral = species([0.1, 0.01, 10, 0.03, 0.05, 0.04]);

    expect(ionicStrengthFromSpecies(withNeutral)).toEqual(
      ionicStrengthFromSpecies(withoutNeutral),
    );
    expect(chargeResidualFromSpecies(withNeutral)).toBe(
      chargeResidualFromSpecies(withoutNeutral),
    );
  });

  it.each([
    ["negative", -1],
    ["NaN", Number.NaN],
    ["infinity", Number.POSITIVE_INFINITY],
  ])("rejects %s species molality", (_name, value) => {
    const invalid: ReducedSpeciesMolalities = {
      ...species([0, 0, 0, 0, 0, 0]),
      hydrogen: { value } as ReducedMolality,
    };

    expect(() => ionicStrengthFromSpecies(invalid)).toThrow(RangeError);
    expect(() => chargeResidualFromSpecies(invalid)).toThrow(RangeError);
  });
});
