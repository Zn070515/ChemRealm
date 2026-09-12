import { describe, expect, it } from "vitest";

import {
  buildIndicatorInputsFromSnapshot,
  parseSolverRequirements,
  validateSolveRequest,
} from "./request.js";
import {
  kilogram,
  kelvin,
  litre,
  mol,
  type SolveRequest,
} from "@chemrealm/schema";

describe("solver requirements DTO bridge", () => {
  it("canonicalizes temperature before the resolver compares it", () => {
    const requirements = parseSolverRequirements({
      temperature: { value: 25, unit: "degC" },
      solvent: "water",
      phase: "aqueous",
      activityCorrected: true,
      species: ["H+"],
    });

    expect(requirements.temperature).toBeCloseTo(298.15, 12);
  });

  it("retains the schema boundary's strict validation", () => {
    expect(() =>
      parseSolverRequirements({
        temperature: { value: 25, unit: "degC" },
        solvent: "water",
        phase: "aqueous",
        activityCorrected: true,
        species: ["H+"],
        unexpected: true,
      }),
    ).toThrow();
  });

  it("rejects a fully dissociated solute carrying equilibrium data", () => {
    const request = {
      waterMass: kilogram(1),
      liquidVolume: litre(1),
      solutes: [
        {
          soluteId: "HCl",
          amount: mol(0.1),
          mode: "fully-dissociated",
          ka: { value: 1.8e-5, unit: "1" },
        },
      ],
      temperature: kelvin(298.15),
      indicators: [],
    } as unknown as SolveRequest;

    expect(validateSolveRequest(request)).toEqual([
      expect.objectContaining({ field: "solutes[0].mode" }),
    ]);
  });
});

describe("scenario-frozen scientific input bridge", () => {
  const snapshot = {
    scenarioRef: "frozen-indicator",
    materials: [],
    vessels: [],
    apparatusDefaults: [],
    indicators: [
      {
        indicatorId: "phenolphthalein",
        kaIn: { value: 3.98e-10, unit: "1" },
        provenance: {
          source: "reference",
          reference: "indicator transition table",
          category: "evaluated",
        },
      },
    ],
    modelRequirements: {
      temperature: { value: 298.15, unit: "K" },
      solvent: "water",
      phase: "aqueous",
      activityCorrected: true,
      species: ["H+"],
    },
  };

  it("copies indicators from the validated snapshot, not a mutable catalog", () => {
    const inputs = buildIndicatorInputsFromSnapshot(Object.freeze(snapshot));

    expect(inputs[0]?.indicatorId).toBe("phenolphthalein");
    expect(inputs[0]?.kaIn.value).toBe(3.98e-10);
    expect(Object.isFrozen(inputs)).toBe(false);
  });

  it("rejects a snapshot indicator with a non-canonical unit", () => {
    const invalid = structuredClone(snapshot);
    invalid.indicators[0]!.kaIn = { value: 3.98e-10, unit: "mmol/L" };
    expect(() => buildIndicatorInputsFromSnapshot(invalid)).toThrow();
  });
});
