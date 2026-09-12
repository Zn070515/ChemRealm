import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { WORLD_CREATED } from "../test/fixtures.js";
import { emitCommand } from "./command.js";
import { quantize } from "./hash.js";
import { appendEvent, createLog } from "./log.js";
import { reduce } from "./reduce.js";
import { replay } from "./replay.js";
import { createSnapshot } from "./snapshot.js";
import { createInitialState, stateHash } from "./state.js";

function eventLog(count: number) {
  let state = createInitialState(WORLD_CREATED);
  let log = createLog(WORLD_CREATED);
  const charge = emitCommand(state, {
    schemaVersion: 1,
    type: "ChargeVessel",
    vesselId: "flask",
    materialId: "hcl-0.1",
    volume: { value: 100, unit: "mL" },
  });
  if (!charge.accepted) throw new Error(charge.detail);
  log = appendEvent(log, charge.event);
  state = reduce(state, charge.event);
  for (let i = 0; i < count - 2; i += 1) {
    const transfer = emitCommand(state, {
      schemaVersion: 1,
      type: "DeliverTitrant",
      fromVesselId: "flask",
      toVesselId: "burette",
      volume: { value: 0.1, unit: "mL" },
    });
    if (!transfer.accepted) throw new Error(transfer.detail);
    log = appendEvent(log, transfer.event);
    state = reduce(state, transfer.event);
  }
  return { log, state };
}

describe("World Runtime replay", () => {
  it("replays a 500-event log with the same boundary hashes twice", () => {
    const { log } = eventLog(500);
    const started = performance.now();
    const first = replay(log);
    const second = replay(log);
    const elapsed = performance.now() - started;

    expect(first.boundaries).toHaveLength(500);
    expect(first.boundaries.map((boundary) => boundary.replayHash)).toEqual(
      second.boundaries.map((boundary) => boundary.replayHash),
    );
    expect(first.replayHash).toBe(second.replayHash);
    expect(elapsed).toBeLessThan(2000);
  });

  it("keeps replay identity across an equivalent arithmetic grouping", () => {
    const { log } = eventLog(500);
    const standard = replay(log, { arithmeticPath: "standard" });
    const perturbed = replay(log, { arithmeticPath: "perturbed" });

    expect(perturbed.boundaries.map((boundary) => boundary.replayHash)).toEqual(
      standard.boundaries.map((boundary) => boundary.replayHash),
    );
  });

  it("returns a science hash from injected derived science without persisting it", () => {
    const { log } = eventLog(3);
    const result = replay(log, {
      deriveScience: (state) => ({
        liquidVolume: state.canonical.byVessel.flask?.liquidVolume,
        pH: 1.23456789012345,
      }),
    });

    expect(result.scienceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(result.state)).not.toContain("scienceHash");
  });

  it("gets the same final state when every snapshot is deleted", () => {
    const { log, state } = eventLog(60);
    const snapshot = createSnapshot(state, "interval", log);
    const withSnapshot = replay(log, { snapshots: [snapshot] });
    const withoutSnapshots = replay(log, { snapshots: [] });

    expect(withSnapshot.replayHash).toBe(withoutSnapshots.replayHash);
    expect(withSnapshot.state).toEqual(withoutSnapshots.state);
  });

  it("ignores a corrupt snapshot cache and replays from the log", () => {
    const { log, state } = eventLog(60);
    const snapshot = createSnapshot(state, "interval", log);
    const corrupt = { ...snapshot, stateHash: "sha256:corrupt" };
    expect(replay(log, { snapshots: [corrupt] }).replayHash).toBe(replay(log).replayHash);
  });

  it("ignores a self-consistent snapshot from a different event-log prefix", () => {
    const { log } = eventLog(3);
    const foreignGenesis = {
      ...WORLD_CREATED,
      payload: { ...WORLD_CREATED.payload, worldId: "w-foreign" },
    };
    const foreignLog = createLog(foreignGenesis);
    const foreignSnapshot = createSnapshot(
      createInitialState(foreignGenesis),
      "interval",
      foreignLog,
    );

    expect(replay(log, { snapshots: [foreignSnapshot] }).state).toEqual(replay(log).state);
  });

  it("replays the serialized world unchanged after its content source is corrupted and deleted", async () => {
    const { log } = eventLog(3);
    const serializedLog = JSON.parse(JSON.stringify(log)) as unknown;
    const sandbox = await mkdtemp(join(tmpdir(), "chemrealm-r12-"));
    const contentDir = join(sandbox, "content");
    const previousWorkingDirectory = process.cwd();
    await mkdir(contentDir);
    await writeFile(
      join(contentDir, "hcl-naoh.json"),
      JSON.stringify({ scenarioRef: "hcl-naoh", materials: [{ density: 999999 }] }),
      "utf8",
    );

    try {
      process.chdir(sandbox);
      const withCorruptContent = replay(serializedLog);
      await rm(contentDir, { recursive: true, force: true });
      const withoutContent = replay(serializedLog);

      expect(withoutContent.replayHash).toBe(withCorruptContent.replayHash);
      expect(withoutContent.state).toEqual(withCorruptContent.state);
    } finally {
      process.chdir(previousWorkingDirectory);
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  it("rejects a serialized log that does not start at genesis", () => {
    expect(() => replay([WORLD_CREATED as never])).not.toThrow();
    expect(() => replay([{ ...WORLD_CREATED, seq: 1 }])).toThrow();
  });

  it("keeps liquid volume in replay identity", () => {
    const { log, state } = eventLog(3);
    const result = replay(log);
    expect(result.replayHash).toBe(stateHash(state));
    expect(result.state.canonical.byVessel.flask?.liquidVolume).toBeLessThan(0.1);
  });

  it("conserves volume, water, and components after canonicalized transfers", () => {
    const { log } = eventLog(102);
    const before = replay(log.slice(0, 2)).state;
    const after = replay(log).state;
    const totals = (state: typeof before) => {
      let waterMass = 0;
      let liquidVolume = 0;
      const components = new Map<string, number>();
      for (const contents of Object.values(state.canonical.byVessel)) {
        waterMass += contents.waterMass;
        liquidVolume += contents.liquidVolume;
        for (const component of contents.componentAmounts) {
          components.set(component.componentId, (components.get(component.componentId) ?? 0) + component.amount);
        }
      }
      return { waterMass, liquidVolume, components };
    };
    const initial = totals(before);
    const final = totals(after);
    const relativeError = (actual: number, expected: number) =>
      Math.abs(actual - expected) / Math.max(Math.abs(expected), Number.EPSILON);
    expect(relativeError(final.waterMass, initial.waterMass)).toBeLessThanOrEqual(1e-13);
    expect(relativeError(final.liquidVolume, initial.liquidVolume)).toBeLessThanOrEqual(1e-13);
    expect(relativeError(final.components.get("HCl") ?? 0, initial.components.get("HCl") ?? 0)).toBeLessThanOrEqual(1e-13);
  });

  it("fails the independently-quantized vessel strategy used as the AC-R9 design guard", () => {
    const N_A = 0.1;
    const steps = 100;
    let worstCorrect = 0;
    let worstWrong = 0;
    for (let trial = 0; trial < 500; trial += 1) {
      const fraction = 1 / 200 + trial * 1e-9;
      let correctFrom = N_A;
      let correctTo = 0;
      let wrongFrom = quantize(N_A);
      let wrongTo = quantize(0);
      for (let step = 0; step < steps; step += 1) {
        const correctDelta = Number((correctFrom * fraction).toPrecision(12));
        correctFrom -= correctDelta;
        correctTo += correctDelta;
        const wrongDelta = wrongFrom * fraction;
        wrongFrom = Number((wrongFrom - wrongDelta).toPrecision(12));
        wrongTo = Number((wrongTo + wrongDelta).toPrecision(12));
      }
      worstCorrect = Math.max(worstCorrect, Math.abs(correctFrom + correctTo - N_A) / N_A);
      worstWrong = Math.max(worstWrong, Math.abs(wrongFrom + wrongTo - N_A) / N_A);
    }

    expect(worstCorrect).toBeLessThanOrEqual(1.4e-14);
    expect(worstWrong).toBeGreaterThan(1e-13);
  });
});
