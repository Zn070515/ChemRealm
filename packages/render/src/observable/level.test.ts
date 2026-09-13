import { describe, expect, it } from "vitest";
import { litre, millimetre } from "@chemrealm/schema";
import { deriveLiquidLevel, type VolumeProfile } from "./level.js";

describe("liquid level observable", () => {
  const conicalProfile: VolumeProfile = {
    maxVolume: litre(1),
    roundTripTolerance: litre(1e-12),
    heightAtVolume: (volume) => millimetre(10 + 40 * Math.sqrt(volume)),
    volumeAtHeight: (height) => litre(((height - 10) / 40) ** 2),
  };

  it("uses the declared h(V) profile instead of scaling a volume axis", () => {
    const level = deriveLiquidLevel(litre(0.25), conicalProfile);
    expect(level.height).toBe(30);
    expect(level.volume).toBe(0.25);
  });

  it("calls the profile exactly at the requested volume", () => {
    const calls: number[] = [];
    const profile: VolumeProfile = {
      maxVolume: litre(1),
      roundTripTolerance: litre(1e-12),
      heightAtVolume: (volume) => {
        calls.push(volume);
        return millimetre(42);
      },
      volumeAtHeight: (height) => {
        expect(height).toBe(42);
        return litre(0.4);
      },
    };

    deriveLiquidLevel(litre(0.4), profile);
    expect(calls).toEqual([0.4]);
  });

  it("rejects a profile whose inverse is outside the declared tolerance", () => {
    expect(() =>
      deriveLiquidLevel(litre(0.4), {
        ...conicalProfile,
        roundTripTolerance: litre(1e-15),
        volumeAtHeight: () => litre(0.4001),
      }),
    ).toThrow(RangeError);
  });

  it.each([
    ["negative volume", -1 as never],
    ["over capacity", litre(1.01)],
  ])("rejects %s", (_label, volume) => {
    expect(() => deriveLiquidLevel(volume, conicalProfile)).toThrow(RangeError);
  });
});
