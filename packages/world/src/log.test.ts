import { describe, expect, it } from "vitest";

import { WORLD_CREATED } from "../test/fixtures.js";
import { emitCommand } from "./command.js";
import { appendEvent, createLog } from "./log.js";
import { WorldRuntimeError } from "./reduce.js";
import { createInitialState } from "./state.js";

describe("World Runtime append-only log", () => {
  it("starts at genesis and appends only the next event", () => {
    const state = createInitialState(WORLD_CREATED);
    const genesis = createLog(WORLD_CREATED);
    const emission = emitCommand(state, {
      schemaVersion: 1,
      type: "PlaceApparatus",
      apparatusId: "stand",
      kind: "stand",
      position: { unit: "mm", x: 0, y: 0 },
    });

    expect(emission.accepted).toBe(true);
    if (!emission.accepted) return;
    const next = appendEvent(genesis, emission.event);
    expect(next).toHaveLength(2);
    expect(next[0]).toEqual(WORLD_CREATED);
    expect(next[1]).toEqual(emission.event);
    expect(Object.isFrozen(next)).toBe(true);
  });

  it("rejects a gap, duplicate sequence, or second genesis", () => {
    const genesis = createLog(WORLD_CREATED);
    const event = {
      seq: 2,
      schemaVersion: 3 as const,
      type: "ApparatusPlaced" as const,
      payload: {
        apparatusId: "stand",
        kind: "stand",
        position: { unit: "mm" as const, x: 0, y: 0 },
      },
    };
    expect(() => appendEvent(genesis, event)).toThrow(WorldRuntimeError);
    expect(() => appendEvent(genesis, WORLD_CREATED)).toThrow(WorldRuntimeError);
  });

  it("does not mutate the previous log when appending", () => {
    const genesis = createLog(WORLD_CREATED);
    const event = {
      seq: 1,
      schemaVersion: 3 as const,
      type: "ApparatusPlaced" as const,
      payload: {
        apparatusId: "stand",
        kind: "stand",
        position: { unit: "mm" as const, x: 0, y: 0 },
      },
    };
    const next = appendEvent(genesis, event);
    expect(genesis).toHaveLength(1);
    expect(next).not.toBe(genesis);
  });

  it("normalizes a directly appended volume before persistence", () => {
    const event = {
      seq: 1,
      schemaVersion: 3 as const,
      type: "MaterialCharged" as const,
      payload: {
        vesselId: "flask",
        materialId: "hcl-0.1",
        volume: { value: 50, unit: "mL" as const },
      },
    };
    const log = appendEvent(createLog(WORLD_CREATED), event);
    expect(log[1]).toMatchObject({ payload: { volume: { value: 0.05, unit: "L" } } });
  });

  it("does not admit a genesis event with a stale snapshot checksum", () => {
    expect(() => createLog({
      ...WORLD_CREATED,
      payload: { ...WORLD_CREATED.payload, contentHash: "sha256:stale" },
    })).toThrow(/CONTENT_HASH_MISMATCH/);
  });
});
