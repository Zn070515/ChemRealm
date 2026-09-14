import { describe, expect, it } from "vitest";

import {
  activity,
  activityCoefficient,
  kilogram,
  mol,
  reducedMolality,
  thermodynamicConstant,
} from "@chemrealm/schema";

import {
  calculateDiproticIndicatorFractions,
  buildPhenolphthaleinMultiformRequest,
  buildPhenolphthaleinMultiformObservation,
  calculateDiproticIndicatorForms,
  buildPhenolphthaleinMultiformModelDescriptor,
  buildPhenolphthaleinMultiformSolverConfig,
  diproticIndicatorConstantsFromSolverConfig,
  DEFAULT_PHENOLPHTHALEIN_MULTIFORM_CONSTANTS,
  refuseUnsupportedPhenolphthaleinRegime,
  refuseMissingPhenolphthaleinFormData,
  type DiproticIndicatorConstants,
} from "./multiform.js";
import { DEFAULT_ACID_BASE_CONSTANTS } from "./model.js";
import { INDICATOR_MULTIFORM_CONTRACT } from "../generated/indicator-multiform-contract.js";
import { solveReducedWithDiproticIndicator } from "./solve.js";
import type { AcidBaseComponentTotals } from "./catalog.js";

const CONSTANTS: DiproticIndicatorConstants = {
  Ka_In_1: thermodynamicConstant(1e-9),
  Ka_In_2: thermodynamicConstant(1e-10),
  neutralIndicatorActivityCoefficient: activityCoefficient(1),
};

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

describe("ordinary diprotic indicator chemistry", () => {
  it("builds candidate inputs from canonical world quantities without moving chemistry into composition", () => {
    const request = buildPhenolphthaleinMultiformRequest({
      waterMass: kilogram(1),
      componentAmounts: [
        { componentId: "HCl", amount: mol(0.1) },
        { componentId: "NaOH", amount: mol(0.1) },
      ],
      indicatorAmounts: [
        { indicatorId: "phenolphthalein", amount: mol(5e-7) },
      ],
    }, "sha256:multiform-world");

    expect(request.sourceReplayHash).toBe("sha256:multiform-world");
    expect(request.totalAmount).toBe(5e-7);
    expect(request.totals.strongAcidChlorideMolality.value).toBe(0.1);
    expect(request.totals.strongBaseSodiumMolality.value).toBe(0.1);
    expect(request.indicatorTotalMolality.value).toBe(5e-7);
  });

  it("computes three activity-based fractions that sum to one", () => {
    const result = calculateDiproticIndicatorFractions({
      constants: CONSTANTS,
      hydrogenActivity: activity(1e-10),
      monovalentAnionActivityCoefficient: activityCoefficient(1),
      divalentAnionActivityCoefficient: activityCoefficient(1),
    });

    expect(result).toEqual({
      neutralLactone: 1 / 21,
      intermediateMonoanion: 10 / 21,
      quinoidBase: 10 / 21,
    });
    expect(
      result.neutralLactone + result.intermediateMonoanion + result.quinoidBase,
    ).toBeCloseTo(1, 15);
  });

  it("includes charged indicator forms in the coupled charge and ionic-strength solve", () => {
    const withoutIndicator = solveReducedWithDiproticIndicator({
      totals: totals(0, 0.1),
      constants: DEFAULT_ACID_BASE_CONSTANTS,
      indicator: {
        totalMolality: reducedMolality(0),
        constants: CONSTANTS,
      },
    });
    const withIndicator = solveReducedWithDiproticIndicator({
      totals: totals(0, 0.1),
      constants: DEFAULT_ACID_BASE_CONSTANTS,
      indicator: {
        totalMolality: reducedMolality(0.05),
        constants: CONSTANTS,
      },
    });

    expect("kind" in withoutIndicator).toBe(false);
    expect("kind" in withIndicator).toBe(false);
    if ("kind" in withoutIndicator || "kind" in withIndicator) return;

    expect(withIndicator.indicatorForms).toBeDefined();
    expect(withIndicator.ionicStrength.value).toBeGreaterThan(
      withoutIndicator.ionicStrength.value,
    );
    expect(withIndicator.chargeResidual).toBeLessThan(1e-14);
    expect(withIndicator.indicatorForms).toBeDefined();
    if (withIndicator.indicatorForms === undefined) return;
    expect(
      withIndicator.indicatorForms.neutralLactoneMolality.value +
        withIndicator.indicatorForms.intermediateMonoanionMolality.value +
        withIndicator.indicatorForms.quinoidBaseMolality.value,
    ).toBeCloseTo(0.05, 14);
  });

  it("builds a schema-bound observation from solved ordinary forms", () => {
    const forms = calculateDiproticIndicatorForms(reducedMolality(0.05), {
      constants: CONSTANTS,
      hydrogenActivity: activity(1e-10),
      monovalentAnionActivityCoefficient: activityCoefficient(1),
      divalentAnionActivityCoefficient: activityCoefficient(1),
    });

    const observation = buildPhenolphthaleinMultiformObservation(
      mol(5e-8),
      forms,
      "sha256:world",
    );

    expect(observation).toMatchObject({
      status: "CHEMICAL_FORMS_OK",
      indicatorId: "phenolphthalein",
      sourceReplayHash: "sha256:world",
    });
    if (observation.status !== "CHEMICAL_FORMS_OK") return;
    expect(observation.totalAmount).toBe(5e-8);
    expect(observation.forms.map((form) => form.formId)).toEqual([
      "neutral-lactone",
      "intermediate-monoanion",
      "quinoid-base",
    ]);
    expect(observation.forms.reduce((sum, form) => sum + form.fraction, 0))
      .toBeCloseTo(1, 14);
    expect(Object.isFrozen(observation)).toBe(true);
  });

  it("does not turn a zero dose into a fabricated ordinary-form result", () => {
    const forms = calculateDiproticIndicatorForms(reducedMolality(0), {
      constants: CONSTANTS,
      hydrogenActivity: activity(1e-10),
      monovalentAnionActivityCoefficient: activityCoefficient(1),
      divalentAnionActivityCoefficient: activityCoefficient(1),
    });

    expect(() => buildPhenolphthaleinMultiformObservation(
      mol(0),
      forms,
      "sha256:world",
    )).toThrow(/positive|dose/i);
  });

  it("refuses missing or non-positive form constants before returning fractions", () => {
    expect(() => calculateDiproticIndicatorFractions({
      constants: {
        ...CONSTANTS,
        Ka_In_2: thermodynamicConstant(0),
      },
      hydrogenActivity: activity(1e-9),
      monovalentAnionActivityCoefficient: activityCoefficient(1),
      divalentAnionActivityCoefficient: activityCoefficient(1),
    })).toThrow(RangeError);
  });

  it("refuses the documented strong-acid cation instead of emitting orange chemistry", () => {
    const result = refuseUnsupportedPhenolphthaleinRegime(
      "strong-acid-cation",
      undefined,
      "sha256:strong-acid",
    );

    expect(result).toMatchObject({
      status: "CHEMICAL_FORMS_UNAVAILABLE",
      reasonCode: "FORM_OUT_OF_DOMAIN",
      modelId: buildPhenolphthaleinMultiformModelDescriptor().id,
      modelVersion: buildPhenolphthaleinMultiformModelDescriptor().version,
    });
    expect(JSON.stringify(result)).not.toMatch(/orange|strong-acid-cation/);
  });

  it("refuses missing form data without emitting a partial ordinary result", () => {
    const result = refuseMissingPhenolphthaleinFormData(
      mol(5e-8),
      "sha256:missing-form-data",
    );

    expect(result).toMatchObject({
      status: "CHEMICAL_FORMS_UNAVAILABLE",
      reasonCode: "FORM_DATA_MISSING",
      sourceReplayHash: "sha256:missing-form-data",
    });
    expect(result).not.toHaveProperty("forms");
  });

  it("keeps the multiform model identity and constants sourced from the central config", () => {
    const model = buildPhenolphthaleinMultiformModelDescriptor();
    const config = buildPhenolphthaleinMultiformSolverConfig();
    const constants = diproticIndicatorConstantsFromSolverConfig(config);

    expect(model.id).toBe(config.id);
    expect(model.version).toBe(config.version);
    expect(constants.Ka_In_1.value).toBe(
      DEFAULT_PHENOLPHTHALEIN_MULTIFORM_CONSTANTS.Ka_In_1.value,
    );
    expect(constants.Ka_In_2.value).toBe(
      DEFAULT_PHENOLPHTHALEIN_MULTIFORM_CONSTANTS.Ka_In_2.value,
    );
    expect(constants.Ka_In_1.value).not.toBe(
      DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc.value,
    );
    expect(Object.isFrozen(config.parameters)).toBe(true);
    expect(DEFAULT_PHENOLPHTHALEIN_MULTIFORM_CONSTANTS.Ka_In_1.value).toBe(
      INDICATOR_MULTIFORM_CONTRACT.constants.Ka_In_1,
    );
    expect(DEFAULT_PHENOLPHTHALEIN_MULTIFORM_CONSTANTS.Ka_In_2.value).toBe(
      INDICATOR_MULTIFORM_CONTRACT.constants.Ka_In_2,
    );
  });
});
