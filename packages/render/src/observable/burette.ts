import { litre, type Litre } from "@chemrealm/schema";

export interface BuretteInput {
  /** Graduated scale reading before any delivery. */
  readonly initialScaleReading: Litre;
  /** Physical liquid amount in the burette before any delivery. */
  readonly initialContainedVolume: Litre;
  readonly deliveredVolumes: readonly Litre[];
}

export interface BuretteState {
  readonly currentScaleReading: Litre;
  readonly deliveredVolume: Litre;
  readonly containedVolume: Litre;
}

function finiteNonNegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name}: expected a finite non-negative value`);
  }
  return value;
}

/**
 * Derive the graduated reading and physical volumes from committed deliveries.
 * A burette's scale increases as liquid is delivered; remaining liquid is a
 * separate value and must never be used as the scale reading.
 */
export function deriveBuretteState(input: BuretteInput): BuretteState {
  const initialScaleReading = finiteNonNegative(
    input.initialScaleReading,
    "initial burette scale reading",
  );
  const initialContainedVolume = finiteNonNegative(
    input.initialContainedVolume,
    "initial burette contained volume",
  );
  let delivered = 0;
  for (const volume of input.deliveredVolumes) {
    delivered += finiteNonNegative(volume, "delivered burette volume");
  }
  if (delivered > initialContainedVolume) {
    throw new RangeError("burette deliveries overdraw the initial volume");
  }
  return Object.freeze({
    currentScaleReading: litre(initialScaleReading + delivered),
    deliveredVolume: litre(delivered),
    containedVolume: litre(initialContainedVolume - delivered),
  });
}
