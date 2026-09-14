import {
  NATIVE_BRIDGE_SCHEMA_VERSION,
  NativeBackendPayloadSchema,
  NativeSolveEnvelopeSchema,
  SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
  VERSION_MANIFEST,
  SolveResultSchema,
  hashUtf8,
  parseSolveResult,
  serializeSolveRequest,
  type ModelDescriptor,
  type NativeBackendPayloadDto,
  type ScientificExpression,
  type SolveRequest,
  type SolveResult,
  type SolverConfig,
} from "@chemrealm/schema";

export { NATIVE_BRIDGE_SCHEMA_VERSION } from "@chemrealm/schema";

import type {
  ScientificExecution,
  ScientificExecutionAdapter,
  ScientificExecutionContext,
} from "./adapter.js";
import { validateSolveRequest } from "./request.js";
import {
  assertSolveResultIdentity,
  cloneAndFreezeModelDescriptor,
  cloneAndFreezeSolverConfig,
} from "./identity.js";
import {
  parseNativeModelContract,
} from "./acidbase/model.js";
import { assertScientificExpressionSet } from "./expressions.js";

export const NATIVE_SCIENTIFIC_MODEL_VERSION =
  VERSION_MANIFEST.scientific.acidBase.nativeVersion;
export const NATIVE_SCIENTIFIC_BACKEND_ID = VERSION_MANIFEST.scientific.acidBase.id;

/** A strict executor for the schema-owned native bridge envelope. */
export type NativeJsonExecutor = (requestJson: string) => Promise<string> | string;

/** Compatibility alias for tests and host tooling; shape is schema-owned. */
export type NativeBackendPayload = NativeBackendPayloadDto;

export type NativeSolveOutcome = ScientificExecution & {
  readonly requestHash: string;
};

export interface NativeExpressionSolverAdapter extends ScientificExecutionAdapter {
  solveWithScientificArtifacts(
    request: SolveRequest,
    context: ScientificExecutionContext,
  ): Promise<NativeSolveOutcome>;
}

export const NATIVE_UNBOUND_SOURCE_STATE_HASH = "native-unbound-source";

function nativeModel(): ModelDescriptor {
  return cloneAndFreezeModelDescriptor(parseNativeModelContract().model);
}

function nativeSolverConfig(): SolverConfig {
  return cloneAndFreezeSolverConfig(parseNativeModelContract().solverConfig);
}

function assertSourceStateHash(context: ScientificExecutionContext): string {
  if (
    typeof context.sourceStateHash !== "string" ||
    context.sourceStateHash.trim().length === 0
  ) {
    throw new TypeError("native execution sourceStateHash must be a non-empty string");
  }
  return context.sourceStateHash;
}

function parseNativePayload(
  rawJson: string,
  model: ModelDescriptor,
  solverConfig: SolverConfig,
  expectedRequestHash: string,
  expectedSourceStateHash: string,
): NativeSolveOutcome {
  let raw: unknown;
  try {
    raw = JSON.parse(rawJson) as unknown;
  } catch (error) {
    throw new TypeError("native backend returned invalid JSON", { cause: error });
  }

  let payload: NativeBackendPayloadDto;
  try {
    payload = NativeBackendPayloadSchema.parse(raw);
  } catch (error) {
    throw new TypeError("native backend returned a schema-invalid payload", { cause: error });
  }
  if (
    payload.backend.id !== model.id ||
    payload.backend.version !== model.version
  ) {
    throw new TypeError("native backend identity mismatch");
  }
  if (payload.requestHash !== expectedRequestHash) {
    throw new TypeError("native backend request hash mismatch");
  }
  if (payload.sourceStateHash !== expectedSourceStateHash) {
    throw new TypeError("native backend source state hash mismatch");
  }

  const result = assertSolveResultIdentity(
    parseSolveResult(SolveResultSchema.parse(payload.result)),
    model,
    solverConfig,
  );
  const expressions: ScientificExpression[] = [];
  for (const expression of payload.expressions) {
    if (
      expression.modelId !== model.id ||
      expression.modelVersion !== model.version ||
      expression.sourceStateHash !== expectedSourceStateHash ||
      expression.schemaVersion !== SCIENTIFIC_EXPRESSION_SCHEMA_VERSION
    ) {
      throw new TypeError("native expression identity does not match execution context");
    }
    if (
      expression.producerVersion !==
      VERSION_MANIFEST.scientific.acidBase.expressionProducerVersion
    ) {
      throw new TypeError("native expression producer version mismatch");
    }
    expressions.push(Object.freeze({
      ...expression,
      substitutions: Object.freeze(expression.substitutions.map((entry) => Object.freeze({ ...entry }))),
      omittedTerms: Object.freeze([...expression.omittedTerms]),
    }) as unknown as ScientificExpression);
  }
  if (result.status !== "OK" && expressions.length > 0) {
    throw new TypeError("native backend emitted expressions for a non-OK result");
  }
  if (result.status === "OK") {
    for (const observation of result.state.indicatorObservations) {
      if (observation.sourceReplayHash !== expectedSourceStateHash) {
        throw new TypeError("native indicator observation source identity mismatch");
      }
    }
    assertScientificExpressionSet(
      expressions,
      result.state,
      model.id,
      model.version,
      expectedSourceStateHash,
    );
  }

  return Object.freeze({
    result,
    expressions: Object.freeze(expressions),
    sourceStateHash: expectedSourceStateHash,
    requestHash: payload.requestHash,
  });
}

function serializeEnvelope(
  request: SolveRequest,
  context: ScientificExecutionContext,
): string {
  const sourceStateHash = assertSourceStateHash(context);
  return JSON.stringify(NativeSolveEnvelopeSchema.parse({
    bridgeSchemaVersion: NATIVE_BRIDGE_SCHEMA_VERSION,
    request: serializeSolveRequest(request),
    context: { sourceStateHash },
  }));
}

/**
 * Create a native adapter from a strict JSON executor. The executor receives
 * the schema-owned envelope; it never receives a hand-maintained request DTO.
 */
export function createNativeJsonAdapter(
  execute: NativeJsonExecutor,
): NativeExpressionSolverAdapter {
  const model = nativeModel();
  const solverConfig = nativeSolverConfig();
  const solveWithScientificArtifacts = async (
    request: SolveRequest,
    context: ScientificExecutionContext,
  ): Promise<NativeSolveOutcome> => {
    const sourceStateHash = assertSourceStateHash(context);
    const violations = validateSolveRequest(request);
    if (violations.length > 0) {
      return Object.freeze({
        result: { status: "INVALID_INPUT" as const, violations },
        expressions: Object.freeze([]),
        sourceStateHash,
        requestHash: "",
      });
    }
    const requestJson = serializeEnvelope(request, context);
    return parseNativePayload(
      await execute(requestJson),
      model,
      solverConfig,
      `sha256:${hashUtf8(requestJson)}`,
      sourceStateHash,
    );
  };

  return Object.freeze({
    id: NATIVE_SCIENTIFIC_BACKEND_ID,
    version: NATIVE_SCIENTIFIC_MODEL_VERSION,
    model,
    solverConfig,
    solveWithScientificArtifacts,
    solve: async (request: SolveRequest): Promise<SolveResult> =>
      (await solveWithScientificArtifacts(request, {
        sourceStateHash: NATIVE_UNBOUND_SOURCE_STATE_HASH,
      })).result,
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
  readonly chemrealm_solve_json?: (pointer: number, length: number) => bigint | number;
  readonly chemrealm_solve_multiform_json?: (pointer: number, length: number) => bigint | number;
  readonly chemrealm_solve_multiform_coupled_json?: (pointer: number, length: number) => bigint | number;
}

type WasmSolveExport =
  | "chemrealm_solve_json"
  | "chemrealm_solve_multiform_json"
  | "chemrealm_solve_multiform_coupled_json";

function wasmExports(instance: RawWasmInstance, solveExport: WasmSolveExport): RawWasmExports {
  const exports = instance.exports as Partial<RawWasmExports>;
  if (
    exports.memory === undefined ||
    exports.chemrealm_alloc === undefined ||
    exports.chemrealm_dealloc === undefined ||
    typeof exports[solveExport] !== "function"
  ) {
    throw new TypeError(`native WASM module is missing the ${solveExport} JSON ABI`);
  }
  return exports as RawWasmExports;
}

/** Adapt the raw pointer/length WASM ABI to the strict JSON executor. */
function createWasmExecutor(
  instance: RawWasmInstance,
  solveExport: WasmSolveExport,
): NativeJsonExecutor {
  const exports = wasmExports(instance, solveExport);
  const solve = exports[solveExport];
  if (typeof solve !== "function") {
    throw new TypeError(`native WASM module is missing the ${solveExport} JSON ABI`);
  }
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
      packed = solve(pointer, input.length);
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
    try {
      return decoder.decode(output);
    } finally {
      exports.chemrealm_dealloc(outputPointer, outputLength);
    }
  };
}

export function createWasmJsonExecutor(instance: RawWasmInstance): NativeJsonExecutor {
  return createWasmExecutor(instance, "chemrealm_solve_json");
}

/** Adapt the candidate ordinary multiform ABI without touching the legacy bridge. */
export function createWasmMultiformJsonExecutor(
  instance: RawWasmInstance,
): NativeJsonExecutor {
  return createWasmExecutor(instance, "chemrealm_solve_multiform_json");
}

/** Adapt the candidate coupled ordinary multiform JSON export. */
export function createWasmMultiformCoupledJsonExecutor(
  instance: RawWasmInstance,
): NativeJsonExecutor {
  return createWasmExecutor(instance, "chemrealm_solve_multiform_coupled_json");
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

/** Load the candidate ordinary multiform JSON export from self-hosted WASM. */
export async function loadNativeMultiformWasmExecutor(
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
  return createWasmMultiformJsonExecutor(
    "instance" in instantiated ? instantiated.instance : instantiated,
  );
}

/** Load the candidate coupled ordinary multiform JSON export from WASM. */
export async function loadNativeMultiformCoupledWasmExecutor(
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
  return createWasmMultiformCoupledJsonExecutor(
    "instance" in instantiated ? instantiated.instance : instantiated,
  );
}
