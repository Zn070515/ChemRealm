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
  SolveRequest,
  SolveResult,
} from "@chemrealm/schema";

export type SolverId = string;

export interface SolverAdapter {
  readonly id: SolverId;
  readonly version: string;
  readonly models: readonly ModelDescriptor[];

  solve(request: SolveRequest): Promise<SolveResult>;
}
