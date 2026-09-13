import { describe, expect, it } from "vitest";

import { highPrecisionWorldCreated, WORLD_CREATED } from "../test/fixtures.js";
import { reduce } from "./reduce.js";
import { createInitialState } from "./state.js";
import { emitCommand, validateCommand } from "./command.js";

describe("World Runtime command boundary", () => {
  it("emits a canonical charge event at the next sequence", () => {
    const state = createInitialState(WORLD_CREATED);
    const result = emitCommand(state, {
      schemaVersion: 1,
      type: "ChargeVessel",
      vesselId: "flask",
      materialId: "hcl-0.1",
      volume: { value: 50, unit: "mL" },
    });

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.event).toMatchObject({
      seq: 1,
      type: "MaterialCharged",
      payload: {
        vesselId: "flask",
        materialId: "hcl-0.1",
        volume: { value: 0.05, unit: "L" },
      },
    });
  });

  it("emits a burette delivery as one TransferCommitted fact", () => {
    const genesis = createInitialState(WORLD_CREATED);
    const state = reduce(genesis, {
      seq: 1,
      schemaVersion: 3,
      type: "MaterialCharged",
      payload: {
        vesselId: "burette",
        materialId: "hcl-0.1",
        volume: { value: 10, unit: "mL" },
      },
    });
    const result = emitCommand(state, {
      schemaVersion: 1,
      type: "DeliverTitrant",
      fromVesselId: "burette",
      toVesselId: "flask",
      volume: { value: 1, unit: "mL" },
    });

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.event).toMatchObject({
      seq: 2,
      type: "TransferCommitted",
      payload: {
        fromVesselId: "burette",
        toVesselId: "flask",
        volume: { value: 0.001, unit: "L" },
        mechanism: "burette",
      },
    });
  });

  it("rejects an invalid charge without emitting an event", () => {
    const state = createInitialState(WORLD_CREATED);
    const result = validateCommand(state, {
      schemaVersion: 1,
      type: "ChargeVessel",
      vesselId: "missing",
      materialId: "hcl-0.1",
      volume: { value: 50, unit: "mL" },
    });

    expect(result).toMatchObject({
      accepted: false,
      reason: "VESSEL_NOT_FOUND",
    });
    expect(emitCommand(state, {
      schemaVersion: 1,
      type: "ChargeVessel",
      vesselId: "missing",
      materialId: "hcl-0.1",
      volume: { value: 50, unit: "mL" },
    })).toEqual(result);
  });

  it("rejects a delivery that exceeds the source volume", () => {
    const state = createInitialState(WORLD_CREATED);
    const result = validateCommand(state, {
      schemaVersion: 1,
      type: "DeliverTitrant",
      fromVesselId: "burette",
      toVesselId: "flask",
      volume: { value: 1, unit: "mL" },
    });

    expect(result).toMatchObject({
      accepted: false,
      reason: "INSUFFICIENT_VOLUME",
    });
  });

  it("accepts a high-precision full delivery that the reducer can apply", () => {
    const genesis = createInitialState(highPrecisionWorldCreated());
    const charged = reduce(genesis, {
      seq: 1,
      schemaVersion: 3,
      type: "MaterialCharged",
      payload: {
        vesselId: "flask",
        materialId: "hcl-0.1",
        volume: { value: 250, unit: "mL" },
      },
    });

    const result = emitCommand(charged, {
      schemaVersion: 1,
      type: "DeliverTitrant",
      fromVesselId: "flask",
      toVesselId: "burette",
      volume: { value: 250, unit: "mL" },
    });

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(() => reduce(charged, result.event)).not.toThrow();
  });
});
