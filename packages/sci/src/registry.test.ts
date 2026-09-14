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
  TEST_SOLVER_VERSION,
  VERSION_MANIFEST,
} from "@chemrealm/schema";

import type { SolverAdapter } from "./adapter.js";
import { StubSolverAdapter } from "./stub.js";
import { parseSolverRequirements } from "./request.js";
import {
  checkModelCompatibility,
  SolverRegistry,
  SolverResolver,
  type SolverSelectionPolicy,
} from "./registry.js";
import { createAcidBaseAdapter } from "./acidbase/index.js";

function makeDescriptor(
  overrides: Partial<ModelDescriptor["validity"]> = {},
): ModelDescriptor {
  return {
    id: "test-solver",
    version: TEST_SOLVER_VERSION,
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
    indicatorObservations: [],
    validity: { inDomain: true, withinProposedAccuracyEnvelope: true },
    provenance: {
      modelId: "test-solver",
      modelVersion: TEST_SOLVER_VERSION,
      activityModel: "contract-test",
      category: "calculated",
      parameters: { Kw: 1e-14 },
      ...provenance,
    },
  };
}

const testSelection: SolverSelectionPolicy = {
  id: "test-solver",
  version: TEST_SOLVER_VERSION,
};

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
      {},
      {
        id: VERSION_MANIFEST.scientific.acidBase.id,
        version: VERSION_MANIFEST.scientific.acidBase.legacyVersion,
      },
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

    const found = registry.lookup("test-solver", TEST_SOLVER_VERSION);
    expect(found.status).toBe("found");
    if (found.status !== "found") throw new Error("expected registered adapter");
    expect(found.adapter).not.toBe(adapter);
    expect(found.adapter.id).toBe("test-solver");
    expect(found.adapter.version).toBe(TEST_SOLVER_VERSION);
    const unavailable = registry.lookup("test-solver", `${TEST_SOLVER_VERSION.slice(0, 4)}1.0`);
    expect(unavailable.status).toBe("unavailable");
    if (unavailable.status !== "unavailable") throw new Error("wrong result");
    expect(unavailable.reason).toContain(`${TEST_SOLVER_VERSION.slice(0, 4)}1.0`);
  });

  it("requires the complete frozen solver config identity for persisted lookup", () => {
    const adapter = new StubSolverAdapter({
      descriptor: makeDescriptor(),
      parameters: { Kw: 1e-14 },
      outcome: notConverged(),
    });
    const registry = new SolverRegistry([adapter]);

    expect(registry.lookupBySolverConfig(adapter.solverConfig).status).toBe("found");
    expect(
      registry.lookupScientificExecutionBySolverConfig(adapter.solverConfig).status,
    ).toBe("unavailable");

    const modified = {
      ...adapter.solverConfig,
      parameters: { ...adapter.solverConfig.parameters, Kw: 1.0000000000001e-14 },
    };
    const modifiedLookup = registry.lookupBySolverConfig(modified);
    expect(modifiedLookup.status).toBe("unavailable");
    if (modifiedLookup.status !== "unavailable") throw new Error("expected identity mismatch");
    expect(modifiedLookup.reason).toMatch(/identity|parameter/i);
    const modifiedScientificLookup = registry.lookupScientificExecutionBySolverConfig(modified);
    expect(modifiedScientificLookup.status).toBe("unavailable");
    if (modifiedScientificLookup.status !== "unavailable") throw new Error("expected identity mismatch");
    expect(modifiedScientificLookup.reason).toMatch(/identity|parameter/i);
  });

  it("exposes an expression capability through a typed registry lookup", () => {
    const registry = new SolverRegistry([createAcidBaseAdapter()]);

    const result = registry.lookupScientificExecution(
      VERSION_MANIFEST.scientific.acidBase.id,
      VERSION_MANIFEST.scientific.acidBase.legacyVersion,
    );

    expect(result.status).toBe("found");
    if (result.status !== "found") throw new Error("expected scientific adapter");
    expect(result.adapter.solveWithScientificArtifacts).toBeTypeOf("function");
  });

  it("does not pretend a plain adapter can produce scientific artifacts", () => {
    const adapter = new StubSolverAdapter({
      descriptor: makeDescriptor(),
      outcome: notConverged(),
    });
    const result = new SolverRegistry([adapter]).lookupScientificExecution(
      adapter.id,
      adapter.version,
    );

    expect(result.status).toBe("unavailable");
    if (result.status !== "unavailable") throw new Error("expected unavailable capability");
    expect(result.reason).toMatch(/scientific execution artifacts/i);
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

    (mutableDescriptor as unknown as { version: string }).version =
      VERSION_MANIFEST.scientific.acidBase.nativeVersion;
    (mutableDescriptor.validity.species as unknown as string[]).push("Al3+");
    (mutableDescriptor.validity.ionicStrengthMolalMax as unknown as { value: number }).value = 9;
    mutableParameters.Kw = 9e-14;

    const lookup = registry.lookup("test-solver", TEST_SOLVER_VERSION);
    expect(lookup.status).toBe("found");
    if (lookup.status !== "found") throw new Error("expected registered adapter");
    expect(lookup.adapter.model.version).toBe(TEST_SOLVER_VERSION);
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

  it("checks nearestSupported identity for adapters registered through the wrapper", async () => {
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
        status: "MODEL_OUT_OF_DOMAIN",
        reason: "registry-test domain refusal",
        nearestSupported: { ...model, version: VERSION_MANIFEST.scientific.acidBase.nativeVersion },
      }),
    };
    const registry = new SolverRegistry([adapter]);
    const found = registry.lookup(model.id, model.version);
    if (found.status !== "found") throw new Error("expected registered adapter");

    await expect(found.adapter.solve({} as SolveRequest)).rejects.toThrow(
      /nearestSupported.*identity/i,
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

    const result = registry.resolve(requirements(), {}, testSelection);

    expect(result.status).toBe("compatible");
    if (result.status !== "compatible") throw new Error("wrong result");
    expect(result.adapter).not.toBe(adapter);
    expect(result.model).toBe(result.adapter.model);
    expect(result.solverConfig).toEqual({
      id: "test-solver",
      version: TEST_SOLVER_VERSION,
      parameters: { Kw: 1e-14 },
    });
  });

  it("rejects required input components absent from the model", () => {
    const adapter = new StubSolverAdapter({
      descriptor: makeDescriptor(),
      parameters: { Kw: 1e-14 },
      outcome: notConverged(),
    });
    const result = new SolverRegistry([adapter]).resolve(
      requirements(),
      { requiredComponents: ["HNO3"] },
      testSelection,
    );

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
      version: TEST_SOLVER_VERSION,
      model: { ...descriptor, version: VERSION_MANIFEST.scientific.acidBase.nativeVersion },
      solverConfig: {
        id: "test-solver",
        version: TEST_SOLVER_VERSION,
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
      {},
      testSelection,
    );

    expect(result.status).toBe("incompatible");
    if (result.status !== "incompatible") throw new Error("wrong result");
    expect(result.reason).toMatch(/temperature|species/);
  });

  it("reports unavailable when no adapter is registered", () => {
    const result = new SolverResolver(new SolverRegistry()).resolve(
      requirements(),
      {},
      testSelection,
    );

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

    const result = registry.resolve(
      requirements({ activityCorrected: true }),
      {},
      testSelection,
    );

    expect(result.status).toBe("incompatible");
    if (result.status !== "incompatible") throw new Error("wrong result");
    expect(result.reason).toContain("activity correction");
  });

  it("uses the explicit solver identity instead of registry insertion order", () => {
    const first = new StubSolverAdapter({
      descriptor: makeDescriptor(),
      parameters: { Kw: 1e-14 },
      outcome: notConverged(),
    });
    const secondDescriptor: ModelDescriptor = {
      ...makeDescriptor(),
      id: "test-solver-alt",
      version: VERSION_MANIFEST.scientific.acidBase.nativeVersion,
    };
    const second = new StubSolverAdapter({
      descriptor: secondDescriptor,
      parameters: { Kw: 1e-14 },
      outcome: notConverged(),
    });
    const policy: SolverSelectionPolicy = { id: second.id, version: second.version };
    const forward = new SolverRegistry([first, second]).resolve(requirements(), {}, policy);
    const reversed = new SolverRegistry([second, first]).resolve(requirements(), {}, policy);

    expect(forward.status).toBe("compatible");
    expect(reversed.status).toBe("compatible");
    if (forward.status !== "compatible" || reversed.status !== "compatible") {
      throw new Error("expected explicit selection to resolve");
    }
    expect(forward.adapter.id).toBe("test-solver-alt");
    expect(reversed.adapter.id).toBe("test-solver-alt");
  });

  it("does not fall back when the explicitly selected solver is unavailable", () => {
    const adapter = new StubSolverAdapter({
      descriptor: makeDescriptor(),
      parameters: { Kw: 1e-14 },
      outcome: notConverged(),
    });
    const result = new SolverRegistry([adapter]).resolve(
      requirements(),
      {},
      {
        id: "missing-solver",
        version: VERSION_MANIFEST.scientific.acidBase.nativeVersion,
      },
    );

    expect(result.status).toBe("unavailable");
  });
});
