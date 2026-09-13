import {
  SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
  SCIENTIFIC_SCHEMA_VERSION,
  ScientificExpressionSchema,
  SolveResultSchema,
  hashUtf8,
  parseSolveResult,
  type ModelDescriptor,
  type ScientificExpression,
  type SolveRequest,
  type SolveResult,
  type SolverConfig,
} from "@chemrealm/schema";

import type { SolverAdapter } from "./adapter.js";
import { validateSolveRequest } from "./request.js";
import {
  assertSolveResultIdentity,
  cloneAndFreezeModelDescriptor,
  cloneAndFreezeSolverConfig,
} from "./identity.js";
import {
  buildAcidBaseModelDescriptor,
  buildAcidBaseSolverConfig,
} from "./acidbase/model.js";

export const NATIVE_SCIENTIFIC_MODEL_VERSION = "2.0.0" as const;
export const NATIVE_SCIENTIFIC_BACKEND_ID = "acidbase-monoprotic-davies" as const;

export type NativeJsonExecutor = (requestJson: string) => Promise<string> | string;

/** The untrusted wire envelope returned by a native host/WASM executor. */
export interface NativeBackendPayload {
  readonly schemaVersion: number;
  readonly backend: { readonly id: string; readonly version: string };
  readonly requestHash: string;
  readonly result: unknown;
  readonly expressions: readonly unknown[];
}

export interface NativeSolveOutcome {
  readonly result: SolveResult;
  readonly expressions: readonly ScientificExpression[];
  /** Present for backend-produced payloads; absent for facade validation failures. */
  readonly requestHash?: string;
}

export interface NativeExpressionSolverAdapter extends SolverAdapter {
  solveWithExpressions(request: SolveRequest): Promise<NativeSolveOutcome>;
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`native backend ${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function finiteNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`native backend ${name} must be finite`);
  }
  return value;
}

function quantityValue(value: unknown, name: string): number {
  if (typeof value === "number") return finiteNumber(value, name);
  const parsed = record(value, name);
  return finiteNumber(parsed.value, name);
}

function serializeRequest(request: SolveRequest): string {
  return JSON.stringify({
    schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
    waterMass: { value: quantityValue(request.waterMass, "waterMass"), unit: "kg" },
    liquidVolume: { value: quantityValue(request.liquidVolume, "liquidVolume"), unit: "L" },
    solutes: request.solutes.map((solute) => ({
      soluteId: solute.soluteId,
      amount: { value: quantityValue(solute.amount, "solute amount"), unit: "mol" },
      mode: solute.mode,
      ...(solute.mode === "monoprotic-equilibrium"
        ? { ka: { value: quantityValue(solute.ka, "solute Ka"), unit: "1" } }
        : {}),
    })),
    temperature: { value: quantityValue(request.temperature, "temperature"), unit: "K" },
    indicators: request.indicators.map((indicator) => ({
      indicatorId: indicator.indicatorId,
      kaIn: { value: quantityValue(indicator.kaIn, "indicator Ka"), unit: "1" },
    })),
  });
}

function nativeModel(): ModelDescriptor {
  const legacy = buildAcidBaseModelDescriptor();
  return cloneAndFreezeModelDescriptor({ ...legacy, version: NATIVE_SCIENTIFIC_MODEL_VERSION });
}

function nativeSolverConfig(): SolverConfig {
  const legacy = buildAcidBaseSolverConfig();
  return cloneAndFreezeSolverConfig({ ...legacy, version: NATIVE_SCIENTIFIC_MODEL_VERSION });
}

function parseNativePayload(
  rawJson: string,
  model: ModelDescriptor,
  expectedRequestHash: string,
): NativeSolveOutcome {
  let raw: unknown;
  try {
    raw = JSON.parse(rawJson) as unknown;
  } catch (error) {
    throw new TypeError("native backend returned invalid JSON", { cause: error });
  }
  const payload = record(raw, "payload") as unknown as NativeBackendPayload;
  if (payload.schemaVersion !== SCIENTIFIC_SCHEMA_VERSION) {
    throw new TypeError("native backend schema version mismatch");
  }
  const backend = record(payload.backend, "identity");
  if (
    backend.id !== model.id ||
    backend.version !== model.version
  ) {
    throw new TypeError("native backend identity mismatch");
  }
  if (typeof payload.requestHash !== "string" || payload.requestHash.trim().length === 0) {
    throw new TypeError("native backend request hash is missing");
  }
  if (payload.requestHash !== expectedRequestHash) {
    throw new TypeError("native backend request hash mismatch");
  }
  if (!Array.isArray(payload.expressions)) {
    throw new TypeError("native backend expressions must be an array");
  }

  let result: SolveResult;
  try {
    result = parseSolveResult(SolveResultSchema.parse(payload.result));
  } catch (error) {
    throw new TypeError("native backend returned a schema-invalid result", { cause: error });
  }
  const expressions: ScientificExpression[] = [];
  try {
    for (const expression of payload.expressions) {
      const parsed = ScientificExpressionSchema.parse(expression);
      if (
        parsed.modelId !== model.id ||
        parsed.modelVersion !== model.version ||
        parsed.sourceStateHash !== payload.requestHash ||
        parsed.schemaVersion !== SCIENTIFIC_EXPRESSION_SCHEMA_VERSION
      ) {
        throw new TypeError("native expression identity does not match its backend payload");
      }
      expressions.push(parsed);
    }
  } catch (error) {
    throw new TypeError("native backend returned an invalid expression payload", { cause: error });
  }

  if (result.status === "OK") {
    const ids = expressions.map((expression) => expression.equationId);
    const required = [
      "charge-balance",
      "water-autoprotolysis",
      "ionic-strength-fixed-point",
      "davies-activity-coefficient",
      "activity-definition",
    ];
    if (!required.every((id) => ids.some((candidate) => candidate === id))) {
      throw new TypeError("native backend omitted a required scientific expression");
    }
  } else if (expressions.length > 0) {
    throw new TypeError("native backend emitted expressions for a non-OK result");
  }

  return Object.freeze({
    result: assertSolveResultIdentity(result, model, nativeSolverConfig()),
    expressions: Object.freeze(expressions),
    requestHash: payload.requestHash,
  });
}

/**
 * Create a candidate native adapter from any strict JSON executor. The
 * executor is intentionally injected: host tests can use the Rust binary and
 * the browser loader can use the bundled WASM module without changing the
 * scientific validation path.
 */
export function createNativeJsonAdapter(
  execute: NativeJsonExecutor,
): NativeExpressionSolverAdapter {
  const model = nativeModel();
  const solverConfig = nativeSolverConfig();
  const solveWithExpressions = async (request: SolveRequest): Promise<NativeSolveOutcome> => {
    const violations = validateSolveRequest(request);
    if (violations.length > 0) {
      return Object.freeze({
        result: { status: "INVALID_INPUT" as const, violations },
        expressions: Object.freeze([]),
      });
    }
    const requestJson = serializeRequest(request);
    const payload = parseNativePayload(
      await execute(requestJson),
      model,
      `sha256:${hashUtf8(requestJson)}`,
    );
    return Object.freeze({
      ...payload,
      result: assertSolveResultIdentity(payload.result, model, solverConfig),
    });
  };
  return Object.freeze({
    id: NATIVE_SCIENTIFIC_BACKEND_ID,
    version: NATIVE_SCIENTIFIC_MODEL_VERSION,
    model,
    solverConfig,
    solveWithExpressions,
    solve: async (request: SolveRequest) => (await solveWithExpressions(request)).result,
  });
}

interface RawWasmMemory {
  readonly buffer: ArrayBufferLike;
}

interface RawWasmInstance {
  readonly exports: Record<string, unknown>;
}

interface RawWasmExports {
  readonly memory: RawWasmMemory;
  readonly chemrealm_alloc: (length: number) => number;
  readonly chemrealm_dealloc: (pointer: number, length: number) => void;
  readonly chemrealm_solve_json: (pointer: number, length: number) => bigint | number;
}

function wasmExports(instance: RawWasmInstance): RawWasmExports {
  const exports = instance.exports as Partial<RawWasmExports>;
  if (
    exports.memory === undefined ||
    exports.chemrealm_alloc === undefined ||
    exports.chemrealm_dealloc === undefined ||
    exports.chemrealm_solve_json === undefined
  ) {
    throw new TypeError("native WASM module is missing the strict JSON ABI");
  }
  return exports as RawWasmExports;
}

/** Adapt the raw pointer/length WASM ABI to the strict JSON executor. */
export function createWasmJsonExecutor(instance: RawWasmInstance): NativeJsonExecutor {
  const exports = wasmExports(instance);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  return (requestJson: string): string => {
    const input = encoder.encode(requestJson);
    const pointer = exports.chemrealm_alloc(input.length);
    if (!Number.isInteger(pointer) || pointer <= 0) {
      throw new Error("native WASM input allocation failed");
    }
    new Uint8Array(exports.memory.buffer, pointer, input.length).set(input);
    let packed: bigint | number;
    try {
      packed = exports.chemrealm_solve_json(pointer, input.length);
    } finally {
      exports.chemrealm_dealloc(pointer, input.length);
    }
    const packedValue = typeof packed === "bigint" ? packed : BigInt(packed);
    if (packedValue === 0n) throw new Error("native WASM solver rejected the bridge request");
    const outputPointer = Number(packedValue & 0xffff_ffffn);
    const outputLength = Number((packedValue >> 32n) & 0xffff_ffffn);
    if (outputPointer <= 0 || outputLength <= 0) {
      throw new Error("native WASM returned an invalid JSON buffer");
    }
    const output = new Uint8Array(exports.memory.buffer, outputPointer, outputLength);
    const decoded = decoder.decode(output);
    exports.chemrealm_dealloc(outputPointer, outputLength);
    return decoded;
  };
}

/** Load a self-hosted WASM module. Failure is explicit and never falls back. */
export async function loadNativeWasmExecutor(
  source: string | URL | ArrayBuffer,
): Promise<NativeJsonExecutor> {
  const bytes = source instanceof ArrayBuffer
    ? source
    : await (await fetch(source)).arrayBuffer();
  const wasmApi = (globalThis as unknown as {
    WebAssembly?: {
      instantiate(
        module: ArrayBuffer,
        imports: Record<string, unknown>,
      ): Promise<RawWasmInstance | { readonly instance: RawWasmInstance }>;
    };
  }).WebAssembly;
  if (wasmApi === undefined) throw new Error("WebAssembly is unavailable in this runtime");
  const instantiated = await wasmApi.instantiate(bytes, {});
  return createWasmJsonExecutor("instance" in instantiated ? instantiated.instance : instantiated);
}
