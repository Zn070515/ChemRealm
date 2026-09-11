/** Append-only event log operations for the World Runtime (`ADR-0002`). */

import {
  DomainEventSchema,
  WorldCreatedSchema,
  type DomainEvent,
} from "@chemrealm/schema";

import { canonicalizeDomainEvent } from "./command.js";
import { createInitialState, deepFreeze } from "./state.js";
import { WorldRuntimeError } from "./reduce.js";

export type EventLog = readonly DomainEvent[];

function fail(code: string, detail: string): never {
  throw new WorldRuntimeError(code, detail);
}

/** Create a frozen log whose first fact is the self-contained genesis event. */
export function createLog(input: unknown): EventLog {
  const genesis = WorldCreatedSchema.safeParse(input);
  if (!genesis.success) fail("GENESIS_REQUIRED", "the first log event must be WorldCreated");
  if (genesis.data.seq !== 0) fail("SEQUENCE_MISMATCH", "WorldCreated must have seq 0");
  createInitialState(genesis.data);
  return deepFreeze([canonicalizeDomainEvent(genesis.data)]);
}

/** Parse and append one event without changing the prior log. */
export function appendEvent(log: EventLog, input: unknown): EventLog {
  const event = DomainEventSchema.safeParse(input);
  if (!event.success) fail("INVALID_EVENT", "event failed the domain schema");
  if (log.length === 0) {
    if (event.data.type !== "WorldCreated" || event.data.seq !== 0) {
      fail("GENESIS_REQUIRED", "an empty log accepts only WorldCreated at seq 0");
    }
    createInitialState(event.data);
    return deepFreeze([canonicalizeDomainEvent(event.data)]);
  }
  const last = log[log.length - 1];
  if (last === undefined) fail("INVALID_LOG", "log has no readable tail");
  if (event.data.type === "WorldCreated") fail("DUPLICATE_GENESIS", "WorldCreated can appear only at seq 0");
  if (event.data.seq !== last.seq + 1) {
    fail("SEQUENCE_MISMATCH", `expected event seq ${last.seq + 1}, got ${event.data.seq}`);
  }
  return deepFreeze([...log, canonicalizeDomainEvent(event.data)]);
}

/** Validate an externally loaded log before replay. */
export function parseLog(input: unknown): EventLog {
  const parsed = DomainEventSchema.array().safeParse(input);
  if (!parsed.success) fail("INVALID_LOG", "event log failed the domain schema");
  if (parsed.data.length === 0 || parsed.data[0]?.type !== "WorldCreated") {
    fail("GENESIS_REQUIRED", "a log must begin with WorldCreated");
  }
  createInitialState(parsed.data[0]);
  let previous = -1;
  for (const event of parsed.data) {
    if (event.seq !== previous + 1) fail("SEQUENCE_MISMATCH", "event log sequences must be contiguous");
    previous = event.seq;
  }
  return deepFreeze(parsed.data.map(canonicalizeDomainEvent));
}
