import { describe, expect, it } from "vitest";

import {
  ionicStrengthMolal,
  kelvin,
  ph,
  reducedIonicStrength,
  type ScientificState,
  type SolveRequest,
  type ModelDescriptor,
  type SolveResult,
} from "@chemrealm/schema";

import type { SolverAdapter } from "./adapter.js";
import { StubSolverAdapter } from "./stub.js";
import { parseSolverRequirements } from "./request.js";
import { checkModelCompatibility, SolverRegistry, SolverResolver } from "./registry.js";
import { createAcidBaseAdapter } from "./acidbase/index.js";

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
      components: ["HCl"],
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

function validState(provenance: Partial<ScientificState["provenance"]> = {}): ScientificState {
  return {
    species: [],
    ionicStrengthMolal: ionicStrengthMolal(0),
    ionicStrengthReduced: reducedIonicStrength(0),
    modelPh: ph(7),
    indicators: [],
    validity: { inDomain: true, withinProposedAccuracyEnvelope: true },
    provenance: {
      modelId: "test-solver",
      modelVersion: "1.0.0",
      activityModel: "contract-test",
      category: "calculated",
      parameters: { Kw: 1e-14 },
      ...provenance,
    },
  };
}

describe("exact solver registry", () => {
  it("resolves the acid-base model for its equilibrium species requirements", () => {
    const registry = new SolverRegistry([createAcidBaseAdapter()]);
    const result = registry.resolve(
      parseSolverRequirements({
        temperature: { value: 298.15, unit: "K" },
        species: ["H2O", "H+", "OH-", "Cl-", "Na+"],
        solvent: "water",
        phase: "aqueous",
        activityCorrected: true,
      }),
    );

    expect(result.status).toBe("compatible");
  });

  it("keeps accepted input components distinct from equilibrium species", () => {
    const descriptor = createAcidBaseAdapter().model;
    const validity = descriptor.validity as typeof descriptor.validity & {
      components?: readonly string[];
    };

    expect(validity.components).toContain("HCl");
    expect(descriptor.validity.species).toContain("H+");
    expect(descriptor.validity.species).not.toContain("HCl");
  });

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

    (mutableDescriptor as unknown as { version: string }).version = "2.0.0";
    (mutableDescriptor.validity.species as unknown as string[]).push("Al3+");
    (mutableDescriptor.validity.ionicStrengthMolalMax as unknown as { value: number }).value = 9;
    mutableParameters.Kw = 9e-14;

    const lookup = registry.lookup("test-solver", "1.0.0");
    expect(lookup.status).toBe("found");
    if (lookup.status !== "found") throw new Error("expected registered adapter");
    expect(lookup.adapter.model.version).toBe("1.0.0");
    expect(lookup.adapter.model.validity.species).toEqual(["H+", "OH-"]);
    expect(lookup.adapter.model.validity.ionicStrengthMolalMax.value).toBe(0.5);
    expect(lookup.adapter.solverConfig.parameters).toEqual({ Kw: 1e-14 });
    expect(Object.isFrozen(lookup.adapter.model)).toBe(true);
    expect(Object.isFrozen(lookup.adapter.model.validity)).toBe(true);
    expect(Object.isFrozen(lookup.adapter.model.validity.species)).toBe(true);
    expect(Object.isFrozen(lookup.adapter.model.validity.ionicStrengthMolalMax)).toBe(true);
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
        state: validState({ modelId: "different-solver" }),
      }),
    };
    const registry = new SolverRegistry([adapter]);
    const found = registry.lookup(model.id, model.version);
    if (found.status !== "found") throw new Error("expected registered adapter");

    await expect(found.adapter.solve({} as SolveRequest)).rejects.toThrow(
      /provenance.*identity/i,
    );
  });

  it.each([
    {
      name: "OK state without scientific fields",
      outcome: {
        status: "OK",
        state: { provenance: validState().provenance },
      },
    },
    {
      name: "out-of-domain result without nearest descriptor",
      outcome: { status: "MODEL_OUT_OF_DOMAIN", reason: "outside model" },
    },
    {
      name: "not-converged result without diagnostic code",
      outcome: { status: "NOT_CONVERGED", reason: "failed", iterations: 1 },
    },
    {
      name: "invalid-input result with malformed violations",
      outcome: { status: "INVALID_INPUT", violations: "not-an-array" },
    },
  ])("rejects malformed adapter output: $name", async ({ outcome }) => {
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
      solve: async (_request: SolveRequest) => outcome as unknown as SolveResult,
    };
    const registry = new SolverRegistry([adapter]);
    const found = registry.lookup(model.id, model.version);
    if (found.status !== "found") throw new Error("expected registered adapter");

    await expect(found.adapter.solve({} as SolveRequest)).rejects.toThrow(/malformed|contract|schema/i);
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

  it("rejects required input components absent from the model", () => {
    const adapter = new StubSolverAdapter({
      descriptor: makeDescriptor(),
      parameters: { Kw: 1e-14 },
      outcome: notConverged(),
    });
    const result = new SolverRegistry([adapter]).resolve(requirements(), {
      requiredComponents: ["HNO3"],
    });

    expect(result).toMatchObject({ status: "incompatible" });
    if (result.status !== "incompatible") throw new Error("expected incompatible result");
    expect(result.reason).toContain("HNO3");
  });

  it.each([
    ["species", { species: ["H+", "Al3+"] }, "species"],
    ["solvent", { solvent: "ethanol" }, "solvent"],
    ["phase", { phase: "gas" }, "phase"],
  ] as const)("reports an incompatible %s requirement before genesis", (_label, override, reason) => {
    const candidate = { ...requirements(), ...override } as Parameters<
      typeof checkModelCompatibility
    >[0];
    const result = checkModelCompatibility(
      candidate,
      makeDescriptor(),
    );

    expect(result.compatible).toBe(false);
    expect(result.reasons.join("; ")).toContain(reason);
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
