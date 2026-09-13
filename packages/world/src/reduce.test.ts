import { describe, expect, it } from "vitest";

import { highPrecisionWorldCreated, WORLD_CREATED } from "../test/fixtures.js";
import { quantize } from "./hash.js";
import {
  createInitialState,
  parseWorldStateForSnapshot,
  serializeWorldState,
} from "./state.js";
import { reduce, WorldRuntimeError } from "./reduce.js";

describe("World Runtime reducer", () => {
  it("turns a non-canonical charge volume into canonical typed state", () => {
    const state = createInitialState(WORLD_CREATED);
    const next = reduce(state, {
      seq: 1,
      schemaVersion: 4,
      type: "MaterialCharged",
      payload: {
        vesselId: "flask",
        materialId: "hcl-0.1",
        volume: { value: 50, unit: "mL" },
      },
    });

    expect(next.canonical.byVessel.flask!.waterMass).toBeCloseTo(0.99835391 * 0.05, 14);
    expect(next.canonical.byVessel.flask!.liquidVolume).toBeCloseTo(0.05, 14);
    expect(next.canonical.byVessel.flask!.componentAmounts).toEqual([
      { componentId: "HCl", amount: expect.closeTo(0.005, 14) },
    ]);
  });

  it("computes every transfer delta from the same pre-transfer snapshot", () => {
    const genesis = createInitialState(WORLD_CREATED);
    const flaskCharged = reduce(genesis, {
      seq: 1,
      schemaVersion: 4,
      type: "MaterialCharged",
      payload: {
        vesselId: "flask",
        materialId: "hcl-0.1",
        volume: { value: 100, unit: "mL" },
      },
    });
    const bothCharged = reduce(flaskCharged, {
      seq: 2,
      schemaVersion: 4,
      type: "MaterialCharged",
      payload: {
        vesselId: "burette",
        materialId: "hcl-0.1",
        volume: { value: 20, unit: "mL" },
      },
    });
    const transferred = reduce(bothCharged, {
      seq: 3,
      schemaVersion: 4,
      type: "TransferCommitted",
      payload: {
        fromVesselId: "flask",
        toVesselId: "burette",
        volume: { value: 25, unit: "mL" },
        mechanism: "pipette",
      },
    });

    expect(transferred.canonical.byVessel.flask!.waterMass).toBeCloseTo(0.99835391 * 0.075, 14);
    expect(transferred.canonical.byVessel.flask!.liquidVolume).toBeCloseTo(0.075, 14);
    expect(transferred.canonical.byVessel.flask!.componentAmounts).toEqual([
      { componentId: "HCl", amount: expect.closeTo(0.0075, 14) },
    ]);
    expect(transferred.canonical.byVessel.burette!.waterMass).toBeCloseTo(0.99835391 * 0.045, 14);
    expect(transferred.canonical.byVessel.burette!.liquidVolume).toBeCloseTo(0.045, 14);
    expect(transferred.canonical.byVessel.burette!.componentAmounts).toEqual([
      { componentId: "HCl", amount: expect.closeTo(0.0045, 14) },
    ]);
  });

  it("quantizes each conserved transfer delta once before the zero-sum update", () => {
    const genesis = createInitialState(WORLD_CREATED);
    const charged = reduce(genesis, {
      seq: 1,
      schemaVersion: 4,
      type: "MaterialCharged",
      payload: {
        vesselId: "flask",
        materialId: "hcl-0.1",
        volume: { value: 117, unit: "mL" },
      },
    });
    const transferred = reduce(charged, {
      seq: 2,
      schemaVersion: 4,
      type: "TransferCommitted",
      payload: {
        fromVesselId: "flask",
        toVesselId: "burette",
        volume: { value: 13, unit: "mL" },
        mechanism: "pipette",
      },
    });

    const source = charged.canonical.byVessel.flask!;
    const fraction = 0.013 / source.liquidVolume;
    const expectedWaterDelta = quantize(source.waterMass * fraction);
    const sourceComponentAmount = source.componentAmounts[0]?.amount ?? 0;
    const expectedComponentDelta = quantize(sourceComponentAmount * fraction);
    const target = transferred.canonical.byVessel.burette!;

    expect(target.waterMass).toBe(expectedWaterDelta);
    expect(target.componentAmounts).toEqual([
      { componentId: "HCl", amount: expectedComponentDelta },
    ]);
    expect(transferred.canonical.byVessel.flask!.waterMass).toBe(
      source.waterMass - expectedWaterDelta,
    );
    expect(transferred.canonical.byVessel.flask!.componentAmounts[0]?.amount).toBe(
      sourceComponentAmount - expectedComponentDelta,
    );
  });

  it("keeps a legal high-precision full transfer non-negative and exact", () => {
    const genesis = createInitialState(highPrecisionWorldCreated());
    const charged = reduce(genesis, {
      seq: 1,
      schemaVersion: 4,
      type: "MaterialCharged",
      payload: {
        vesselId: "flask",
        materialId: "hcl-0.1",
        volume: { value: 250, unit: "mL" },
      },
    });
    const serialized = serializeWorldState(charged);
    const highPrecisionCharged = parseWorldStateForSnapshot({
      ...serialized,
      canonical: {
        ...serialized.canonical,
        byVessel: {
          ...serialized.canonical.byVessel,
          flask: {
            waterMass: { value: 0.1999999999999, unit: "kg" as const },
            liquidVolume: { value: 0.25, unit: "L" as const },
            componentAmounts: [
              { componentId: "HCl", amount: { value: 0.1234567890126, unit: "mol" as const } },
            ],
          },
        },
      },
    });

    const next = reduce(highPrecisionCharged, {
      seq: 2,
      schemaVersion: 4,
      type: "TransferCommitted",
      payload: {
        fromVesselId: "flask",
        toVesselId: "burette",
        volume: { value: 250, unit: "mL" },
        mechanism: "pipette",
      },
    });

    const source = next.canonical.byVessel.flask!;
    const target = next.canonical.byVessel.burette!;
    expect(source.liquidVolume).toBe(0);
    expect(source.waterMass).toBe(0);
    expect(source.componentAmounts).toEqual([{ componentId: "HCl", amount: 0 }]);
    expect(target.liquidVolume).toBe(highPrecisionCharged.canonical.byVessel.flask!.liquidVolume);
    expect(target.waterMass).toBe(highPrecisionCharged.canonical.byVessel.flask!.waterMass);
    expect(target.componentAmounts).toEqual(highPrecisionCharged.canonical.byVessel.flask!.componentAmounts);
  });

  it("rejects an event that is not the next sequence boundary", () => {
    const state = createInitialState(WORLD_CREATED);
    expect(() =>
      reduce(state, {
        seq: 2,
        schemaVersion: 4,
        type: "ApparatusPlaced",
        payload: {
          apparatusId: "stand",
          kind: "stand",
          position: { unit: "mm", x: 0, y: 0 },
        },
      }),
    ).toThrow(WorldRuntimeError);
  });

  it("keeps scientific solving outside the synchronous world reducer", () => {
    const state = createInitialState(WORLD_CREATED);
    let solverInvoked = false;
    const charged = reduce(state, {
      seq: 1,
      schemaVersion: 4,
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
      schemaVersion: 4,
        type: "TransferCommitted",
        payload: {
          fromVesselId: "flask",
          toVesselId: "burette",
          volume: { value: 1, unit: "mL" },
          mechanism: "pipette",
        },
      },
      {
        solve: () => {
          solverInvoked = true;
        },
      } as never,
    );

    expect(next).not.toBeInstanceOf(Promise);
    expect(solverInvoked).toBe(false);
    expect(next.canonical.byVessel.flask!.liquidVolume).toBeCloseTo(0.009, 14);
    expect(state.canonical.byVessel.flask!.liquidVolume).toBe(0);
  });
});
