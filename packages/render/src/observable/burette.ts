import { litre, type Litre } from "@chemrealm/schema";

export interface BuretteInput {
  readonly initialVolume: Litre;
  readonly deliveredVolumes: readonly Litre[];
}

function finiteNonNegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name}: expected a finite non-negative value`);
  }
  return value;
}

/** Derive the reading from committed deliveries, never from pointer motion. */
export function deriveBuretteReading(input: BuretteInput): Litre {
  const initial = finiteNonNegative(input.initialVolume, "initial burette volume");
  let delivered = 0;
  for (const volume of input.deliveredVolumes) {
    delivered += finiteNonNegative(volume, "delivered burette volume");
  }
  const remaining = initial - delivered;
  if (remaining < 0) {
    throw new RangeError("burette deliveries overdraw the initial volume");
  }
  return litre(remaining);
}
