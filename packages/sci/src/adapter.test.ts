import { describe, expect, it } from "vitest";

import {
  kilogram,
  kelvin,
  ionicStrengthMolal,
  litre,
  type ModelDescriptor,
  type ScientificState,
  type SolveRequest,
  type SolveResult,
} from "@chemrealm/schema";

import { StubSolverAdapter } from "./stub.js";

const descriptor: ModelDescriptor = {
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
  },
};

const request: SolveRequest = {
  waterMass: kilogram(1),
  liquidVolume: litre(1),
  solutes: [],
  temperature: kelvin(298.15),
  indicators: [],
};
const fakeState = {} as ScientificState;

describe("SolverAdapter contract", () => {
  it("returns a Promise of the tagged result envelope", async () => {
    const expected: SolveResult = {
      status: "NOT_CONVERGED",
      residual: 1e-9,
      iterations: 12,
    };
    const adapter = new StubSolverAdapter({ descriptor, outcome: expected });

    expect(adapter.model).toBe(descriptor);
    expect(adapter.solverConfig).toEqual({
      id: descriptor.id,
      version: descriptor.version,
      parameters: {},
    });
    const pending = adapter.solve(request);
    expect(pending).toBeInstanceOf(Promise);
    await expect(pending).resolves.toEqual(expected);
  });

  it.each([
    "OK",
    "MODEL_OUT_OF_DOMAIN",
    "NOT_CONVERGED",
    "INVALID_INPUT",
  ] as const)("can exercise the %s result status", async (status) => {
    const resultByStatus: Record<string, SolveResult> = {
      OK: {
        status: "OK",
        state: fakeState,
      },
      MODEL_OUT_OF_DOMAIN: {
        status: "MODEL_OUT_OF_DOMAIN",
        reason: "contract test",
        nearestSupported: descriptor,
      },
      NOT_CONVERGED: { status: "NOT_CONVERGED", residual: 1, iterations: 1 },
      INVALID_INPUT: {
        status: "INVALID_INPUT",
        violations: [{ field: "test", message: "contract test" }],
      },
    };
    const adapter = new StubSolverAdapter({
      descriptor,
      outcome: resultByStatus[status]!,
    });

    await expect(adapter.solve(request)).resolves.toMatchObject({ status });
  });

  it("refuses before solving when the request temperature is outside the descriptor", async () => {
    let invoked = false;
    const adapter = new StubSolverAdapter({
      descriptor,
      outcome: () => {
        invoked = true;
        return { status: "OK", state: fakeState };
      },
    });

    const result = await adapter.solve({ ...request, temperature: kelvin(250) });

    expect(result.status).toBe("MODEL_OUT_OF_DOMAIN");
    if (result.status !== "MODEL_OUT_OF_DOMAIN") throw new Error("wrong result");
    expect(result.nearestSupported).toEqual(descriptor);
    expect(invoked).toBe(false);
  });

  it("returns INVALID_INPUT before domain refusal for a malformed typed request", async () => {
    let invoked = false;
    const adapter = new StubSolverAdapter({
      descriptor,
      outcome: () => {
        invoked = true;
        return { status: "OK", state: fakeState };
      },
    });

    const result = await adapter.solve({
      ...request,
      waterMass: -1 as never,
      temperature: kelvin(250),
    });

    expect(result.status).toBe("INVALID_INPUT");
    expect(invoked).toBe(false);
  });
});
