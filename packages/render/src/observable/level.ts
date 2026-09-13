import {
  VolumeProfileSnapshotSchema,
  litre,
  millimetre,
  type Litre,
  type Millimetre,
  type VolumeProfileSnapshot,
} from "@chemrealm/schema";

export interface VolumeProfile {
  readonly profileId: string;
  readonly profileVersion: string;
  readonly profileHash: string;
  readonly maxVolume: Litre;
  readonly maxHeight: Millimetre;
  readonly roundTripTolerance: Litre;
  readonly heightAtVolume: (volume: Litre) => Millimetre;
  readonly volumeAtHeight: (height: Millimetre) => Litre;
}

export interface LiquidLevel {
  readonly volume: Litre;
  readonly height: Millimetre;
}

interface ProfilePoint {
  readonly volume: number;
  readonly height: number;
}

function interpolate(
  value: number,
  points: readonly ProfilePoint[],
  inputKey: "volume" | "height",
  outputKey: "volume" | "height",
): number {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (value < first[inputKey] || value > last[inputKey]) {
    throw new RangeError(
      "volume profile " + inputKey + " is outside its declared range",
    );
  }
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    if (value <= current[inputKey]) {
      const span = current[inputKey] - previous[inputKey];
      const fraction = (value - previous[inputKey]) / span;
      return previous[outputKey] + fraction * (current[outputKey] - previous[outputKey]);
    }
  }
  return last[outputKey];
}

/** Restore the executable profile adapter from frozen genesis data. */
export function volumeProfileFromSnapshot(
  input: VolumeProfileSnapshot,
): VolumeProfile {
  const snapshot = VolumeProfileSnapshotSchema.parse(input);
  const points = snapshot.knots.map((knot) => ({
    volume: knot.volume.value,
    height: knot.height.value,
  }));
  return Object.freeze({
    profileId: snapshot.profileId,
    profileVersion: snapshot.profileVersion,
    profileHash: snapshot.profileHash,
    maxVolume: litre(snapshot.maxVolume.value),
    maxHeight: millimetre(snapshot.maxHeight.value),
    roundTripTolerance: litre(snapshot.roundTripTolerance.value),
    heightAtVolume: (volume: Litre) =>
      millimetre(interpolate(volume, points, "volume", "height")),
    volumeAtHeight: (height: Millimetre) =>
      litre(
        interpolate(
          height,
          points.map((point) => ({
            volume: point.height,
            height: point.volume,
          })),
          "volume",
          "height",
        ),
      ),
  });
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
  const roundTripTolerance = finiteNonNegative(
    profile.roundTripTolerance,
    "profile round-trip tolerance",
  );
  if (volumeValue > maxVolume) {
    throw new RangeError("liquid volume exceeds profile capacity");
  }

  const height = profile.heightAtVolume(volume);
  if (!Number.isFinite(height)) {
    throw new RangeError("volume profile returned a non-finite height");
  }
  const inverseVolume = finiteNonNegative(
    profile.volumeAtHeight(height),
    "volume profile inverse",
  );
  if (Math.abs(inverseVolume - volumeValue) > roundTripTolerance) {
    throw new RangeError("volume profile inverse exceeds round-trip tolerance");
  }
  return Object.freeze({ volume, height });
}
