import { describe, expect, it } from "vitest";

import { ionicStrengthMolal, kelvin, type ModelDescriptor } from "@chemrealm/schema";
import { SolverRegistry, StubSolverAdapter } from "@chemrealm/sci";
import { createInitialState, createLog } from "@chemrealm/world";

import { createWorld } from "./world-creation.js";

const descriptor: ModelDescriptor = {
  id: "test-solver",
  version: "1.0.0",
  description: "composition-root contract solver",
  validity: {
    temperature: { min: kelvin(273.15), max: kelvin(373.15) },
    ionicStrengthMolalMax: ionicStrengthMolal(0.5),
    species: ["H+"],
    solvent: "water",
    phase: "aqueous",
    activityCorrected: true,
  },
};

const snapshot = {
  scenarioRef: "m3-contract",
  materials: [],
  vessels: [],
  apparatusDefaults: [],
  indicators: [],
  modelRequirements: {
    temperature: { value: 25, unit: "degC" },
    species: ["H+"],
    solvent: "water",
    phase: "aqueous",
    activityCorrected: true,
  },
};

function registry(): SolverRegistry {
  return new SolverRegistry([
    new StubSolverAdapter({
      descriptor,
      parameters: { Kw: 1e-14 },
      outcome: { status: "NOT_CONVERGED", residual: 1, iterations: 1 },
    }),
  ]);
}

describe("composition-level world creation", () => {
  it("emits genesis with the resolver's complete solver identity", () => {
    const result = createWorld(registry(), {
      worldId: "world-m3",
      scenarioSnapshot: snapshot,
      seed: null,
    });

    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("expected compatible world");
    expect(result.event.payload.solverConfig).toEqual({
      id: "test-solver",
      version: "1.0.0",
      parameters: { Kw: 1e-14 },
    });
    expect(() => createLog(result.event)).not.toThrow();
    expect(() => createInitialState(result.event)).not.toThrow();
  });

  it("rejects incompatible requirements before emitting WorldCreated", () => {
    const result = createWorld(registry(), {
      worldId: "world-m3-rejected",
      scenarioSnapshot: {
        ...snapshot,
        modelRequirements: {
          ...snapshot.modelRequirements,
          temperature: { value: 1000, unit: "K" },
        },
      },
      seed: null,
    });

    expect(result).toMatchObject({ accepted: false, status: "incompatible" });
    expect("event" in result).toBe(false);
    if (result.accepted) throw new Error("expected incompatible requirements");
    expect(result.reason).toContain("temperature");
  });
});
