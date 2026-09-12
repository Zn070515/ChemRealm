/** First-class world fork operations (`ADR-0002`). */

import { CURRENT_SCHEMA_VERSION, type DomainEvent } from "@chemrealm/schema";

import { appendEvent, type EventLog } from "./log.js";
import { reduce } from "./reduce.js";
import { createSnapshot, type WorldSnapshot } from "./snapshot.js";
import { deepFreeze, stateHash, type WorldState } from "./state.js";

/** Internal branch storage: an immutable shared prefix plus an own suffix. */
export interface BranchLog {
  readonly prefix: EventLog;
  readonly suffix: EventLog;
  readonly forkSequence: number;
}

export interface ForkResult {
  readonly event: Extract<DomainEvent, { type: "WorldBranched" }>;
  readonly log: BranchLog;
  readonly state: WorldState;
  readonly forkSnapshot: WorldSnapshot;
}

/**
 * Fork at the supplied present state. The parent log is never mutated; the
 * child stores the parent log by reference and owns only its suffix.
 */
export function forkWorld(
  parentState: WorldState,
  parentLog: EventLog,
  childWorldId: string,
): ForkResult {
  if (childWorldId.length === 0) throw new TypeError("branch: childWorldId must not be empty");
  if (childWorldId === parentState.worldId) throw new Error("branch: childWorldId must differ from parent");
  const last = parentLog[parentLog.length - 1];
  if (last === undefined || last.seq !== parentState.sequence) {
    throw new Error("branch: parent state is not at the log tip");
  }
  if (stateHash(parentState) !== stateHash(reduceLogTip(parentLog))) {
    throw new Error("branch: parent state hash does not match the log tip");
  }
  const event: Extract<DomainEvent, { type: "WorldBranched" }> = {
    seq: parentState.sequence + 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    type: "WorldBranched",
    payload: {
      childWorldId,
      parentWorldId: parentState.worldId,
      forkSequence: parentState.sequence,
      forkStateHash: stateHash(parentState),
    },
  };
  const log = deepFreeze({
    prefix: parentLog,
    suffix: deepFreeze([event]),
    forkSequence: parentState.sequence,
  });
  const state = reduce(parentState, event);
  return {
    event,
    log,
    state,
    forkSnapshot: createSnapshot(parentState, "fork", parentLog),
  };
}

/** Append an event to a branch-owned suffix without copying the shared prefix. */
export function appendBranchEvent(branch: BranchLog, input: unknown): BranchLog {
  const suffix = appendEvent(branch.suffix, input);
  return deepFreeze({
    prefix: branch.prefix,
    suffix,
    forkSequence: branch.forkSequence,
  });
}

function reduceLogTip(log: EventLog): WorldState {
  let state: WorldState | undefined;
  for (const event of log) state = reduce(state, event);
  if (state === undefined) throw new Error("branch: parent log is empty");
  return state;
}
