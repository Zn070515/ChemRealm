import { describe, expect, it } from "vitest";

import {
  ionicStrengthMolal,
  kelvin,
  type ScientificState,
  type SolveRequest,
  type ModelDescriptor,
  type SolveResult,
} from "@chemrealm/schema";

import type { SolverAdapter } from "./adapter.js";
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

function notConverged(residual = 1, iterations = 1): SolveResult {
  return {
    status: "NOT_CONVERGED",
    code: "OUTER_ITERATION_LIMIT",
    reason: "registry-test numerical failure",
    residual,
    iterations,
  };
}

describe("exact solver registry", () => {
  it("finds an adapter only at its exact id and version", () => {
    const adapter = new StubSolverAdapter({
      descriptor: makeDescriptor(),
      parameters: { Kw: 1e-14 },
      outcome: notConverged(),
    });
    const registry = new SolverRegistry();
    registry.register(adapter);

    const found = registry.lookup("test-solver", "1.0.0");
    expect(found.status).toBe("found");
    if (found.status !== "found") throw new Error("expected registered adapter");
    expect(found.adapter).not.toBe(adapter);
    expect(found.adapter.id).toBe("test-solver");
    expect(found.adapter.version).toBe("1.0.0");
    const unavailable = registry.lookup("test-solver", "1.1.0");
    expect(unavailable.status).toBe("unavailable");
    if (unavailable.status !== "unavailable") throw new Error("wrong result");
    expect(unavailable.reason).toContain("1.1.0");
  });

  it("rejects duplicate exact registrations", () => {
    const first = new StubSolverAdapter({
      descriptor: makeDescriptor(),
      outcome: notConverged(),
    });
    const second = new StubSolverAdapter({
      descriptor: makeDescriptor(),
      outcome: notConverged(2, 2),
    });
    const registry = new SolverRegistry();
    registry.register(first);

    expect(() => registry.register(second)).toThrow(/already registered/);
  });

  it("defensively copies and freezes identity after registration", () => {
    const mutableDescriptor = makeDescriptor();
    const mutableParameters = { Kw: 1e-14 };
    const adapter = new StubSolverAdapter({
      descriptor: mutableDescriptor,
      parameters: mutableParameters,
      outcome: notConverged(),
    });
    const registry = new SolverRegistry([adapter]);

    mutableDescriptor.version = "2.0.0";
    mutableDescriptor.validity.species.push("Al3+");
    mutableParameters.Kw = 9e-14;

    const lookup = registry.lookup("test-solver", "1.0.0");
    expect(lookup.status).toBe("found");
    if (lookup.status !== "found") throw new Error("expected registered adapter");
    expect(lookup.adapter.model.version).toBe("1.0.0");
    expect(lookup.adapter.model.validity.species).toEqual(["H+", "OH-"]);
    expect(lookup.adapter.solverConfig.parameters).toEqual({ Kw: 1e-14 });
    expect(Object.isFrozen(lookup.adapter.model)).toBe(true);
    expect(Object.isFrozen(lookup.adapter.model.validity)).toBe(true);
    expect(Object.isFrozen(lookup.adapter.model.validity.species)).toBe(true);
    expect(Object.isFrozen(lookup.adapter.solverConfig)).toBe(true);
    expect(Object.isFrozen(lookup.adapter.solverConfig.parameters)).toBe(true);

    expect(() => {
      (lookup.adapter.solverConfig.parameters as Record<string, number>).Kw = 2e-14;
    }).toThrow();
  });

  it("checks provenance identity for adapters registered through the wrapper", async () => {
    const model = makeDescriptor();
    const adapter: SolverAdapter = {
      id: model.id,
      version: model.version,
      model,
      solverConfig: {
        id: model.id,
        version: model.version,
        parameters: { Kw: 1e-14 },
      },
      solve: async (_request: SolveRequest) => ({
        status: "OK",
        state: {
          provenance: {
            modelId: "different-solver",
            modelVersion: model.version,
            activityModel: "contract-test",
            category: "calculated",
            parameters: { Kw: 1e-14 },
          },
        } as ScientificState,
      }),
    };
    const registry = new SolverRegistry([adapter]);
    const found = registry.lookup(model.id, model.version);
    if (found.status !== "found") throw new Error("expected registered adapter");

    await expect(found.adapter.solve({} as SolveRequest)).rejects.toThrow(
      /provenance.*identity/i,
    );
  });

  it("resolves a compatible adapter from machine-checkable requirements", () => {
    const adapter = new StubSolverAdapter({
      descriptor: makeDescriptor(),
      parameters: { Kw: 1e-14 },
      outcome: notConverged(),
    });
    const registry = new SolverRegistry([adapter]);

    const result = registry.resolve(requirements());

    expect(result.status).toBe("compatible");
    if (result.status !== "compatible") throw new Error("wrong result");
    expect(result.adapter).not.toBe(adapter);
    expect(result.model).toBe(result.adapter.model);
    expect(result.solverConfig).toEqual({
      id: "test-solver",
      version: "1.0.0",
      parameters: { Kw: 1e-14 },
    });
  });

  it("rejects an adapter whose model or config identity is not exact", () => {
    const descriptor = makeDescriptor();
    const invalid = {
      id: "test-solver",
      version: "1.0.0",
      model: { ...descriptor, version: "2.0.0" },
      solverConfig: {
        id: "test-solver",
        version: "1.0.0",
        parameters: {},
      },
      solve: async () => notConverged(),
    } as unknown as SolverAdapter;

    expect(() => new SolverRegistry([invalid])).toThrow(/identity/);
  });

  it("returns incompatible instead of falling back when requirements are unsatisfied", () => {
    const adapter = new StubSolverAdapter({
      descriptor: makeDescriptor(),
      outcome: notConverged(),
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
      outcome: notConverged(),
    });
    const registry = new SolverRegistry([adapter]);

    const result = registry.resolve(requirements({ activityCorrected: true }));

    expect(result.status).toBe("incompatible");
    if (result.status !== "incompatible") throw new Error("wrong result");
    expect(result.reason).toContain("activity correction");
  });
});
