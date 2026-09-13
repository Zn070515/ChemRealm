/**
 * Scientific Reality Core adapter boundary (`ADR-0003`).
 *
 * The schema package owns the request/result shapes and their DTO bridges.
 * This package owns the behaviour boundary: a solver is identified, declares
 * its applicability, and returns a tagged result asynchronously. There is no
 * scalar convenience method that could detach a number from its provenance.
 */

import type {
  ModelDescriptor,
  ScientificExpression,
  SolveRequest,
  SolveResult,
  SolverConfig,
} from "@chemrealm/schema";

export type SolverId = string;

/** Opaque identity of the committed state that supplied a solve request. */
export interface ScientificExecutionContext {
  readonly sourceStateHash: string;
}

/** Scientific artifacts produced by an execution-capable adapter. */
export interface ScientificExecution {
  readonly result: SolveResult;
  readonly expressions: readonly ScientificExpression[];
  readonly sourceStateHash: string;
}

export interface SolverAdapter {
  readonly id: SolverId;
  readonly version: string;
  /** v0 adapters expose exactly one model and its persisted solver identity. */
  readonly model: ModelDescriptor;
  readonly solverConfig: SolverConfig;

  solve(request: SolveRequest): Promise<SolveResult>;
}

/** Optional capability for adapters that own symbolic scientific artifacts. */
export interface ScientificExecutionAdapter extends SolverAdapter {
  solveWithScientificArtifacts(
    request: SolveRequest,
    context: ScientificExecutionContext,
  ): Promise<ScientificExecution>;
}

export function isScientificExecutionAdapter(
  adapter: SolverAdapter,
): adapter is ScientificExecutionAdapter {
  return typeof (adapter as Partial<ScientificExecutionAdapter>)
    .solveWithScientificArtifacts === "function";
}
