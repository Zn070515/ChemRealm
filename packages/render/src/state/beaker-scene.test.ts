import { describe, expect, it } from "vitest";
import {
  kelvin,
  litre,
  taughtHydrogenIonExponent,
  volumeProfileHash,
  VOLUME_PROFILE_VERSION,
  type VolumeProfileSnapshot,
} from "@chemrealm/schema";
import { buildObservableModel, type ObservableInput } from "../observable/index.js";
import { buildBeakerSceneActor } from "./beaker-scene.js";
import { toTitrationRenderState } from "./titration.js";
import { scientificState } from "../../test/fixtures.js";

const volumeProfileSnapshot: VolumeProfileSnapshot = {
  profileId: "beaker-scene-test-profile",
  profileVersion: VOLUME_PROFILE_VERSION,
  profileHash: "sha256:placeholder",
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
    reference: "NOBOOK-style beaker scene fixture",
    category: "evaluated",
  },
};
volumeProfileSnapshot.profileHash = volumeProfileHash(volumeProfileSnapshot);

function model() {
  const input: ObservableInput = {
    frame: {
      sourceStateHash: "beaker-scene-state",
      sequence: 12,
      scientificState: scientificState(),
      physical: {
        liquidVolume: litre(0.5),
        volumeProfileHash: volumeProfileSnapshot.profileHash,
        temperature: kelvin(298.15),
        solvent: "water",
        optical: { path: undefined, profiles: [] },
        },
      projection: {
        sourceStateHash: "beaker-scene-state",
        taughtHydrogenIonExponent: taughtHydrogenIonExponent(2),
      },
    },
    volumeProfileSnapshot,
  };
  return buildObservableModel(input);
}

describe("NOBOOK-style beaker scene actor", () => {
  it("binds vessel, liquid, interaction ports, and layers to one observable frame", () => {
    const scene = toTitrationRenderState(model());
    const node = scene.nodes.find((candidate) => candidate.id === "beaker-apparatus");
    const actor = node?.data.sceneActor as Record<string, unknown> | undefined;

    expect(actor).toMatchObject({
      sceneKind: "apparatus-actor",
      assetId: "beaker-250ml",
      sourceStateHash: "beaker-scene-state",
      sequence: 12,
      runtimeLayers: [
        "glass-back",
        "liquid-body",
        "liquid-surface",
        "state-effects",
        "glass-front",
        "graduation",
        "interaction",
      ],
      interactionPorts: ["beaker.opening", "beaker.spout"],
      geometry: {
        kind: "authored-cavity-perspective-ellipse",
        measurementUse: "forbidden",
        surface: { kind: "perspective-ellipse" },
      },
      liquid: {
        volumeL: 0.5,
        heightMm: 10,
        source: "observable-liquid-level",
      },
    });

    expect(node?.data.graduation).toMatchObject({
      kind: "approximate-contained",
      displayRangeMl: { minimum: 25, maximum: 200 },
      majorIntervalMl: 25,
      minorIntervalMl: 25,
      valueDirection: "increases-upward",
      reference: "bottom-zero",
    });
  });

  it("does not invent chemical colour when Observable has no admitted optical observation", () => {
    const scene = toTitrationRenderState(model());
    const actor = scene.nodes.find((candidate) => candidate.id === "beaker-apparatus")
      ?.data.sceneActor as { liquid: { appearance: Record<string, unknown> } };

    expect(actor.liquid.appearance).toMatchObject({
      status: "unavailable",
      source: "observable-optical-observation",
    });
    expect(actor.liquid.appearance).not.toHaveProperty("tintSrgb");
    expect(actor.liquid.appearance).not.toHaveProperty("fallbackColour");
  });

  it("passes through an admitted optical observation without choosing a palette", () => {
    const source = model();
    const observed = buildBeakerSceneActor({
      ...source,
      indicators: [{
        ...source.indicators[0]!,
        opticalObservation: {
          status: "OPTICAL_MODEL_OK",
          indicatorId: "phenolphthalein",
          tintSrgb: [0.9, 0.2, 0.5],
          tintStrength: 0.8,
          transmittanceSamples: [{ wavelengthNanometres: 500, transmittance: 0.5 }],
          profileId: "fixture-profile",
          profileHash: "sha256:fixture-profile",
          sourceReplayHash: source.sourceStateHash,
          conditions: { pathLengthMillimetres: 10 },
        },
      }],
    });
    expect(observed.liquid.appearance).toMatchObject({
      status: "observed",
      indicatorId: "phenolphthalein",
      tintSrgb: [0.9, 0.2, 0.5],
      tintStrength: 0.8,
    });
  });
});
