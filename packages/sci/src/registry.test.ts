import { describe, expect, it } from "vitest";

import { ionicStrengthMolal, kelvin, type ModelDescriptor } from "@chemrealm/schema";

import { StubSolverAdapter } from "./stub.js";
import { parseSolverRequirements } from "./request.js";
import { SolverRegistry, SolverResolver } from "./registry.js";

function makeDescriptor(
  overrides: Partial<ModelDescriptor["validity"]> = {},
): ModelDescriptor {
  return {
    id: "test-solver",
    version: "1.0.0",
    description: "contract-test solver",
    validity: {
      temperature: { min: kelvin(273.15), max: kelvin(373.15) },
      ionicStrengthMolalMax: ionicStrengthMolal(0.5),
      species: ["H+", "OH-"],
      solvent: "water",
      phase: "aqueous",
      activityCorrected: true,
      ...overrides,
    },
  };
}

function requirements(overrides: Record<string, unknown> = {}) {
  return parseSolverRequirements({
    temperature: { value: 25, unit: "degC" },
    solvent: "water",
    phase: "aqueous",
    activityCorrected: true,
    species: ["H+"],
    ...overrides,
  });
}

describe("exact solver registry", () => {
  it("finds an adapter only at its exact id and version", () => {
    const adapter = new StubSolverAdapter({
      descriptor: makeDescriptor(),
      outcome: { status: "NOT_CONVERGED", residual: 1, iterations: 1 },
    });
    const registry = new SolverRegistry();
    registry.register(adapter);

    expect(registry.lookup("test-solver", "1.0.0")).toEqual({
      status: "found",
      adapter,
    });
    const unavailable = registry.lookup("test-solver", "1.1.0");
    expect(unavailable.status).toBe("unavailable");
    if (unavailable.status !== "unavailable") throw new Error("wrong result");
    expect(unavailable.reason).toContain("1.1.0");
  });

  it("rejects duplicate exact registrations", () => {
    const first = new StubSolverAdapter({
      descriptor: makeDescriptor(),
      outcome: { status: "NOT_CONVERGED", residual: 1, iterations: 1 },
    });
    const second = new StubSolverAdapter({
      descriptor: makeDescriptor(),
      outcome: { status: "NOT_CONVERGED", residual: 2, iterations: 2 },
    });
    const registry = new SolverRegistry();
    registry.register(first);

    expect(() => registry.register(second)).toThrow(/already registered/);
  });

  it("resolves a compatible adapter from machine-checkable requirements", () => {
    const adapter = new StubSolverAdapter({
      descriptor: makeDescriptor(),
      outcome: { status: "NOT_CONVERGED", residual: 1, iterations: 1 },
    });
    const registry = new SolverRegistry([adapter]);

    const result = registry.resolve(requirements());

    expect(result.status).toBe("compatible");
    if (result.status !== "compatible") throw new Error("wrong result");
    expect(result.adapter).toBe(adapter);
    expect(result.model).toBe(adapter.models[0]);
  });

  it("returns incompatible instead of falling back when requirements are unsatisfied", () => {
    const adapter = new StubSolverAdapter({
      descriptor: makeDescriptor(),
      outcome: { status: "NOT_CONVERGED", residual: 1, iterations: 1 },
    });
    const registry = new SolverRegistry([adapter]);

    const result = new SolverResolver(registry).resolve(
      requirements({
        temperature: { value: 200, unit: "K" },
        species: ["H+", "Al3+"],
      }),
    );

    expect(result.status).toBe("incompatible");
    if (result.status !== "incompatible") throw new Error("wrong result");
    expect(result.reason).toMatch(/temperature|species/);
  });

  it("reports unavailable when no adapter is registered", () => {
    const result = new SolverResolver(new SolverRegistry()).resolve(requirements());

    expect(result.status).toBe("unavailable");
    if (result.status !== "unavailable") throw new Error("wrong result");
    expect(result.reason).toContain("no solver adapters");
  });

  it("rejects an activity-corrected requirement for a non-activity model", () => {
    const adapter = new StubSolverAdapter({
      descriptor: makeDescriptor({ activityCorrected: false }),
      outcome: { status: "NOT_CONVERGED", residual: 1, iterations: 1 },
    });
    const registry = new SolverRegistry([adapter]);

    const result = registry.resolve(requirements({ activityCorrected: true }));

    expect(result.status).toBe("incompatible");
    if (result.status !== "incompatible") throw new Error("wrong result");
    expect(result.reason).toContain("activity correction");
  });
});
