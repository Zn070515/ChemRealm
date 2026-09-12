/** Exact solver lookup and machine-checkable requirements resolution. */

import {
  SolverConfigSchema,
  type ModelDescriptor,
  type SolverConfig,
} from "@chemrealm/schema";

import type { SolverAdapter } from "./adapter.js";
import { freezeSolverAdapter } from "./identity.js";
import type { SolverRequirements } from "./request.js";

export type ExactSolverLookup =
  | { readonly status: "found"; readonly adapter: SolverAdapter }
  | {
      readonly status: "unavailable";
      readonly reason: string;
      readonly id: string;
      readonly version: string;
    };

export type SolverResolution =
  | {
      readonly status: "compatible";
      readonly adapter: SolverAdapter;
      readonly model: ModelDescriptor;
      readonly solverConfig: SolverConfig;
    }
  | {
      readonly status: "incompatible";
      readonly reason: string;
      readonly requirements: SolverRequirements;
    }
  | {
      readonly status: "unavailable";
      readonly reason: string;
      readonly requirements: SolverRequirements;
    };

export interface CompatibilityResult {
  readonly compatible: boolean;
  readonly reasons: readonly string[];
}

const keyOf = (id: string, version: string): string => `${id}\u0000${version}`;

/** Explain every failed machine-checkable requirement for one model. */
export function checkModelCompatibility(
  requirements: SolverRequirements,
  model: ModelDescriptor,
): CompatibilityResult {
  const reasons: string[] = [];
  const { temperature } = requirements;
  const validity = model.validity;

  if (
    temperature < validity.temperature.min ||
    temperature > validity.temperature.max
  ) {
    reasons.push(
      `temperature ${temperature} K is outside ${validity.temperature.min}–${validity.temperature.max} K`,
    );
  }

  const missingSpecies = requirements.species.filter(
    (species) => !validity.species.includes(species),
  );
  if (missingSpecies.length > 0) {
    reasons.push(`species not supported: ${missingSpecies.join(", ")}`);
  }
  if (requirements.solvent !== validity.solvent) {
    reasons.push(
      `solvent ${requirements.solvent} is not ${validity.solvent}`,
    );
  }
  if (requirements.phase !== validity.phase) {
    reasons.push(`phase ${requirements.phase} is not ${validity.phase}`);
  }
  if (requirements.activityCorrected && !validity.activityCorrected) {
    reasons.push("activity correction is required but the model does not provide it");
  }

  return { compatible: reasons.length === 0, reasons };
}

export class SolverRegistry {
  private readonly adapters = new Map<string, SolverAdapter>();

  constructor(adapters: readonly SolverAdapter[] = []) {
    for (const adapter of adapters) this.register(adapter);
  }

  register(adapter: SolverAdapter): void {
    if (adapter.id.trim().length === 0 || adapter.version.trim().length === 0) {
      throw new TypeError("solver adapter id and version must not be empty");
    }
    if (adapter.model === undefined || adapter.solverConfig === undefined) {
      throw new TypeError(
        "solver adapter must declare exactly one model and a solverConfig",
      );
    }
    if (
      adapter.id !== adapter.model.id ||
      adapter.version !== adapter.model.version ||
      adapter.id !== adapter.solverConfig.id ||
      adapter.version !== adapter.solverConfig.version
    ) {
      throw new TypeError(
        "solver adapter, model, and solverConfig identity must match exactly",
      );
    }
    if (!SolverConfigSchema.safeParse(adapter.solverConfig).success) {
      throw new TypeError("solverConfig does not satisfy its schema");
    }

    const key = keyOf(adapter.id, adapter.version);
    if (this.adapters.has(key)) {
      throw new Error(
        `solver adapter ${adapter.id}@${adapter.version} is already registered`,
      );
    }
    this.adapters.set(key, freezeSolverAdapter(adapter));
  }

  lookup(id: string, version: string): ExactSolverLookup {
    const adapter = this.adapters.get(keyOf(id, version));
    if (adapter !== undefined) return { status: "found", adapter };
    return {
      status: "unavailable",
      id,
      version,
      reason: `solver adapter ${id}@${version} is unavailable; registry lookup is exact and does not fall back to another version`,
    };
  }

  get(id: string, version: string): SolverAdapter | undefined {
    const result = this.lookup(id, version);
    return result.status === "found" ? result.adapter : undefined;
  }

  list(): readonly SolverAdapter[] {
    return [...this.adapters.values()];
  }

  resolve(requirements: SolverRequirements): SolverResolution {
    const candidates = [...this.adapters.values()];
    if (candidates.length === 0) {
      return {
        status: "unavailable",
        requirements,
        reason: "no solver adapters are registered",
      };
    }

    const failures: string[] = [];
    for (const adapter of candidates) {
      const model = adapter.model;
      const compatibility = checkModelCompatibility(requirements, model);
      if (compatibility.compatible) {
        return { status: "compatible", adapter, model, solverConfig: adapter.solverConfig };
      }
      failures.push(
        `${adapter.id}@${adapter.version}: ${compatibility.reasons.join("; ")}`,
      );
    }

    return {
      status: "incompatible",
      requirements,
      reason: `no registered solver satisfies the requirements: ${failures.join(" | ")}`,
    };
  }
}

/** Resolver facade used by world creation; it never chooses a near match. */
export class SolverResolver {
  constructor(private readonly registry: SolverRegistry) {}

  resolve(requirements: SolverRequirements): SolverResolution {
    return this.registry.resolve(requirements);
  }
}

export function resolveSolver(
  registry: SolverRegistry,
  requirements: SolverRequirements,
): SolverResolution {
  return new SolverResolver(registry).resolve(requirements);
}
