/** Deterministic event-log replay for the World Runtime (`ADR-0002`). */

import { DomainEventSchema, type DomainEvent } from "@chemrealm/schema";

import { canonicalizeDomainEvent } from "./command.js";
import { parseLog, eventPrefixHash, type EventLog } from "./log.js";
import { reduce, type ReduceOptions } from "./reduce.js";
import { validateSnapshot, type WorldSnapshot } from "./snapshot.js";
import { parseWorldState, replayHash, stateHash, type WorldState } from "./state.js";
import { deepFreeze } from "./state.js";
import type { BranchLog } from "./branch.js";
import { scienceHash } from "./hash.js";

export interface ReplayOptions extends ReduceOptions {
  /**
   * Synchronous projection/hash callback only. It is not a SolverAdapter and
   * is never awaited; async scientific orchestration belongs at the
   * composition boundary after a deterministic world state is committed.
   */
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

interface EventSource {
  readonly parts: readonly EventLog[];
  readonly length: number;
}

function eventAt(source: EventSource, sequence: number): DomainEvent | undefined {
  for (const part of source.parts) {
    const first = part[0];
    const last = part[part.length - 1];
    if (first === undefined || last === undefined) continue;
    if (sequence >= first.seq && sequence <= last.seq) return part[sequence - first.seq];
  }
  return undefined;
}

function forEachEvent(source: EventSource, visit: (event: DomainEvent) => void): void {
  for (const part of source.parts) {
    for (const event of part) visit(event);
  }
}

function prefixHashAt(source: EventSource, sequence: number): string {
  const prefix: DomainEvent[] = [];
  forEachEvent(source, (event) => {
    if (event.seq <= sequence) prefix.push(event);
  });
  return eventPrefixHash(prefix);
}

function branchSuffix(input: unknown, prefix: EventLog): EventLog {
  const parsed = DomainEventSchema.array().safeParse(input);
  if (!parsed.success || parsed.data.length === 0) {
    throw new Error("branch replay: suffix must contain at least WorldBranched");
  }
  const prefixTip = prefix[prefix.length - 1];
  const genesis = prefix[0];
  if (prefixTip === undefined || genesis?.type !== "WorldCreated") {
    throw new Error("branch replay: prefix must be a valid root log");
  }
  let expectedSequence = prefixTip.seq + 1;
  for (const event of parsed.data) {
    if (event.type === "WorldCreated") {
      throw new Error("branch replay: suffix cannot contain WorldCreated");
    }
    if (event.seq !== expectedSequence) {
      throw new Error(`branch replay: expected event seq ${expectedSequence}, got ${event.seq}`);
    }
    expectedSequence += 1;
  }
  const first = parsed.data[0];
  if (
    first?.type !== "WorldBranched" ||
    first.payload.forkSequence !== prefixTip.seq ||
    first.payload.parentWorldId !== genesis.payload.worldId
  ) {
    throw new Error("branch replay: suffix does not identify the prefix fork point");
  }
  return deepFreeze(parsed.data.map(canonicalizeDomainEvent));
}

function branchSource(branch: BranchLog): EventSource {
  const prefix = parseLog(branch.prefix);
  if (branch.forkSequence !== (prefix[prefix.length - 1]?.seq ?? -1)) {
    throw new Error("branch replay: forkSequence does not match the prefix tip");
  }
  const suffix = branchSuffix(branch.suffix, prefix);
  return { parts: [prefix, suffix], length: prefix.length + suffix.length };
}

function snapshotStart(
  source: EventSource,
  snapshots: readonly WorldSnapshot[] | undefined,
): { state: WorldState | undefined; sequence: number } {
  if (snapshots === undefined || snapshots.length === 0) return { state: undefined, sequence: -1 };
  const candidates = snapshots
    .flatMap((snapshot) => {
      try {
        return [validateSnapshot(snapshot)];
      } catch {
        // A snapshot is a disposable acceleration cache. A corrupt cache must
        // be ignored so it can never make a self-contained log unreplayable.
        return [];
      }
    })
    .filter((snapshot) => snapshot.sequence < source.length)
    .sort((a, b) => b.sequence - a.sequence);
  const genesis = eventAt(source, 0);
  if (genesis?.type !== "WorldCreated") return { state: undefined, sequence: -1 };
  for (const valid of candidates) {
    const eventAtBoundary = eventAt(source, valid.sequence);
    if (eventAtBoundary === undefined || eventAtBoundary.seq !== valid.sequence) continue;
    if (valid.genesisContentHash !== genesis.payload.contentHash) continue;
    if (valid.prefixHash !== prefixHashAt(source, valid.sequence)) continue;
    return { state: parseWorldState(valid.state), sequence: valid.sequence };
  }
  return { state: undefined, sequence: -1 };
}

function replaySource(source: EventSource, options: ReplayOptions): ReplayResult {
  const start = snapshotStart(source, options.snapshots);
  let state = start.state;
  const boundaries: ReplayBoundary[] = [];
  let startSequence = start.sequence;

  if (state === undefined) {
    const genesis = eventAt(source, 0);
    if (genesis === undefined) throw new Error("replay: log has no genesis event");
    state = reduce(undefined, genesis, options);
    boundaries.push(boundary(state, options.deriveScience));
    startSequence = state.sequence;
  }

  forEachEvent(source, (event) => {
    if (event.seq <= startSequence) return;
    state = reduce(state, event, options);
    boundaries.push(boundary(state, options.deriveScience));
  });

  const finalState = state;
  return {
    state: finalState,
    replayHash: replayHash(finalState),
    scienceHash: scienceAt(finalState, options.deriveScience),
    boundaries,
  };
}

/** Fold a complete, serialized root log; snapshots may skip its prefix. */
export function replay(input: unknown, options: ReplayOptions = {}): ReplayResult {
  const log = parseLog(input);
  return replaySource({ parts: [log], length: log.length }, options);
}

/** Replay an internal shared-prefix/suffix branch without flattening its log. */
export function replayBranch(branch: BranchLog, options: ReplayOptions = {}): ReplayResult {
  return replaySource(branchSource(branch), options);
}

/** Make the event type visible to API consumers without importing schema internals. */
export type ReplayEvent = DomainEvent;
