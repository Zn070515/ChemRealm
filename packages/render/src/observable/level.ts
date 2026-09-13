import { type Litre, type Millimetre } from "@chemrealm/schema";

export interface VolumeProfile {
  readonly maxVolume: Litre;
  readonly heightAtVolume: (volume: Litre) => Millimetre;
}

export interface LiquidLevel {
  readonly volume: Litre;
  readonly height: Millimetre;
}

function finiteNonNegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name}: expected a finite non-negative value`);
  }
  return value;
}

/** Obtain liquid height only through the apparatus-declared h(V) profile. */
export function deriveLiquidLevel(
  volume: Litre,
  profile: VolumeProfile,
): LiquidLevel {
  const volumeValue = finiteNonNegative(volume, "liquid volume");
  const maxVolume = finiteNonNegative(profile.maxVolume, "profile capacity");
  if (volumeValue > maxVolume) {
    throw new RangeError("liquid volume exceeds profile capacity");
  }

  const height = profile.heightAtVolume(volume);
  if (!Number.isFinite(height)) {
    throw new RangeError("volume profile returned a non-finite height");
  }
  return Object.freeze({ volume, height });
}
