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

/** Exact backend identity selected by a composition boundary for new worlds. */
export interface SolverSelectionPolicy {
  readonly id: string;
  readonly version: string;
}

/** Runtime-only facts derived by a composition boundary for one resolution. */
export interface SolverResolutionContext {
  /** Actual input components present in the resolved scenario. */
  readonly requiredComponents?: readonly string[];
}

const keyOf = (id: string, version: string): string => `${id}\u0000${version}`;

/** Explain every failed machine-checkable requirement for one model. */
export function checkModelCompatibility(
  requirements: SolverRequirements,
  model: ModelDescriptor,
  context: SolverResolutionContext = {},
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
  const missingComponents = (context.requiredComponents ?? []).filter(
    (component) => !validity.components.includes(component),
  );
  if (missingComponents.length > 0) {
    reasons.push(`input components not supported: ${missingComponents.join(", ")}`);
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

  resolve(
    requirements: SolverRequirements,
    context: SolverResolutionContext = {},
    selection: SolverSelectionPolicy,
  ): SolverResolution {
    if (this.adapters.size === 0) {
      return {
        status: "unavailable",
        requirements,
        reason: "no solver adapters are registered",
      };
    }
    const selected = this.adapters.get(keyOf(selection.id, selection.version));
    if (selected === undefined) {
      return {
        status: "unavailable",
        requirements,
        reason: `selected solver adapter ${selection.id}@${selection.version} is unavailable; exact selection does not fall back to another adapter`,
      };
    }

    const compatibility = checkModelCompatibility(requirements, selected.model, context);
    if (compatibility.compatible) {
      return {
        status: "compatible",
        adapter: selected,
        model: selected.model,
        solverConfig: selected.solverConfig,
      };
    }

    return {
      status: "incompatible",
      requirements,
      reason: `selected solver ${selected.id}@${selected.version} is incompatible: ${compatibility.reasons.join("; ")}`,
    };
  }
}

/** Resolver facade used by world creation; it never chooses a near match. */
export class SolverResolver {
  constructor(private readonly registry: SolverRegistry) {}

  resolve(
    requirements: SolverRequirements,
    context: SolverResolutionContext = {},
    selection: SolverSelectionPolicy,
  ): SolverResolution {
    return this.registry.resolve(requirements, context, selection);
  }
}

export function resolveSolver(
  registry: SolverRegistry,
  requirements: SolverRequirements,
  context: SolverResolutionContext = {},
  selection: SolverSelectionPolicy,
): SolverResolution {
  return new SolverResolver(registry).resolve(requirements, context, selection);
}
