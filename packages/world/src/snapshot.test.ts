import { describe, expect, it } from "vitest";

import { WORLD_CREATED } from "../test/fixtures.js";
import { createInitialState } from "./state.js";
import { createSnapshot, shouldSnapshot, validateSnapshot } from "./snapshot.js";

describe("World Runtime snapshots", () => {
  it("takes interval snapshots at 50 and always snapshots a fork boundary", () => {
    const state = createInitialState(WORLD_CREATED);
    expect(shouldSnapshot(state, "interval", 50)).toBe(false);
    expect(shouldSnapshot({ ...state, sequence: 50 }, "interval", 50)).toBe(true);
    expect(shouldSnapshot(state, "fork", 50)).toBe(true);
  });

  it("stores a validated full state cache and its hash", () => {
    const state = createInitialState(WORLD_CREATED);
    const snapshot = createSnapshot(state, "interval");

    expect(snapshot.sequence).toBe(0);
    expect(snapshot.stateHash).toHaveLength(64);
    expect(validateSnapshot(snapshot)).toEqual(snapshot);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("rejects a cache with a changed state or unknown reason", () => {
    const snapshot = createSnapshot(createInitialState(WORLD_CREATED), "interval");
    expect(() => validateSnapshot({ ...snapshot, stateHash: "sha256:wrong" })).toThrow();
    expect(() => validateSnapshot({ ...snapshot, reason: "manual" })).toThrow();
    expect(() => validateSnapshot({
      ...snapshot,
      solverConfig: { ...snapshot.solverConfig, parameters: { Kw: 1e-13 } },
    })).toThrow();
  });
});
