import { describe, expect, it } from "vitest";
import { litre, millimetre, taughtHydrogenIonExponent } from "@chemrealm/schema";
import { buildObservableModel, type ObservableInput } from "../observable/index.js";
import { toRenderState } from "./scene.js";
import { scientificState } from "../../test/fixtures.js";

function model() {
  const input: ObservableInput = {
    scientificState: scientificState(),
    projection: { taughtHydrogenIonExponent: taughtHydrogenIonExponent(2) },
    liquidVolume: litre(0.5),
    volumeProfile: { maxVolume: litre(1), heightAtVolume: () => millimetre(20) },
  };
  return buildObservableModel(input);
}

describe("renderer-neutral scene state", () => {
  it("contains generic frozen nodes and no renderer implementation objects", () => {
    const scene = toRenderState(model());
    expect(scene.nodes.map((node) => node.kind)).toContain("group");
    expect(scene.nodes.map((node) => node.kind)).toContain("text");
    expect(scene.nodes.every((node) => Object.isFrozen(node))).toBe(true);
    expect(Object.isFrozen(scene)).toBe(true);
  });
});
