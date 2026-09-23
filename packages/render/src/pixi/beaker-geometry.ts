import {
  valueToPhysicalPosition,
  type InstrumentMarking,
} from "../assets/instrument-marking.js";
import calibration from "../assets/beaker-visual-calibration.json";

interface CalibrationPoint {
  readonly x: number;
  readonly y: number;
}

const VISUAL_CALIBRATION = calibration as {
  readonly status: "provisional-visual-calibration";
  readonly measurementUse: "forbidden";
  readonly cavity: {
    readonly topY: number;
    readonly bottomY: number;
    readonly leftWall: readonly CalibrationPoint[];
    readonly rightWall: readonly CalibrationPoint[];
    readonly surface: { readonly kind: "perspective-ellipse"; readonly depth: number };
  };
};

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
  readonly wallContact: {
    readonly left: number;
    readonly right: number;
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

function boundaryXAtY(points: readonly CalibrationPoint[], y: number): number {
  const first = points[0];
  const last = points.at(-1);
  if (first === undefined || last === undefined) throw new RangeError("beaker cavity boundary is empty");
  if (y <= first.y) return first.x;
  if (y >= last.y) return last.x;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    if (y <= current.y) {
      const span = current.y - previous.y;
      const fraction = span === 0 ? 0 : (y - previous.y) / span;
      return previous.x + (current.x - previous.x) * fraction;
    }
  }
  return last.x;
}

/**
 * Visual-only upright geometry for the approved beaker actor.
 *
 * The coordinates are normalized artwork coordinates, not dimensions and not
 * a substitute for the scientific VolumeProfile. The actual fill fraction is
 * supplied by the Observable liquid-level result.
 */
export function buildBeakerLiquidGeometry(fillFraction: number): BeakerLiquidGeometry {
  if (VISUAL_CALIBRATION.status !== "provisional-visual-calibration" || VISUAL_CALIBRATION.measurementUse !== "forbidden") {
    throw new Error("beaker visual calibration must remain provisional and non-measurement");
  }
  const fraction = clampUnit(fillFraction);
  const cavityTop = VISUAL_CALIBRATION.cavity.topY;
  const cavityBottom = VISUAL_CALIBRATION.cavity.bottomY;
  const y = cavityBottom - (cavityBottom - cavityTop) * fraction;
  const left = boundaryXAtY(VISUAL_CALIBRATION.cavity.leftWall, y);
  const right = boundaryXAtY(VISUAL_CALIBRATION.cavity.rightWall, y);
  const leftBottom = boundaryXAtY(VISUAL_CALIBRATION.cavity.leftWall, cavityBottom);
  const rightBottom = boundaryXAtY(VISUAL_CALIBRATION.cavity.rightWall, cavityBottom);
  const depth = VISUAL_CALIBRATION.cavity.surface.depth * (0.85 + 0.15 * (1 - fraction));
  const baseY = cavityBottom;
  const baseWidth = rightBottom - leftBottom;
  const baseShoulder = baseWidth * 0.12;
  return Object.freeze({
    measurementUse: "forbidden",
    body: Object.freeze([
      [left, y],
      [right, y],
      [rightBottom, baseY - 0.04],
      [rightBottom - baseShoulder, baseY - 0.012],
      [rightBottom - baseShoulder * 2.2, baseY],
      [leftBottom + baseShoulder * 2.2, baseY],
      [leftBottom + baseShoulder, baseY - 0.012],
      [leftBottom, baseY],
    ] as const),
    surface: Object.freeze({
      kind: "perspective-ellipse" as const,
      left,
      right,
      y,
      depth,
    }),
    wallContact: Object.freeze({ left, right }),
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
