import { describe, expect, it } from "vitest";

import { parseSolverRequirements } from "./request.js";

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
});
