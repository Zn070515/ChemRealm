import { describe, expect, it } from "vitest";
import {
  litre,
  taughtHydrogenIonExponent,
  volumeProfileHash,
  type VolumeProfileSnapshot,
} from "@chemrealm/schema";
import { buildObservableModel, type ObservableInput } from "../observable/index.js";
import {
  SCIENTIFIC_MODEL_HYDROGEN_ION_POLICY,
  TAUGHT_HYDROGEN_ION_POLICY,
  type HydrogenIonPresentationPolicy,
  toRenderState,
} from "./scene.js";
import { scientificState } from "../../test/fixtures.js";

const volumeProfileSnapshot: VolumeProfileSnapshot = {
  profileId: "test-profile",
  profileVersion: "1.0.0",
  profileHash: "sha256:profile",
  representation: "piecewise-linear",
  maxVolume: { value: 1, unit: "L" },
  maxHeight: { value: 20, unit: "mm" },
  roundTripTolerance: { value: 1e-12, unit: "L" },
  knots: [
    { volume: { value: 0, unit: "L" }, height: { value: 0, unit: "mm" } },
    { volume: { value: 1, unit: "L" }, height: { value: 20, unit: "mm" } },
  ],
  provenance: {
    source: "fixture",
    reference: "scene volume profile",
    category: "evaluated",
  },
};
volumeProfileSnapshot.profileHash = volumeProfileHash(volumeProfileSnapshot);

function model() {
  const input: ObservableInput = {
    frame: {
      sourceStateHash: "state-hash",
      sequence: 0,
      scientificState: scientificState(),
      physical: {
        liquidVolume: litre(0.5),
        volumeProfileHash: volumeProfileSnapshot.profileHash,
      },
      projection: {
        sourceStateHash: "state-hash",
        taughtHydrogenIonExponent: taughtHydrogenIonExponent(2),
      },
    },
    volumeProfileSnapshot,
  };
  return buildObservableModel(input);
}

describe("renderer-neutral scene state", () => {
  it("cannot represent a policy whose label and value key disagree", () => {
    // @ts-expect-error the discriminated policy must reject a cross-wired readout
    const invalidPolicy: HydrogenIonPresentationPolicy = {
      id: "taught",
      readoutId: "taught-ph-readout",
      readoutKey: "modelPh",
    };
    expect(invalidPolicy).toBeDefined();
  });

  it("contains generic frozen nodes and no renderer implementation objects", () => {
    const scene = toRenderState(model());
    expect(scene.nodes.map((node) => node.kind)).toContain("group");
    expect(scene.nodes.map((node) => node.kind)).toContain("text");
    expect(scene.nodes.every((node) => Object.isFrozen(node))).toBe(true);
    expect(Object.isFrozen(scene)).toBe(true);
    expect(scene.nodes.filter((node) => node.id.includes("ph-readout"))).toHaveLength(1);
    expect(scene.nodes.some((node) => node.id === "taught-ph-readout")).toBe(true);
  });

  it("swaps to a scientific model pH policy without emitting taught pH", () => {
    const scene = toRenderState(model(), SCIENTIFIC_MODEL_HYDROGEN_ION_POLICY);
    expect(scene.nodes.filter((node) => node.id.includes("ph-readout"))).toHaveLength(1);
    expect(scene.nodes.some((node) => node.id === "model-ph-readout")).toBe(true);
    expect(scene.nodes.some((node) => node.id === "taught-ph-readout")).toBe(false);
    expect(TAUGHT_HYDROGEN_ION_POLICY.id).not.toBe(SCIENTIFIC_MODEL_HYDROGEN_ION_POLICY.id);
  });
});
