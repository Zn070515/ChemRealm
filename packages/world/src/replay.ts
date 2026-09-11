/** Deterministic event-log replay for the World Runtime (`ADR-0002`). */

import { type DomainEvent } from "@chemrealm/schema";

import { parseLog, type EventLog } from "./log.js";
import { reduce, type ReduceOptions } from "./reduce.js";
import { validateSnapshot, type WorldSnapshot } from "./snapshot.js";
import { parseWorldState, replayHash, stateHash, type WorldState } from "./state.js";
import { scienceHash } from "./hash.js";

export interface ReplayOptions extends ReduceOptions {
  readonly deriveScience?: (state: WorldState) => unknown;
  readonly snapshots?: readonly WorldSnapshot[];
}

export interface ReplayBoundary {
  readonly sequence: number;
  readonly replayHash: string;
  readonly scienceHash: string | null;
}

export interface ReplayResult {
  readonly state: WorldState;
  readonly replayHash: string;
  readonly scienceHash: string | null;
  readonly boundaries: readonly ReplayBoundary[];
}

function scienceAt(state: WorldState, deriveScience: ReplayOptions["deriveScience"]): string | null {
  return deriveScience === undefined ? null : scienceHash(deriveScience(state));
}

function boundary(state: WorldState, deriveScience: ReplayOptions["deriveScience"]): ReplayBoundary {
  return {
    sequence: state.sequence,
    replayHash: stateHash(state),
    scienceHash: scienceAt(state, deriveScience),
  };
}

function snapshotStart(
  log: EventLog,
  snapshots: readonly WorldSnapshot[] | undefined,
): { state: WorldState | undefined; sequence: number } {
  if (snapshots === undefined || snapshots.length === 0) return { state: undefined, sequence: -1 };
  const valid = snapshots
    .flatMap((snapshot) => {
      try {
        return [validateSnapshot(snapshot)];
      } catch {
        // A snapshot is a disposable acceleration cache. A corrupt cache must
        // be ignored so it can never make a self-contained log unreplayable.
        return [];
      }
    })
    .filter((snapshot) => snapshot.sequence < log.length)
    .sort((a, b) => b.sequence - a.sequence)[0];
  if (valid === undefined) return { state: undefined, sequence: -1 };
  const eventAtBoundary = log[valid.sequence];
  if (eventAtBoundary === undefined || eventAtBoundary.seq !== valid.sequence) {
    return { state: undefined, sequence: -1 };
  }
  return { state: parseWorldState(valid.state), sequence: valid.sequence };
}

/** Fold a complete, serialized log; snapshots may skip an already validated prefix. */
export function replay(input: unknown, options: ReplayOptions = {}): ReplayResult {
  const log = parseLog(input);
  const start = snapshotStart(log, options.snapshots);
  let state = start.state;
  const boundaries: ReplayBoundary[] = [];
  let startSequence = start.sequence;

  if (state === undefined) {
    const genesis = log[0];
    if (genesis === undefined) throw new Error("replay: log has no genesis event");
    state = reduce(undefined, genesis, options);
    boundaries.push(boundary(state, options.deriveScience));
    startSequence = state.sequence;
  }

  for (const event of log) {
    if (event.seq <= startSequence) continue;
    state = reduce(state, event, options);
    boundaries.push(boundary(state, options.deriveScience));
  }

  const finalState = state;
  return {
    state: finalState,
    replayHash: replayHash(finalState),
    scienceHash: scienceAt(finalState, options.deriveScience),
    boundaries,
  };
}

/** Make the event type visible to API consumers without importing schema internals. */
export type ReplayEvent = DomainEvent;
