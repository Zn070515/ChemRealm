/**
 * Composition-level genesis boundary.
 *
 * The World Runtime remains a synchronous event fold and the Scientific Core
 * remains an asynchronous adapter boundary. This module is the place where a
 * scenario's requirements are resolved before the first world event exists;
 * solving a committed world is a later orchestration step.
 */

import {
  CURRENT_SCHEMA_VERSION,
  ScenarioSnapshotSchema,
  WorldCreatedSchema,
  type WorldCreated,
} from "@chemrealm/schema";
import {
  parseSolverRequirements,
  type SolverRegistry,
  type SolverResolution,
} from "@chemrealm/sci";
import {
  createInitialState,
  scenarioSnapshotHash,
  type SerializedWorldCreated,
} from "@chemrealm/world";

export interface WorldCreationInput {
  readonly worldId: string;
  readonly scenarioSnapshot: unknown;
  readonly seed: number | null;
}

export type CompatibleSolverResolution = Extract<
  SolverResolution,
  { readonly status: "compatible" }
>;

export type WorldCreationResult =
  | {
      readonly accepted: true;
      readonly event: SerializedWorldCreated;
      readonly resolution: CompatibleSolverResolution;
    }
  | {
      readonly accepted: false;
      readonly status: "incompatible" | "unavailable";
      readonly reason: string;
    };

function rejected(
  resolution: Exclude<SolverResolution, CompatibleSolverResolution>,
): Extract<WorldCreationResult, { readonly accepted: false }> {
  return {
    accepted: false,
    status: resolution.status,
    reason: resolution.reason,
  };
}

/** Resolve requirements before emitting the only legal genesis event. */
export function createWorld(
  registry: SolverRegistry,
  input: WorldCreationInput,
): WorldCreationResult {
  const snapshot = ScenarioSnapshotSchema.parse(input.scenarioSnapshot);
  const requirements = parseSolverRequirements(snapshot.modelRequirements);
  const resolution = registry.resolve(requirements);
  if (resolution.status !== "compatible") return rejected(resolution);

  const event: WorldCreated = WorldCreatedSchema.parse({
    seq: 0,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    type: "WorldCreated",
    payload: {
      worldId: input.worldId,
      scenarioSnapshot: snapshot,
      contentHash: scenarioSnapshotHash(snapshot),
      solverConfig: resolution.solverConfig,
      seed: input.seed,
    },
  });

  // Exercise the same genesis validation the runtime applies to a loaded log.
  // This keeps the composition boundary from emitting an event it cannot fold.
  createInitialState(event);
  return { accepted: true, event, resolution };
}
