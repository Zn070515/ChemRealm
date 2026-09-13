import { describe, expect, it } from "vitest";

import { buildObservableModel, toRenderState } from "@chemrealm/render";
import { stateHash } from "@chemrealm/world";

import {
  composeProductionTitration,
  selectCommittedTitrantTransfers,
  statesAtCommittedTargetPrefixes,
} from "./composition.js";
import { accuracyEnvelopeProbeScenario } from "./production-scenario.js";

describe("production composition vertical path", () => {
  it("projects a replayed committed world through science, observable, and scene", async () => {
    const composition = await composeProductionTitration();

    expect(composition.eventLog[0]?.type).toBe("WorldCreated");
    expect(composition.state.sequence).toBe(
      composition.eventLog[composition.eventLog.length - 1]?.seq,
    );
    expect(composition.frame.sourceStateHash).toBe(stateHash(composition.state));
    expect(composition.frame.sequence).toBe(composition.state.sequence);
    expect(composition.frame.physical.liquidVolume).toBe(
      composition.state.canonical.byVessel["titration-flask"]?.liquidVolume,
    );
    expect(composition.frame.projection.sourceStateHash).toBe(
      composition.frame.sourceStateHash,
    );
    expect(composition.observable.sourceStateHash).toBe(
      composition.frame.sourceStateHash,
    );
    expect(composition.renderState.nodes.some((node) => node.id === "liquid-level")).toBe(true);
    expect(composition.renderState.nodes.some((node) => node.id === "taught-ph-readout")).toBe(true);
  });

  it("does not hand-author the curve, symbolic line, or burette state", async () => {
    const composition = await composeProductionTitration();

    expect(composition.observable.curve.length).toBeGreaterThanOrEqual(2);
    expect(composition.observable.curve.map((point) => point.sequence)).toEqual(
      [...composition.observable.curve]
        .map((point) => point.sequence)
        .sort((a, b) => a - b),
    );
    expect(composition.observable.curve.every((point) => point.sourceStateHash.length > 0)).toBe(true);
    expect(composition.observable.curve.map((point) => point.deliveredTitrantVolume)).toEqual(
      [0, 0.01, 0.02, 0.025],
    );
    expect(composition.observable.readouts.activityModel).toBe(
      composition.frame.scientificState.provenance.activityModel,
    );
    const transfers = composition.eventLog.filter(
      (event) => event.type === "TransferCommitted",
    );
    expect(transfers).toHaveLength(composition.observable.curve.length - 1);
    expect(composition.observable.burette?.deliveredVolume).toBeCloseTo(
      transfers.reduce((total, event) => total + event.payload.volume.value, 0),
      14,
    );
    expect(composition.observable.symbolicLines[0]?.producerId).toBe("scientific-core");
    expect(composition.observable.symbolicLines[0]?.equationId).toBe("charge-balance");
    expect(composition.observable.symbolicLines[0]?.formula).toContain("m(H+)");
    expect(composition.observable.symbolicLines[0]?.substitutions.length).toBeGreaterThan(0);
    expect(composition.observable.symbolicLines[0]?.sourceStateHash).toBe(
      composition.frame.sourceStateHash,
    );
    expect(composition.observable.burette?.sourceStateHash).toBe(
      composition.frame.sourceStateHash,
    );
    expect(composition.observable.burette?.sequence).toBe(composition.frame.sequence);
    expect(composition.observable.burette?.containedVolume).toBeCloseTo(
      composition.state.canonical.byVessel["titrant-burette"]!.liquidVolume,
      14,
    );

    const unrelated = {
      ...transfers[0]!,
      payload: {
        ...transfers[0]!.payload,
        fromVesselId: "titration-flask",
        toVesselId: "titrant-burette",
      },
    };
    expect(selectCommittedTitrantTransfers([...composition.eventLog, unrelated])).toHaveLength(
      transfers.length,
    );
    const prefixes = statesAtCommittedTargetPrefixes([...composition.eventLog, unrelated]);
    expect(prefixes.map((prefix) => prefix.deliveredTitrantVolume)).toEqual(
      [0, 0.01, 0.02, 0.025],
    );
  });

  it("rebuilds the same frozen observable and scene for the same committed input", async () => {
    const first = await composeProductionTitration();
    const second = await composeProductionTitration();

    expect(first.eventLog).toEqual(second.eventLog);
    expect(first.observable).toEqual(second.observable);
    expect(first.renderState).toEqual(second.renderState);
    expect(Object.isFrozen(first.observable)).toBe(true);
    expect(Object.isFrozen(first.renderState)).toBe(true);
    expect(buildObservableModel).toBeTypeOf("function");
    expect(toRenderState).toBeTypeOf("function");
  });

  it("uses the real production path for a valid but out-of-envelope result", async () => {
    const composition = await composeProductionTitration({
      scenario: accuracyEnvelopeProbeScenario,
      worldId: "m5-accuracy-envelope-probe-world",
    });

    expect(composition.observable.readouts.withinProposedAccuracyEnvelope).toBe(false);
    expect(composition.renderState.nodes.find((node) => node.id === "accuracy-qualification")).toMatchObject({
      data: { text: "outside proposed accuracy envelope" },
    });
  });
});
