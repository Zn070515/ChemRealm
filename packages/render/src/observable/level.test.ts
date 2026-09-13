import { describe, expect, it } from "vitest";
import {
  litre,
  millimetre,
  volumeProfileHash,
  VOLUME_PROFILE_VERSION,
  type VolumeProfileSnapshot,
} from "@chemrealm/schema";
import {
  deriveLiquidLevel,
  volumeProfileFromSnapshot,
  type VolumeProfile,
} from "./level.js";

describe("liquid level observable", () => {
  const conicalProfile: VolumeProfile = {
    profileId: "conical-test",
    profileVersion: VOLUME_PROFILE_VERSION,
    profileHash: "sha256:test",
    maxVolume: litre(1),
    maxHeight: millimetre(50),
    roundTripTolerance: litre(1e-12),
    heightAtVolume: (volume) => millimetre(10 + 40 * Math.sqrt(volume)),
    volumeAtHeight: (height) => litre(((height - 10) / 40) ** 2),
  };

const snapshot: VolumeProfileSnapshot = {
    profileId: "conical-snapshot",
    profileVersion: VOLUME_PROFILE_VERSION,
    profileHash: "sha256:test",
    representation: "piecewise-linear",
    maxVolume: { value: 1, unit: "L" },
    maxHeight: { value: 40, unit: "mm" },
    roundTripTolerance: { value: 1e-12, unit: "L" },
    knots: [
      { volume: { value: 0, unit: "L" }, height: { value: 0, unit: "mm" } },
      { volume: { value: 0.5, unit: "L" }, height: { value: 20, unit: "mm" } },
      { volume: { value: 1, unit: "L" }, height: { value: 40, unit: "mm" } },
    ],
    provenance: {
      source: "fixture",
      reference: "volume profile fixture",
      category: "evaluated",
  },
};
snapshot.profileHash = volumeProfileHash(snapshot);

  it("restores a bidirectional runtime profile from serialized snapshot data", () => {
    const profile = volumeProfileFromSnapshot(snapshot);
    expect(profile.profileId).toBe("conical-snapshot");
    expect(profile.heightAtVolume(litre(0.25))).toBe(10);
    expect(profile.volumeAtHeight(millimetre(10))).toBe(0.25);
    expect(deriveLiquidLevel(litre(0.25), profile)).toEqual({
      volume: 0.25,
      height: 10,
    });
  });

  it("uses the declared h(V) profile instead of scaling a volume axis", () => {
    const level = deriveLiquidLevel(litre(0.25), conicalProfile);
    expect(level.height).toBe(30);
    expect(level.volume).toBe(0.25);
  });

  it("calls the profile exactly at the requested volume", () => {
    const calls: number[] = [];
    const profile: VolumeProfile = {
      profileId: "custom",
    profileVersion: VOLUME_PROFILE_VERSION,
      profileHash: "sha256:custom",
      maxVolume: litre(1),
      maxHeight: millimetre(42),
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
