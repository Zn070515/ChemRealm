import { describe, expect, it } from "vitest";

import { WORLD_CREATED } from "../test/fixtures.js";
import { appendEvent, createLog } from "./log.js";
import { reduce } from "./reduce.js";
import { replayBranch } from "./replay.js";
import { createInitialState, stateHash } from "./state.js";
import { appendBranchEvent, forkWorld } from "./branch.js";

describe("World Runtime branches", () => {
  it("stores a shared immutable prefix and child suffix without flattening", () => {
    const genesis = createInitialState(WORLD_CREATED);
    const parentEvent = {
      seq: 1,
      schemaVersion: 1 as const,
      type: "MaterialCharged" as const,
      payload: {
        vesselId: "flask",
        materialId: "hcl-0.1",
        volume: { value: 10, unit: "mL" as const },
      },
    };
    const parentLog = appendEvent(createLog(WORLD_CREATED), parentEvent);
    const parentState = reduce(genesis, parentEvent);
    const parentHash = stateHash(parentState);

    const branch = forkWorld(parentState, parentLog, "w-child");
    expect(branch.event.payload).toMatchObject({
      childWorldId: "w-child",
      parentWorldId: "w-1",
      forkSequence: 1,
      forkStateHash: parentHash,
    });
    expect(branch.log.prefix).toBe(parentLog);
    expect(branch.log.suffix).toHaveLength(1);
    expect(branch.log.suffix[0]).toEqual(branch.event);
    expect(branch.state.worldId).toBe("w-child");
    expect(branch.state.lineage.parentWorldId).toBe("w-1");
    expect(stateHash(parentState)).toBe(parentHash);
    expect(parentLog).toHaveLength(2);
    expect(() => {
      (parentState.canonical.byVessel.flask as { liquidVolume: number }).liquidVolume = 99;
    }).toThrow();

    const childEvent = {
      seq: 3,
      schemaVersion: 1 as const,
      type: "MaterialCharged" as const,
      payload: {
        vesselId: "flask",
        materialId: "hcl-0.1",
        volume: { value: 5, unit: "mL" as const },
      },
    };
    const childLog = appendBranchEvent(branch.log, childEvent);
    const childReplay = replayBranch(childLog);
    const childReplayFromForkSnapshot = replayBranch(childLog, {
      snapshots: [branch.forkSnapshot],
    });
    expect(childReplay.state.worldId).toBe("w-child");
    expect(childReplay.state.canonical.byVessel.flask?.liquidVolume).toBeCloseTo(0.015, 14);
    expect(childReplayFromForkSnapshot.state).toEqual(childReplay.state);
    expect(stateHash(parentState)).toBe(parentHash);
  });

  it("rejects a fork whose supplied parent state does not match its log", () => {
    const genesis = createInitialState(WORLD_CREATED);
    expect(() => forkWorld(genesis, createLog(WORLD_CREATED), "w-child")).not.toThrow();
    expect(() => forkWorld({ ...genesis, sequence: 1 }, createLog(WORLD_CREATED), "w-child")).toThrow();
  });
});
