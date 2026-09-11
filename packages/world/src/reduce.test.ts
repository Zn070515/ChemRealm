import { describe, expect, it } from "vitest";

import { WORLD_CREATED } from "../test/fixtures.js";
import { createInitialState } from "./state.js";
import { reduce, WorldRuntimeError } from "./reduce.js";

describe("World Runtime reducer", () => {
  it("turns a non-canonical charge volume into canonical typed state", () => {
    const state = createInitialState(WORLD_CREATED);
    const next = reduce(state, {
      seq: 1,
      schemaVersion: 1,
      type: "MaterialCharged",
      payload: {
        vesselId: "flask",
        materialId: "hcl-0.1",
        volume: { value: 50, unit: "mL" },
      },
    });

    expect(next.canonical.byVessel.flask.waterMass).toBeCloseTo(0.0499, 14);
    expect(next.canonical.byVessel.flask.liquidVolume).toBeCloseTo(0.05, 14);
    expect(next.canonical.byVessel.flask.componentAmounts).toEqual([
      { componentId: "HCl", amount: expect.closeTo(0.005, 14) },
    ]);
  });

  it("computes every transfer delta from the same pre-transfer snapshot", () => {
    const genesis = createInitialState(WORLD_CREATED);
    const flaskCharged = reduce(genesis, {
      seq: 1,
      schemaVersion: 1,
      type: "MaterialCharged",
      payload: {
        vesselId: "flask",
        materialId: "hcl-0.1",
        volume: { value: 100, unit: "mL" },
      },
    });
    const bothCharged = reduce(flaskCharged, {
      seq: 2,
      schemaVersion: 1,
      type: "MaterialCharged",
      payload: {
        vesselId: "burette",
        materialId: "hcl-0.1",
        volume: { value: 20, unit: "mL" },
      },
    });
    const transferred = reduce(bothCharged, {
      seq: 3,
      schemaVersion: 1,
      type: "TransferCommitted",
      payload: {
        fromVesselId: "flask",
        toVesselId: "burette",
        volume: { value: 25, unit: "mL" },
        mechanism: "pipette",
      },
    });

    expect(transferred.canonical.byVessel.flask.waterMass).toBeCloseTo(0.07485, 14);
    expect(transferred.canonical.byVessel.flask.liquidVolume).toBeCloseTo(0.075, 14);
    expect(transferred.canonical.byVessel.flask.componentAmounts).toEqual([
      { componentId: "HCl", amount: expect.closeTo(0.0075, 14) },
    ]);
    expect(transferred.canonical.byVessel.burette.waterMass).toBeCloseTo(0.04491, 14);
    expect(transferred.canonical.byVessel.burette.liquidVolume).toBeCloseTo(0.045, 14);
    expect(transferred.canonical.byVessel.burette.componentAmounts).toEqual([
      { componentId: "HCl", amount: expect.closeTo(0.0045, 14) },
    ]);
  });

  it("rejects an event that is not the next sequence boundary", () => {
    const state = createInitialState(WORLD_CREATED);
    expect(() =>
      reduce(state, {
        seq: 2,
        schemaVersion: 1,
        type: "ApparatusPlaced",
        payload: {
          apparatusId: "stand",
          kind: "stand",
          position: { unit: "mm", x: 0, y: 0 },
        },
      }),
    ).toThrow(WorldRuntimeError);
  });

  it("invokes an injected solver without allowing it to own world mutation", () => {
    const state = createInitialState(WORLD_CREATED);
    const solvedStates: unknown[] = [];
    const charged = reduce(state, {
      seq: 1,
      schemaVersion: 1,
      type: "MaterialCharged",
      payload: {
        vesselId: "flask",
        materialId: "hcl-0.1",
        volume: { value: 10, unit: "mL" },
      },
    });
    const next = reduce(
      charged,
      {
        seq: 2,
        schemaVersion: 1,
        type: "TransferCommitted",
        payload: {
          fromVesselId: "flask",
          toVesselId: "burette",
          volume: { value: 1, unit: "mL" },
          mechanism: "pipette",
        },
      },
      { solve: (solved) => solvedStates.push(solved) },
    );

    expect(solvedStates).toHaveLength(1);
    expect(next.canonical.byVessel.flask.liquidVolume).toBeCloseTo(0.009, 14);
    expect(state.canonical.byVessel.flask.liquidVolume).toBe(0);
  });
});
