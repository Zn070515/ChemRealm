import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import {
  hashUtf8,
  kilogram,
  kelvin,
  litre,
  mol,
  thermodynamicConstant,
  type SolveRequest,
} from "@chemrealm/schema";
import { buildAcidBaseSolveRequest } from "./acidbase/request.js";
import { createAcidBaseAdapter } from "./acidbase/index.js";
import {
  createNativeJsonAdapter,
  loadNativeWasmExecutor,
  type NativeBackendPayload,
} from "./native-backend.js";

const parameters = {
  Kw: 1e-14,
  Ka_HOAc: 1.7539e-5,
  Davies_A: 0.509,
  Davies_b: 0.3,
  standardMolality: 1,
  neutralAcidActivityCoefficient: 1,
  waterActivity: 1,
  numericPrecisionSignificantDigits: 12,
  numericPolicyVersion: 1,
};

const request = buildAcidBaseSolveRequest({
  waterMass: kilogram(1),
  liquidVolume: litre(0.1),
  temperature: kelvin(298.15),
  componentAmounts: [{ componentId: "HCl", amount: mol(0.1) }],
  indicators: [],
});

function payload(overrides: Partial<NativeBackendPayload> = {}): NativeBackendPayload {
  return {
    schemaVersion: 3,
    backend: {
      id: "acidbase-monoprotic-davies",
      version: "2.0.0",
    },
    requestHash: "sha256:native-test-request",
    result: {
      schemaVersion: 3,
      status: "OK",
      state: {
        schemaVersion: 3,
        species: [
          ["H+", 0.1, 0.8],
          ["OH-", 1e-13, 0.8],
          ["HOAc", 0, 1],
          ["OAc-", 0, 0.8],
          ["Na+", 0, 0.8],
          ["Cl-", 0.1, 0.8],
        ].map(([symbol, molality, gamma]) => ({
          symbol: symbol as string,
          reducedMolality: { value: molality as number, unit: "1" },
          molality: { value: molality as number, unit: "mol/kg" },
          amount: { value: molality as number, unit: "mol" },
          activityCoefficient: { value: gamma as number, unit: "1" },
          activity: { value: (molality as number) * (gamma as number), unit: "1" },
        })),
        ionicStrengthMolal: { value: 0.1, unit: "mol/kg" },
        ionicStrengthReduced: { value: 0.1, unit: "1" },
        modelPh: { value: 1.1, unit: "1" },
        indicators: [],
        validity: { inDomain: true, withinProposedAccuracyEnvelope: true },
        provenance: {
          modelId: "acidbase-monoprotic-davies",
          modelVersion: "2.0.0",
          activityModel: "Davies",
          category: "calculated",
          parameters,
        },
      },
    },
    expressions: [
      "charge-balance",
      "water-autoprotolysis",
      "ionic-strength-fixed-point",
      "davies-activity-coefficient",
      "activity-definition",
    ].map((equationId) => ({
      schemaVersion: 4,
      id: equationId,
      equationId,
      label: "exact",
      expression: equationId,
      formula: equationId,
      substitutions: [{ symbol: "m(H+)", value: 0.1, unit: "mol/kg" }],
      omittedTerms: [],
      producerId: "scientific-core",
      producerVersion: "3.0.0",
      modelId: "acidbase-monoprotic-davies",
      modelVersion: "2.0.0",
      sourceStateHash: "sha256:native-test-request",
    })),
    ...overrides,
  };
}

function payloadForRequest(
  requestJson: string,
  overrides: Partial<NativeBackendPayload> = {},
): NativeBackendPayload {
  const requestHash = `sha256:${hashUtf8(requestJson)}`;
  const base = payload({
    requestHash,
    expressions: payload().expressions.map((expression) => ({
      ...(expression as Record<string, unknown>),
      sourceStateHash: requestHash,
    })),
  });
  return { ...base, ...overrides };
}

describe("native scientific backend facade", () => {
  let nativeAdapter: Awaited<ReturnType<typeof createNativeJsonAdapter>>;

  beforeAll(async () => {
    const bytes = await readFile(
      new URL("../dist/wasm/chemrealm_sci_core.wasm", import.meta.url),
    );
    const arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    nativeAdapter = createNativeJsonAdapter(await loadNativeWasmExecutor(arrayBuffer));
  });

  it("serializes a canonical request and validates the native payload identity", async () => {
    let received = "";
    const adapter = createNativeJsonAdapter(async (requestJson) => {
      received = requestJson;
      return JSON.stringify(payloadForRequest(requestJson));
    });

    const result = await adapter.solve(request);

    expect(JSON.parse(received)).toMatchObject({
      schemaVersion: 3,
      waterMass: { value: 1, unit: "kg" },
      liquidVolume: { value: 0.1, unit: "L" },
      temperature: { value: 298.15, unit: "K" },
    });
    expect(result.status).toBe("OK");
    if (result.status === "OK") {
      expect(result.state.provenance.modelVersion).toBe("2.0.0");
    }
  });

  it("rejects a payload from another backend version instead of selecting a fallback", async () => {
    const adapter = createNativeJsonAdapter(async (requestJson) =>
      JSON.stringify(payloadForRequest(requestJson, {
        backend: { id: "acidbase-monoprotic-davies", version: "1.0.0" },
      })),
    );

    await expect(adapter.solve(request)).rejects.toThrow(/backend identity mismatch/);
  });

  it("rejects a payload whose request hash is not derived from the sent request", async () => {
    const adapter = createNativeJsonAdapter(async () => JSON.stringify(payload()));

    await expect(adapter.solve(request)).rejects.toThrow(/request hash mismatch/);
  });

  it("surfaces backend initialization or execution failure without using TypeScript", async () => {
    const adapter = createNativeJsonAdapter(async () => {
      throw new Error("WASM unavailable");
    });

    await expect(adapter.solve(request)).rejects.toThrow("WASM unavailable");
  });

  it("returns INVALID_INPUT at the facade boundary without invoking native code", async () => {
    let invoked = false;
    const adapter = createNativeJsonAdapter(async () => {
      invoked = true;
      return JSON.stringify(payload());
    });
    const malformed = {
      ...request,
      solutes: [{
        soluteId: "HOAc",
        amount: mol(0.1),
        mode: "monoprotic-equilibrium",
      }],
    } as never;

    const result = await adapter.solve(malformed);

    expect(result.status).toBe("INVALID_INPUT");
    expect(invoked).toBe(false);
  });

  it("executes the same strict JSON bridge from the self-hosted release WASM", async () => {
    const bytes = await readFile(
      new URL("../dist/wasm/chemrealm_sci_core.wasm", import.meta.url),
    );
    const arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const execute = await loadNativeWasmExecutor(arrayBuffer);
    const adapter = createNativeJsonAdapter(execute);
    const result = await adapter.solve(request);

    expect(result.status).toBe("OK");
  });

  it.each([
    ["HCl", [{ componentId: "HCl", amount: mol(0.1) }]],
    ["NaOH", [{ componentId: "NaOH", amount: mol(0.1) }]],
    ["HOAc", [{ componentId: "HOAc", amount: mol(0.1) }]],
    ["NaOAc", [{ componentId: "NaOAc", amount: mol(0.1) }]],
    ["buffer", [
      { componentId: "HOAc", amount: mol(0.1) },
      { componentId: "NaOH", amount: mol(0.05) },
    ]],
    ["high legal HCl", [{ componentId: "HCl", amount: mol(0.49) }]],
    ["dilute HCl", [{ componentId: "HCl", amount: mol(1e-6) }]],
  ] as const)("matches the legacy TypeScript model for %s", async (_name, componentAmounts) => {
    const candidate: SolveRequest = buildAcidBaseSolveRequest({
      waterMass: kilogram(1),
      liquidVolume: litre(0.1),
      temperature: kelvin(298.15),
      componentAmounts,
      indicators: [{
        indicatorId: "phenolphthalein",
        kaIn: thermodynamicConstant(3.98e-10),
      }],
    });
    const [legacy, native] = await Promise.all([
      createAcidBaseAdapter().solve(candidate),
      nativeAdapter.solve(candidate),
    ]);
    expect(native.status).toBe(legacy.status);
    if (legacy.status !== "OK" || native.status !== "OK") return;
    expect(native.state.ionicStrengthMolal.value)
      .toBeCloseTo(legacy.state.ionicStrengthMolal.value, 12);
    expect(native.state.modelPh.value).toBeCloseTo(legacy.state.modelPh.value, 12);
    expect(native.state.species.map((species) => species.symbol))
      .toEqual(legacy.state.species.map((species) => species.symbol));
    native.state.species.forEach((species, index) => {
      expect(species.molality)
        .toBeCloseTo(legacy.state.species[index]!.molality, 12);
      expect(species.activity.value)
        .toBeCloseTo(legacy.state.species[index]!.activity.value, 12);
    });
  });
});
