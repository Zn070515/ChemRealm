import { describe, expect, it } from "vitest";

import {
  kilogram,
  kelvin,
  ionicStrengthMolal,
  litre,
  ph,
  reducedIonicStrength,
  type Provenance,
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

function makeState(
  provenance: Partial<Provenance> = {},
): ScientificState {
  return {
    species: [],
    ionicStrengthMolal: ionicStrengthMolal(0),
    ionicStrengthReduced: reducedIonicStrength(0),
    modelPh: ph(7),
    indicators: [],
    validity: {
      inDomain: true,
      withinProposedAccuracyEnvelope: true,
    },
    provenance: {
      modelId: descriptor.id,
      modelVersion: descriptor.version,
      activityModel: "contract-test",
      category: "calculated",
      parameters: {},
      ...provenance,
    },
  };
}

const validState = makeState();

function notConverged(residual = 1, iterations = 1): SolveResult {
  return {
    status: "NOT_CONVERGED",
    code: "OUTER_ITERATION_LIMIT",
    reason: "contract-test numerical failure",
    residual,
    iterations,
  };
}

describe("SolverAdapter contract", () => {
  it("returns a Promise of the tagged result envelope", async () => {
    const expected = notConverged(1e-9, 12);
    const adapter = new StubSolverAdapter({ descriptor, outcome: expected });

    expect(adapter.model).toEqual(descriptor);
    expect(adapter.model).not.toBe(descriptor);
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
        state: validState,
      },
      MODEL_OUT_OF_DOMAIN: {
        status: "MODEL_OUT_OF_DOMAIN",
        reason: "contract test",
        nearestSupported: descriptor,
      },
      NOT_CONVERGED: notConverged(),
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
        return { status: "OK", state: validState };
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
        return { status: "OK", state: validState };
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

  it.each([
    ["model id", { modelId: "different-solver" }],
    ["model version", { modelVersion: "2.0.0" }],
    ["parameters", { parameters: { Kw: 2e-14 } }],
  ] as const)("rejects an OK result with mismatched provenance %s", async (_name, mismatch) => {
    const adapter = new StubSolverAdapter({
      descriptor,
      parameters: { Kw: 1e-14 },
      outcome: {
        status: "OK",
        state: makeState({
          ...mismatch,
          parameters: "parameters" in mismatch ? mismatch.parameters : { Kw: 1e-14 },
        }),
      },
    });

    await expect(adapter.solve(request)).rejects.toThrow(/provenance.*identity/i);
  });

  it("returns INVALID_INPUT instead of throwing for incomplete decoded request data", async () => {
    let invoked = false;
    const adapter = new StubSolverAdapter({
      descriptor,
      outcome: () => {
        invoked = true;
        return notConverged();
      },
    });

    const malformedRequest = {
      ...request,
      solutes: [
        {
          soluteId: "HA",
          amount: 0,
          mode: "monoprotic-equilibrium",
        },
      ],
      indicators: [{ indicatorId: "indicator-without-ka" }],
    } as unknown as SolveRequest;

    await expect(adapter.solve(malformedRequest)).resolves.toMatchObject({
      status: "INVALID_INPUT",
    });
    expect(invoked).toBe(false);
  });

  it.each([
    ["negative temperature", { temperature: -1 }],
    ["infinite water mass", { waterMass: Number.POSITIVE_INFINITY }],
    [
      "NaN solute amount",
      { solutes: [{ soluteId: "HA", amount: Number.NaN, mode: "fully-dissociated" }] },
    ],
    [
      "malformed equilibrium constant",
      {
        solutes: [
          {
            soluteId: "HA",
            amount: 0,
            mode: "monoprotic-equilibrium",
            ka: { value: Number.NaN },
          },
        ],
      },
    ],
    [
      "infinite indicator constant",
      { indicators: [{ indicatorId: "indicator", kaIn: { value: Number.POSITIVE_INFINITY } }] },
    ],
  ] as const)("returns INVALID_INPUT for %s decoded data", async (_name, patch) => {
    const adapter = new StubSolverAdapter({
      descriptor,
      outcome: notConverged(),
    });

    const result = await adapter.solve({
      ...request,
      ...patch,
    } as unknown as SolveRequest);

    expect(result.status).toBe("INVALID_INPUT");
  });
});
