/** A deliberately trivial adapter used to exercise the M3 contract. */

import type {
  ModelDescriptor,
  SolveRequest,
  SolveResult,
} from "@chemrealm/schema";

import type { SolverAdapter } from "./adapter.js";
import { validateSolveRequest } from "./request.js";

export type StubOutcome =
  | SolveResult
  | ((request: SolveRequest) => SolveResult | Promise<SolveResult>);

export interface StubSolverAdapterOptions {
  readonly descriptor: ModelDescriptor;
  readonly outcome: StubOutcome;
}

function outOfDomain(
  descriptor: ModelDescriptor,
  reason: string,
): SolveResult {
  return {
    status: "MODEL_OUT_OF_DOMAIN",
    reason,
    nearestSupported: descriptor,
  };
}

function domainReason(
  request: SolveRequest,
  descriptor: ModelDescriptor,
): string | undefined {
  if (request.temperature < descriptor.validity.temperature.min) {
    return "temperature is below the model validity range";
  }
  if (request.temperature > descriptor.validity.temperature.max) {
    return "temperature is above the model validity range";
  }

  const unsupportedSolute = request.solutes.find(
    (solute) => !descriptor.validity.species.includes(solute.soluteId),
  );
  if (unsupportedSolute) {
    return `solute ${unsupportedSolute.soluteId} is outside the model species set`;
  }
  return undefined;
}

export class StubSolverAdapter implements SolverAdapter {
  readonly id: string;
  readonly version: string;
  readonly models: readonly ModelDescriptor[];
  private readonly outcome: StubOutcome;

  constructor(options: StubSolverAdapterOptions) {
    this.id = options.descriptor.id;
    this.version = options.descriptor.version;
    this.models = [options.descriptor];
    this.outcome = options.outcome;
  }

  async solve(request: SolveRequest): Promise<SolveResult> {
    const violations = validateSolveRequest(request);
    if (violations.length > 0) {
      return { status: "INVALID_INPUT", violations };
    }

    const reason = domainReason(request, this.models[0]!);
    if (reason !== undefined) {
      return outOfDomain(this.models[0]!, reason);
    }

    return typeof this.outcome === "function"
      ? await this.outcome(request)
      : this.outcome;
  }
}
