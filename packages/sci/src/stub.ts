/** A deliberately trivial adapter used to exercise the M3 contract. */

import type {
  ModelDescriptor,
  SolveRequest,
  SolveResult,
  SolverConfig,
} from "@chemrealm/schema";

import type { SolverAdapter } from "./adapter.js";
import {
  assertSolveResultIdentity,
  cloneAndFreezeModelDescriptor,
  cloneAndFreezeSolverConfig,
} from "./identity.js";
import { validateSolveRequest } from "./request.js";

export type StubOutcome =
  | SolveResult
  | ((request: SolveRequest) => SolveResult | Promise<SolveResult>);

export interface StubSolverAdapterOptions {
  readonly descriptor: ModelDescriptor;
  readonly parameters?: Readonly<Record<string, number>>;
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
    (solute) => !descriptor.validity.components.includes(solute.soluteId),
  );
  if (unsupportedSolute) {
    return `solute ${unsupportedSolute.soluteId} is outside the model species set`;
  }
  return undefined;
}

export class StubSolverAdapter implements SolverAdapter {
  readonly id: string;
  readonly version: string;
  readonly model: ModelDescriptor;
  readonly solverConfig: SolverConfig;
  private readonly outcome: StubOutcome;

  constructor(options: StubSolverAdapterOptions) {
    this.id = options.descriptor.id;
    this.version = options.descriptor.version;
    this.model = cloneAndFreezeModelDescriptor(options.descriptor);
    this.solverConfig = cloneAndFreezeSolverConfig({
      id: this.id,
      version: this.version,
      parameters: { ...(options.parameters ?? {}) },
    });
    this.outcome = options.outcome;
    Object.freeze(this);
  }

  async solve(request: SolveRequest): Promise<SolveResult> {
    const violations = validateSolveRequest(request);
    if (violations.length > 0) {
      return { status: "INVALID_INPUT", violations };
    }

    const reason = domainReason(request, this.model);
    if (reason !== undefined) {
      return outOfDomain(this.model, reason);
    }

    const result = typeof this.outcome === "function"
      ? await this.outcome(request)
      : this.outcome;
    return assertSolveResultIdentity(result, this.model, this.solverConfig);
  }
}
