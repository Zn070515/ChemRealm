import type {
  ModelDescriptor,
  SolveRequest,
  SolveResult,
  SolverConfig,
} from "@chemrealm/schema";
import type { SolverAdapter } from "./adapter.js";

/** Copy and freeze the nested model identity before it crosses a registry boundary. */
export function cloneAndFreezeModelDescriptor(
  descriptor: ModelDescriptor,
): ModelDescriptor {
  return Object.freeze({
    id: descriptor.id,
    version: descriptor.version,
    description: descriptor.description,
    validity: Object.freeze({
      temperature: Object.freeze({
        min: descriptor.validity.temperature.min,
        max: descriptor.validity.temperature.max,
      }),
      ionicStrengthMolalMax: descriptor.validity.ionicStrengthMolalMax,
      species: Object.freeze([...descriptor.validity.species]),
      solvent: descriptor.validity.solvent,
      phase: descriptor.validity.phase,
      activityCorrected: descriptor.validity.activityCorrected,
    }),
  });
}

/** Copy and freeze the complete persisted solver identity. */
export function cloneAndFreezeSolverConfig(
  config: SolverConfig,
): SolverConfig {
  return Object.freeze({
    id: config.id,
    version: config.version,
    parameters: Object.freeze({ ...config.parameters }),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasExactParameters(
  actual: unknown,
  expected: Readonly<Record<string, number>>,
): boolean {
  if (!isRecord(actual)) return false;
  const actualKeys = Object.keys(actual);
  const expectedKeys = Object.keys(expected);
  if (actualKeys.length !== expectedKeys.length) return false;
  return expectedKeys.every(
    (key) =>
      typeof actual[key] === "number" &&
      Object.is(actual[key], expected[key]),
  );
}

/** Enforce that a successful result names the identity that produced it. */
export function assertSolveResultIdentity(
  result: SolveResult,
  model: ModelDescriptor,
  solverConfig: SolverConfig,
): SolveResult {
  if (!isRecord(result)) {
    throw new TypeError("solver returned a non-object result");
  }
  if (result.status !== "OK") return result as SolveResult;

  const state = result.state;
  const provenance = isRecord(state) && isRecord(state.provenance)
    ? state.provenance
    : undefined;
  const mismatches: string[] = [];
  if (provenance === undefined) {
    mismatches.push("missing provenance");
  } else {
    if (provenance.modelId !== model.id) mismatches.push("modelId");
    if (provenance.modelVersion !== model.version) {
      mismatches.push("modelVersion");
    }
    if (!hasExactParameters(provenance.parameters, solverConfig.parameters)) {
      mismatches.push("parameters");
    }
  }

  if (mismatches.length > 0) {
    throw new TypeError(
      `solver returned OK state with provenance identity mismatch: ${mismatches.join(", ")}`,
    );
  }
  return result as SolveResult;
}

/** Freeze a registered adapter's public identity while preserving its solve seam. */
export function freezeSolverAdapter(
  adapter: SolverAdapter,
): SolverAdapter {
  const model = cloneAndFreezeModelDescriptor(adapter.model);
  const solverConfig = cloneAndFreezeSolverConfig(adapter.solverConfig);
  return Object.freeze({
    id: adapter.id,
    version: adapter.version,
    model,
    solverConfig,
    solve: async (request: SolveRequest): Promise<SolveResult> =>
      assertSolveResultIdentity(
        await adapter.solve(request),
        model,
        solverConfig,
      ),
  });
}
