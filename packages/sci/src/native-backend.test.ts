import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import {
  hashUtf8,
  kilogram,
  kelvin,
  litre,
  mol,
  SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
  SCIENTIFIC_SCHEMA_VERSION,
  thermodynamicConstant,
  VERSION_MANIFEST,
  type SolveRequest,
} from "@chemrealm/schema";
import { buildAcidBaseSolveRequest } from "./acidbase/request.js";
import { buildAcidBaseSolverConfig } from "./acidbase/model.js";
import { createAcidBaseAdapter } from "./acidbase/index.js";
import {
  createNativeJsonAdapter,
  createWasmJsonExecutor,
  loadNativeWasmExecutor,
  NATIVE_BRIDGE_SCHEMA_VERSION,
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
  numericPolicyVersion: VERSION_MANIFEST.scientific.numericPolicyVersion,
};

const request = buildAcidBaseSolveRequest({
  waterMass: kilogram(1),
  liquidVolume: litre(0.1),
  temperature: kelvin(298.15),
  componentAmounts: [{ componentId: "HCl", amount: mol(0.1) }],
  indicators: [],
  solverConfig: buildAcidBaseSolverConfig(),
});

function payload(overrides: Partial<NativeBackendPayload> = {}): NativeBackendPayload {
  return {
    bridgeSchemaVersion: NATIVE_BRIDGE_SCHEMA_VERSION,
    backend: {
      id: VERSION_MANIFEST.scientific.acidBase.id,
      version: VERSION_MANIFEST.scientific.acidBase.nativeVersion,
    },
    requestHash: "sha256:native-test-request",
    sourceStateHash: "sha256:native-test-source",
    result: {
      schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
      status: "OK",
      state: {
        schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
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
          modelVersion: VERSION_MANIFEST.scientific.acidBase.nativeVersion,
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
      schemaVersion: SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
      id: equationId,
      equationId,
      label: "exact",
      expression: equationId,
      formula: equationId,
      substitutions: [{ symbol: "m(H+)", value: 0.1, unit: "mol/kg" }],
      omittedTerms: [],
      producerId: "scientific-core",
      producerVersion: VERSION_MANIFEST.scientific.acidBase.expressionProducerVersion,
      modelId: VERSION_MANIFEST.scientific.acidBase.id,
      modelVersion: VERSION_MANIFEST.scientific.acidBase.nativeVersion,
      sourceStateHash: "sha256:native-test-source",
    })) as NativeBackendPayload["expressions"],
    ...overrides,
  };
}

function payloadForRequest(
  requestJson: string,
  overrides: Partial<NativeBackendPayload> = {},
): NativeBackendPayload {
  const requestHash = `sha256:${hashUtf8(requestJson)}`;
  const sourceStateHash = (JSON.parse(requestJson) as {
    context: { sourceStateHash: string };
  }).context.sourceStateHash;
  const base = payload({
    requestHash,
    expressions: payload().expressions.map((expression) => ({
      ...(expression as Record<string, unknown>),
      sourceStateHash,
    })) as NativeBackendPayload["expressions"],
    sourceStateHash,
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
      bridgeSchemaVersion: NATIVE_BRIDGE_SCHEMA_VERSION,
      request: {
        schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
        waterMass: { value: 1, unit: "kg" },
        liquidVolume: { value: 0.1, unit: "L" },
        temperature: { value: 298.15, unit: "K" },
      },
      context: { sourceStateHash: "native-unbound-source" },
    });
    expect(result.status).toBe("OK");
    if (result.status === "OK") {
      expect(result.state.provenance.modelVersion).toBe(
        VERSION_MANIFEST.scientific.acidBase.nativeVersion,
      );
    }
  });

  it("keeps the caller's replay source identity separate from the wire request hash", async () => {
    let received = "";
    const adapter = createNativeJsonAdapter(async (requestJson) => {
      received = requestJson;
      return JSON.stringify(payloadForRequest(requestJson));
    });
    const sourceStateHash = "sha256:world-sequence-44";

    const execution = await adapter.solveWithScientificArtifacts(request, {
      sourceStateHash,
    });
    const envelope = JSON.parse(received) as {
      context: { sourceStateHash: string };
    };

    expect(execution.sourceStateHash).toBe(sourceStateHash);
    expect(execution.requestHash).not.toBe(sourceStateHash);
    expect(envelope.context.sourceStateHash).toBe(sourceStateHash);
    expect(execution.expressions[0]?.sourceStateHash).toBe(sourceStateHash);
  });

  it("rejects a payload from another backend version instead of selecting a fallback", async () => {
    const adapter = createNativeJsonAdapter(async (requestJson) =>
      JSON.stringify(payloadForRequest(requestJson, {
        backend: {
          id: VERSION_MANIFEST.scientific.acidBase.id,
          version: VERSION_MANIFEST.scientific.acidBase.legacyVersion,
        },
      })),
    );

    await expect(adapter.solve(request)).rejects.toThrow(/backend identity mismatch/);
  });

  it("rejects a payload whose request hash is not derived from the sent request", async () => {
    const adapter = createNativeJsonAdapter(async () => JSON.stringify(payload()));

    await expect(adapter.solve(request)).rejects.toThrow(/request hash mismatch/);
  });

  it("rejects a native expression with a producer version outside the manifest", async () => {
    const adapter = createNativeJsonAdapter(async (requestJson) =>
      JSON.stringify((() => {
        const valid = payloadForRequest(requestJson);
        return payloadForRequest(requestJson, {
          expressions: valid.expressions.map((expression) => ({
            ...expression,
            producerVersion: "invalid-test-version",
          })) as NativeBackendPayload["expressions"],
        });
      })()),
    );

    await expect(adapter.solve(request)).rejects.toThrow(/expression producer version/i);
  });

  it("rejects duplicate or incomplete native equation sets", async () => {
    const duplicate = createNativeJsonAdapter(async (requestJson) =>
      JSON.stringify((() => {
        const valid = payloadForRequest(requestJson);
        return payloadForRequest(requestJson, {
          expressions: [
            ...valid.expressions,
            valid.expressions[0]!,
          ] as NativeBackendPayload["expressions"],
        });
      })()),
    );
    await expect(duplicate.solve(request)).rejects.toThrow(/exact scientific expression set/i);

    const acidPayload = structuredClone(payload()) as NativeBackendPayload;
    if (acidPayload.result.status !== "OK") throw new Error("fixture must be OK");
    for (const species of acidPayload.result.state.species) {
      if (species.symbol === "HOAc") {
        species.molality.value = 0.06;
        species.reducedMolality.value = 0.06;
        species.activity.value = 0.06;
        species.amount.value = 0.06;
      }
      if (species.symbol === "OAc-") {
        species.molality.value = 0.04;
        species.reducedMolality.value = 0.04;
        species.activity.value = 0.032;
        species.amount.value = 0.04;
      }
    }
    const incomplete = createNativeJsonAdapter(async (requestJson) =>
      JSON.stringify(payloadForRequest(requestJson, {
        result: acidPayload.result,
      })),
    );
    await expect(incomplete.solve(request)).rejects.toThrow(/exact scientific expression set/i);
  });

  it("surfaces backend initialization or execution failure without using TypeScript", async () => {
    const adapter = createNativeJsonAdapter(async () => {
      throw new Error("WASM unavailable");
    });

    await expect(adapter.solve(request)).rejects.toThrow("WASM unavailable");
  });

  it("deallocates a malformed native output buffer when UTF-8 decoding fails", () => {
    const memory = new ArrayBuffer(128);
    const deallocations: Array<[number, number]> = [];
    const outputPointer = 32;
    new Uint8Array(memory)[outputPointer] = 0xc3;

    const execute = createWasmJsonExecutor({
      exports: {
        memory: { buffer: memory },
        chemrealm_alloc: () => 8,
        chemrealm_dealloc: (pointer: number, length: number) => {
          deallocations.push([pointer, length]);
        },
        chemrealm_solve_json: () => (1n << 32n) | BigInt(outputPointer),
      },
    } as never);

    expect(() => execute("x")).toThrow();
    expect(deallocations).toEqual([
      [8, 1],
      [outputPointer, 1],
    ]);
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
      solverConfig: buildAcidBaseSolverConfig(),
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
