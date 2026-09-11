/** Snapshot caches for replay acceleration (`ADR-0002`). */

import { CURRENT_SCHEMA_VERSION, type SolverConfigDto } from "@chemrealm/schema";

import { deepFreeze, parseWorldState, serializeWorldState, stateHash, type WorldState } from "./state.js";
import { hashCanonical } from "./hash.js";

export type SnapshotReason = "interval" | "fork";

export interface WorldSnapshot {
  readonly schemaVersion: number;
  readonly sequence: number;
  readonly state: ReturnType<typeof serializeWorldState>;
  readonly stateHash: string;
  readonly solverConfig: SolverConfigDto;
  readonly reason: SnapshotReason;
}

/** The interval is a policy, not an event boundary requirement. */
export function shouldSnapshot(
  state: Pick<WorldState, "sequence">,
  reason: SnapshotReason,
  interval = 50,
): boolean {
  if (reason === "fork") return true;
  return interval > 0 && state.sequence > 0 && state.sequence % interval === 0;
}

export function createSnapshot(state: WorldState, reason: SnapshotReason): WorldSnapshot {
  const serialized = serializeWorldState(state);
  return deepFreeze({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    sequence: state.sequence,
    state: serialized,
    stateHash: stateHash(state),
    solverConfig: {
      id: state.solverConfig.id,
      version: state.solverConfig.version,
      parameters: { ...state.solverConfig.parameters },
    },
    reason,
  });
}

export function validateSnapshot(input: unknown): WorldSnapshot {
  const value = input as Partial<WorldSnapshot>;
  if (
    value.schemaVersion !== CURRENT_SCHEMA_VERSION ||
    typeof value.sequence !== "number" ||
    !Number.isInteger(value.sequence) ||
    value.sequence < 0
  ) {
    throw new TypeError("snapshot: invalid metadata");
  }
  if (
    value.state === undefined ||
    typeof value.stateHash !== "string" ||
    value.solverConfig === undefined ||
    (value.reason !== "interval" && value.reason !== "fork")
  ) {
    throw new TypeError("snapshot: incomplete cache");
  }
  const state = parseWorldState(value.state);
  if (state.sequence !== value.sequence) throw new Error("snapshot: sequence mismatch");
  if (stateHash(state) !== value.stateHash) throw new Error("snapshot: state hash mismatch");
  if (state.solverConfig.id !== value.solverConfig.id || state.solverConfig.version !== value.solverConfig.version) {
    throw new Error("snapshot: solver identity mismatch");
  }
  if (hashCanonical(state.solverConfig) !== hashCanonical(value.solverConfig)) {
    throw new Error("snapshot: solver parameters mismatch");
  }
  const normalized: WorldSnapshot = {
    schemaVersion: value.schemaVersion,
    sequence: value.sequence,
    state: serializeWorldState(state),
    stateHash: value.stateHash,
    solverConfig: value.solverConfig,
    reason: value.reason,
  };
  return deepFreeze(normalized);
}
