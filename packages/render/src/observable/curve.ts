import {
  ph,
  taughtHydrogenIonExponent,
  type Litre,
  type Ph,
  type TeachingHydrogenIonExponent,
} from "@chemrealm/schema";

export interface CurveFrame {
  readonly sourceStateHash: string;
  readonly sequence: number;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly volume: Litre;
  readonly taughtHydrogenIonExponent: TeachingHydrogenIonExponent;
  readonly modelPh: Ph;
}

export type CurvePoint = CurveFrame;

function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name}: expected a finite value`);
  }
  return value;
}

/** Preserve supplied state/projection values in their committed order. */
export function buildCurve(frames: readonly CurveFrame[]): readonly CurvePoint[] {
  let previousSequence = -1;
  let modelIdentity: string | undefined;
  const points = frames.map((frame) => {
    if (typeof frame.sourceStateHash !== "string" || frame.sourceStateHash.trim().length === 0) {
      throw new RangeError("curve source state hash cannot be empty");
    }
    if (!Number.isInteger(frame.sequence) || frame.sequence < 0 || frame.sequence <= previousSequence) {
      throw new RangeError("curve frames must have strictly increasing sequences");
    }
    if (
      typeof frame.modelId !== "string" ||
      frame.modelId.trim().length === 0 ||
      typeof frame.modelVersion !== "string" ||
      frame.modelVersion.trim().length === 0
    ) {
      throw new RangeError("curve solver identity cannot be empty");
    }
    const nextModelIdentity = `${frame.modelId}@${frame.modelVersion}`;
    if (modelIdentity === undefined) modelIdentity = nextModelIdentity;
    if (nextModelIdentity !== modelIdentity) {
      throw new RangeError("curve frames must share one solver identity");
    }
    previousSequence = frame.sequence;
    finite(frame.volume, "curve volume");
    if (frame.volume < 0) throw new RangeError("curve volume cannot be negative");
    finite(frame.taughtHydrogenIonExponent.value, "taught hydrogen exponent");
    finite(frame.modelPh.value, "model pH");
    return Object.freeze({
      sourceStateHash: frame.sourceStateHash,
      sequence: frame.sequence,
      modelId: frame.modelId,
      modelVersion: frame.modelVersion,
      volume: frame.volume,
      taughtHydrogenIonExponent: Object.freeze(
        taughtHydrogenIonExponent(frame.taughtHydrogenIonExponent.value),
      ),
      modelPh: Object.freeze(ph(frame.modelPh.value)),
    });
  });
  return Object.freeze(points);
}
