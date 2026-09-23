import {
  valueToPhysicalPosition,
  type InstrumentMarking,
} from "../assets/instrument-marking.js";

export interface BeakerLiquidGeometry {
  readonly measurementUse: "forbidden";
  readonly body: readonly (readonly [number, number])[];
  readonly surface: {
    readonly kind: "perspective-ellipse";
    readonly left: number;
    readonly right: number;
    readonly y: number;
    readonly depth: number;
  };
}

export interface BeakerGraduationMark {
  readonly valueMl: number;
  readonly y: number;
  readonly isMajor: boolean;
  readonly showLabel: boolean;
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError("beaker visual fill must be finite");
  return Math.max(0, Math.min(1, value));
}

/**
 * Visual-only upright geometry for the approved beaker actor.
 *
 * The coordinates are normalized artwork coordinates, not dimensions and not
 * a substitute for the scientific VolumeProfile. The actual fill fraction is
 * supplied by the Observable liquid-level result.
 */
export function buildBeakerLiquidGeometry(fillFraction: number): BeakerLiquidGeometry {
  const fraction = clampUnit(fillFraction);
  const cavityTop = 0.12;
  const cavityBottom = 0.9;
  const leftTop = 0.18;
  const rightTop = 0.82;
  const leftBottom = 0.23;
  const rightBottom = 0.77;
  const y = cavityBottom - (cavityBottom - cavityTop) * fraction;
  const left = leftBottom + (leftTop - leftBottom) * fraction;
  const right = rightBottom + (rightTop - rightBottom) * fraction;
  const depth = 0.018 + 0.012 * (1 - fraction);
  const baseY = cavityBottom;
  return Object.freeze({
    measurementUse: "forbidden",
    body: Object.freeze([
      [left, y],
      [right, y],
      [rightBottom, baseY - 0.04],
      [0.68, baseY],
      [0.32, baseY],
      [leftBottom, baseY],
    ] as const),
    surface: Object.freeze({
      kind: "perspective-ellipse" as const,
      left,
      right,
      y,
      depth,
    }),
  });
}

/**
 * Project the declared instrument marking into the visual calibration span.
 * This is representation-only: it never changes the VolumeProfile or claims
 * metrological accuracy for an approximate contained-volume scale.
 */
export function buildBeakerGraduationMarks(
  marking: InstrumentMarking,
  span: { readonly start: number; readonly end: number },
): readonly BeakerGraduationMark[] {
  const minimum = marking.displayRangeMl.minimum;
  const maximum = marking.displayRangeMl.maximum;
  const minor = "minorIntervalMl" in marking ? marking.minorIntervalMl : undefined;
  const major = "majorIntervalMl" in marking ? marking.majorIntervalMl : undefined;
  if (minor === undefined || major === undefined) return Object.freeze([]);

  const marks: BeakerGraduationMark[] = [];
  const count = Math.floor((maximum - minimum) / minor + 1e-9);
  for (let index = 0; index <= count; index += 1) {
    const valueMl = minimum + index * minor;
    if (valueMl > maximum + 1e-9) continue;
    const majorIndex = (valueMl - minimum) / major;
    const isMajor = Math.abs(majorIndex - Math.round(majorIndex)) <= 1e-9;
    marks.push(Object.freeze({
      valueMl,
      y: valueToPhysicalPosition(marking, valueMl, span),
      isMajor,
      showLabel: marking.labelPolicy === "all-major" || (marking.labelPolicy === "selected-major" && isMajor),
    }));
  }
  return Object.freeze(marks);
}
