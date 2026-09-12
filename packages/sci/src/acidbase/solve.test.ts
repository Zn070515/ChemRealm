import { describe, expect, it } from "vitest";
import { activity, reducedMolality } from "@chemrealm/schema";
import { daviesActivities } from "./activity.js";
import { DEFAULT_ACID_BASE_CONSTANTS } from "./model.js";
import { solveReduced, type ReducedSolveSuccess } from "./solve.js";
import {
  chargeResidualFromSpecies,
  ionicStrengthFromSpecies,
} from "./species.js";
import type { AcidBaseComponentTotals } from "./catalog.js";

function totals(
  strongAcidChlorideMolality: number,
  strongBaseSodiumMolality: number,
  totalAcidFamilyMolality = 0,
): AcidBaseComponentTotals {
  return {
    strongAcidChlorideMolality: reducedMolality(strongAcidChlorideMolality),
    strongBaseSodiumMolality: reducedMolality(strongBaseSodiumMolality),
    totalAcidFamilyMolality: reducedMolality(totalAcidFamilyMolality),
  };
}

function expectSuccess(
  value: ReturnType<typeof solveReduced>,
): ReducedSolveSuccess {
  if ("kind" in value) throw new Error(`solve failed: ${value.kind}`);
  return value;
}

function expectSelfConsistent(result: ReducedSolveSuccess): void {
  const recomputedIonicStrength = ionicStrengthFromSpecies(result.species);
  expect(result.ionicStrength.value).toBeCloseTo(recomputedIonicStrength.value, 14);
  expect(Math.abs(result.chargeResidual)).toBeLessThan(1e-14);
  expect(Math.abs(chargeResidualFromSpecies(result.species))).toBeLessThan(1e-14);
}

describe("nested reduced acid-base solve", () => {
  it.each([
    ["strong acid excess", totals(0.1, 0), "acid"],
    ["strong base excess", totals(0, 0.1), "base"],
    ["weak-acid buffer", totals(0, 0.1, 0.1), "buffer"],
    ["very dilute acetic acid", totals(0, 0, 1e-6), "dilute"],
    ["pre-equivalence", totals(0.1, 0.05, 0.1), "pre-equivalence"],
    ["equivalence", totals(0, 0.1, 0.1), "equivalence"],
    ["post-equivalence", totals(0, 0.2, 0.1), "post-equivalence"],
  ])("solves %s with a self-consistent state", (_label, input, _caseName) => {
    const result = expectSuccess(
      solveReduced({ totals: input, constants: DEFAULT_ACID_BASE_CONSTANTS }),
    );

    expectSelfConsistent(result);
    expect(result.ionicStrength.value).toBeGreaterThanOrEqual(0);
    expect(result.ionicStrength.value).toBeLessThanOrEqual(0.5);
    expect(result.iterations.outer).toBeGreaterThan(0);
    expect(result.iterations.inner).toBeGreaterThan(0);
  });

  it("keeps weak-acid family mass balanced while adding fully dissociated acetate", () => {
    const input = totals(0, 0.1, 0.2);
    const result = expectSuccess(
      solveReduced({ totals: input, constants: DEFAULT_ACID_BASE_CONSTANTS }),
    );
    const { species } = result;

    expect(species.neutralAcid.value + species.conjugateBase.value).toBeCloseTo(
      input.totalAcidFamilyMolality.value,
      14,
    );
    expect(species.conjugateBase.value).toBeGreaterThan(0.1);
  });

  it("allows acetate supplied as NaOAc to hydrolyze", () => {
    const result = expectSuccess(
      solveReduced({
        totals: totals(0, 0.1, 0.1),
        constants: DEFAULT_ACID_BASE_CONSTANTS,
      }),
    );

    expect(result.species.neutralAcid.value).toBeGreaterThan(0);
    expect(result.species.hydroxide.value).toBeGreaterThan(
      result.species.hydrogen.value,
    );
  });

  it("satisfies water and acetic-acid equilibrium in activities", () => {
    const result = expectSuccess(
      solveReduced({
        totals: totals(0, 0.1, 0.1),
        constants: DEFAULT_ACID_BASE_CONSTANTS,
      }),
    );
    const activities = daviesActivities(
      result.ionicStrength,
      DEFAULT_ACID_BASE_CONSTANTS,
    );
    const { species } = result;
    const waterProduct =
      activities.hydrogen.value *
      species.hydrogen.value *
      activities.hydroxide.value *
      species.hydroxide.value;
    const acidQuotient =
      (activities.hydrogen.value *
        species.hydrogen.value *
        activities.monovalentAnion.value *
        species.conjugateBase.value) /
      (activities.neutralAcid.value * species.neutralAcid.value);

    expect(waterProduct).toBeCloseTo(DEFAULT_ACID_BASE_CONSTANTS.Kw.value, 14);
    expect(acidQuotient).toBeCloseTo(DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc.value, 14);
  });

  it("uses the pinned water-activity convention in the water equilibrium", () => {
    const constants = {
      ...DEFAULT_ACID_BASE_CONSTANTS,
      waterActivity: activity(0.9),
    };
    const result = expectSuccess(
      solveReduced({ totals: totals(0, 0.1, 0.1), constants }),
    );
    const activities = daviesActivities(result.ionicStrength, constants);
    const waterProduct =
      activities.hydrogen.value * result.species.hydrogen.value *
      activities.hydroxide.value * result.species.hydroxide.value;

    expect(waterProduct).toBeCloseTo(
      constants.Kw.value * constants.waterActivity.value,
      14,
    );
  });

  it("does not reduce activity to a post-hoc correction", () => {
    const result = expectSuccess(
      solveReduced({
        totals: totals(0, 0.1, 0.1),
        constants: DEFAULT_ACID_BASE_CONSTANTS,
      }),
    );
    const activities = daviesActivities(
      result.ionicStrength,
      DEFAULT_ACID_BASE_CONSTANTS,
    );
    const { species } = result;
    const concentrationOnlyQuotient =
      (species.hydrogen.value * species.conjugateBase.value) /
      species.neutralAcid.value;

    expect(activities.hydrogen.value).not.toBe(1);
    expect(activities.monovalentAnion.value).not.toBe(1);
    expect(concentrationOnlyQuotient).not.toBeCloseTo(
      DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc.value,
      8,
    );
  });

  it("accepts the boundary only when the converged ionic strength is inside it", () => {
    const inside = expectSuccess(
      solveReduced({
        totals: totals(0.499999, 0.499999),
        constants: DEFAULT_ACID_BASE_CONSTANTS,
      }),
    );
    expect(inside.ionicStrength.value).toBeLessThanOrEqual(0.5);

    const outside = solveReduced({
      totals: totals(0.5, 0.5),
      constants: DEFAULT_ACID_BASE_CONSTANTS,
    });
    expect(outside).toMatchObject({ kind: "BRACKET_NOT_FOUND" });
    expect("species" in outside).toBe(false);
  });

  it("refuses a converged ionic strength above the Davies computational domain", () => {
    const result = solveReduced({
      totals: totals(0.6, 0.6),
      constants: DEFAULT_ACID_BASE_CONSTANTS,
    });

    expect(result).toMatchObject({ kind: "BRACKET_NOT_FOUND" });
    expect("species" in result).toBe(false);
  });

  it("does not emit a partial state when the numerical boundary cannot be evaluated", () => {
    const invalidConstants = {
      ...DEFAULT_ACID_BASE_CONSTANTS,
      daviesA: Number.NaN,
    };

    expect(() =>
      solveReduced({
        totals: totals(0.1, 0),
        constants: invalidConstants,
      }),
    ).not.toThrow();
    expect(
      solveReduced({
        totals: totals(0.1, 0),
        constants: invalidConstants,
      }),
    ).toMatchObject({ kind: "BRACKET_NOT_FOUND" });
  });
});
