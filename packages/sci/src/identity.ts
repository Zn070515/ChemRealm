import {
  parseSolveResult,
  serializeSolveResult,
  ScientificExpressionSchema,
  SolveResultSchema,
  type ModelDescriptor,
  type ScientificExpression,
  type SolveResult,
  type SolverConfig,
} from "@chemrealm/schema";
import type {
  SolveRequest,
} from "@chemrealm/schema";
import type {
  ScientificExecution,
  ScientificExecutionAdapter,
  ScientificExecutionContext,
  SolverAdapter,
} from "./adapter.js";

function cloneAndFreezeObject<T extends object>(value: T): T {
  return Object.freeze({ ...value }) as T;
}

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
      ionicStrengthMolalMax: cloneAndFreezeObject(
        descriptor.validity.ionicStrengthMolalMax,
      ),
      species: Object.freeze([...descriptor.validity.species]),
      components: Object.freeze([...descriptor.validity.components]),
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

function validateSolveResult(result: unknown): SolveResult {
  try {
    const dto = serializeSolveResult(result as SolveResult);
    return parseSolveResult(SolveResultSchema.parse(dto));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new TypeError(`solver returned malformed result: ${detail}`, {
      cause: error,
    });
  }
}

function validateScientificExecution(
  execution: unknown,
  model: ModelDescriptor,
  solverConfig: SolverConfig,
  context: ScientificExecutionContext,
): ScientificExecution {
  if (!isRecord(execution)) {
    throw new TypeError("scientific execution must be an object");
  }
  if (execution.sourceStateHash !== context.sourceStateHash) {
    throw new TypeError("scientific execution source identity mismatch");
  }
  const result = assertSolveResultIdentity(execution.result, model, solverConfig);
  if (!Array.isArray(execution.expressions)) {
    throw new TypeError("scientific execution expressions must be an array");
  }
  const expressions = execution.expressions.map((expression) => {
    const parsed = ScientificExpressionSchema.parse(expression);
    if (
      parsed.modelId !== model.id ||
      parsed.modelVersion !== model.version ||
      parsed.sourceStateHash !== context.sourceStateHash
    ) {
      throw new TypeError("scientific expression identity mismatch");
    }
    return Object.freeze({
      ...parsed,
      substitutions: Object.freeze(parsed.substitutions.map((entry) => Object.freeze({ ...entry }))),
      omittedTerms: Object.freeze([...parsed.omittedTerms]),
    }) as unknown as ScientificExpression;
  });
  if (result.status === "OK" && expressions.length === 0) {
    throw new TypeError("successful scientific execution omitted expressions");
  }
  if (result.status !== "OK" && expressions.length > 0) {
    throw new TypeError("non-OK scientific execution emitted expressions");
  }
  return Object.freeze({
    result,
    expressions: Object.freeze(expressions),
    sourceStateHash: context.sourceStateHash,
  });
}

/** Enforce that a successful result names the identity that produced it. */
export function assertSolveResultIdentity(
  result: unknown,
  model: ModelDescriptor,
  solverConfig: SolverConfig,
): SolveResult {
  const validated = validateSolveResult(result);
  if (validated.status !== "OK") return validated;

  const state = validated.state;
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
  return validated;
}

/** Freeze a registered adapter's public identity while preserving its solve seam. */
export function freezeSolverAdapter(
  adapter: ScientificExecutionAdapter,
): ScientificExecutionAdapter;
export function freezeSolverAdapter(adapter: SolverAdapter): SolverAdapter;
export function freezeSolverAdapter(
  adapter: SolverAdapter,
): SolverAdapter | ScientificExecutionAdapter {
  const model = cloneAndFreezeModelDescriptor(adapter.model);
  const solverConfig = cloneAndFreezeSolverConfig(adapter.solverConfig);
  const frozen = {
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
  };
  if (typeof (adapter as Partial<ScientificExecutionAdapter>)
    .solveWithScientificArtifacts === "function") {
    const executionAdapter = adapter as ScientificExecutionAdapter;
    return Object.freeze({
      ...frozen,
      solveWithScientificArtifacts: async (
        request: SolveRequest,
        context: ScientificExecutionContext,
      ): Promise<ScientificExecution> =>
        validateScientificExecution(
          await executionAdapter.solveWithScientificArtifacts(request, context),
          model,
          solverConfig,
          context,
        ),
    });
  }
  return Object.freeze(frozen);
}
