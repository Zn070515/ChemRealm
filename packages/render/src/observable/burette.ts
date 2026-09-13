import { litre, type Litre } from "@chemrealm/schema";

export interface BuretteInput {
  /** Identity of the committed world prefix used to derive these deliveries. */
  readonly sourceStateHash: string;
  /** Sequence of the committed world prefix used to derive these deliveries. */
  readonly sequence: number;
  /** Graduated scale reading before any delivery. */
  readonly initialScaleReading: Litre;
  /** Physical liquid amount in the burette before any delivery. */
  readonly initialContainedVolume: Litre;
  readonly deliveredVolumes: readonly Litre[];
}

export interface BuretteState {
  readonly sourceStateHash: string;
  readonly sequence: number;
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

interface SummedVolume {
  readonly value: number;
  /** Conservative bound for round-off introduced by the finite sum. */
  readonly roundoffBound: number;
}

/**
 * Add committed delivery volumes without allowing ordinary IEEE-754
 * accumulation noise to turn an exact full draw into an overdraw.
 *
 * This is an observable calculation, not a license to accept a real
 * overdraw: callers may be normalized to the initial volume only when the
 * discrepancy is within the explicitly computed floating-point bound.
 */
function compensatedSum(values: readonly number[]): SummedVolume {
  let sum = 0;
  let correction = 0;
  let scale = 1;

  for (const value of values) {
    scale = Math.max(scale, Math.abs(value), Math.abs(sum));
    const next = sum + value;
    if (Math.abs(sum) >= Math.abs(value)) {
      correction += sum - next + value;
    } else {
      correction += value - next + sum;
    }
    sum = next;
  }

  const value = sum + correction;
  const roundoffBound =
    Number.EPSILON * scale * Math.max(1, values.length + 1) * 8;
  return { value, roundoffBound };
}

/**
 * Derive the graduated reading and physical volumes from committed deliveries.
 * A burette's scale increases as liquid is delivered; remaining liquid is a
 * separate value and must never be used as the scale reading.
 */
export function deriveBuretteState(input: BuretteInput): BuretteState {
  if (typeof input.sourceStateHash !== "string" || input.sourceStateHash.trim().length === 0) {
    throw new RangeError("burette source state hash cannot be empty");
  }
  if (!Number.isInteger(input.sequence) || input.sequence < 0) {
    throw new RangeError("burette sequence must be a non-negative integer");
  }
  const initialScaleReading = finiteNonNegative(
    input.initialScaleReading,
    "initial burette scale reading",
  );
  const initialContainedVolume = finiteNonNegative(
    input.initialContainedVolume,
    "initial burette contained volume",
  );
  const deliveryValues: number[] = [];
  for (const volume of input.deliveredVolumes) {
    deliveryValues.push(finiteNonNegative(volume, "delivered burette volume"));
  }
  const summed = compensatedSum(deliveryValues);
  const discrepancy = summed.value - initialContainedVolume;
  const boundaryBound =
    summed.roundoffBound +
    Number.EPSILON * Math.max(1, Math.abs(summed.value), initialContainedVolume) * 8;
  const isFullDraw =
    Math.abs(discrepancy) <= boundaryBound;
  const delivered = isFullDraw ? initialContainedVolume : summed.value;
  if (delivered > initialContainedVolume) {
    throw new RangeError("burette deliveries overdraw the initial volume");
  }
  return Object.freeze({
    sourceStateHash: input.sourceStateHash,
    sequence: input.sequence,
    currentScaleReading: litre(initialScaleReading + delivered),
    deliveredVolume: litre(delivered),
    containedVolume: litre(initialContainedVolume - delivered),
  });
}
