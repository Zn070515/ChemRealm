import { describe, expect, it } from "vitest";

import {
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
