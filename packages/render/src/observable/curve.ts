import {
  ph,
  taughtHydrogenIonExponent,
  type Litre,
  type Ph,
  type TeachingHydrogenIonExponent,
} from "@chemrealm/schema";

export interface CurveFrame {
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
  const points = frames.map((frame) => {
    finite(frame.volume, "curve volume");
    if (frame.volume < 0) throw new RangeError("curve volume cannot be negative");
    finite(frame.taughtHydrogenIonExponent.value, "taught hydrogen exponent");
    finite(frame.modelPh.value, "model pH");
    return Object.freeze({
      volume: frame.volume,
      taughtHydrogenIonExponent: Object.freeze(
        taughtHydrogenIonExponent(frame.taughtHydrogenIonExponent.value),
      ),
      modelPh: Object.freeze(ph(frame.modelPh.value)),
    });
  });
  return Object.freeze(points);
}
