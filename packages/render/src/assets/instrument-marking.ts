import type { ApparatusProvenance } from "./apparatus-provenance.js";

export type InstrumentMarkingKind =
  | "burette-ex"
  | "burette-approximate"
  | "graduated-cylinder-in"
  | "approximate-contained"
  | "volumetric-single-mark";

export type InstrumentMarking =
  | BuretteExMarking
  | BuretteApproximateMarking
  | GraduatedCylinderInMarking
  | ApproximateContainedMarking
  | VolumetricSingleMarking;

interface InstrumentMarkingBase {
  readonly displayRangeMl: {
    readonly minimum: number;
    readonly maximum: number;
  };
  readonly valueDirection: "increases-downward" | "increases-upward" | "single-mark";
  readonly reference: "top-zero" | "bottom-zero" | "single-calibration-mark";
  readonly markingSurface: "tube-wrap" | "vessel-wall" | "neck-ring";
  readonly labelPolicy: "all-major" | "selected-major" | "none";
  readonly provenance: ApparatusProvenance;
}

export interface BuretteExMarking extends InstrumentMarkingBase {
  readonly kind: "burette-ex";
  readonly valueDirection: "increases-downward";
  readonly reference: "top-zero";
  readonly markingSurface: "tube-wrap";
  readonly calibration: "Ex";
  readonly majorIntervalMl: number;
  readonly minorIntervalMl: number;
  readonly readingResolutionMl: number;
  readonly calibrationTemperatureCelsius: number;
  readonly accuracyClass: string;
}

export interface GraduatedCylinderInMarking extends InstrumentMarkingBase {
  readonly kind: "graduated-cylinder-in";
  readonly valueDirection: "increases-upward";
  readonly reference: "bottom-zero";
  readonly markingSurface: "vessel-wall";
  readonly calibration: "In";
  readonly majorIntervalMl: number;
  readonly minorIntervalMl: number;
  readonly readingResolutionMl: number;
}

export interface BuretteApproximateMarking extends InstrumentMarkingBase {
  readonly kind: "burette-approximate";
  readonly valueDirection: "increases-downward";
  readonly reference: "top-zero";
  readonly markingSurface: "tube-wrap";
  readonly calibration: "approximate";
  readonly majorIntervalMl: number;
  readonly minorIntervalMl: number;
  readonly readingResolutionMl: number;
}

export interface ApproximateContainedMarking extends InstrumentMarkingBase {
  readonly kind: "approximate-contained";
  readonly valueDirection: "increases-upward";
  readonly reference: "bottom-zero";
  readonly markingSurface: "vessel-wall";
  readonly calibration: "approximate";
  readonly majorIntervalMl: number;
  readonly minorIntervalMl: number | undefined;
  readonly readingResolutionMl: number | undefined;
}

export interface VolumetricSingleMarking extends InstrumentMarkingBase {
  readonly kind: "volumetric-single-mark";
  readonly valueDirection: "single-mark";
  readonly reference: "single-calibration-mark";
  readonly markingSurface: "neck-ring";
  readonly calibration: "In" | "Ex";
  readonly nominalVolumeMl: number;
  readonly toleranceMl: number | undefined;
  readonly calibrationTemperatureCelsius: number | undefined;
  readonly accuracyClass: string | undefined;
}

export interface PhysicalMarkingSpan {
  readonly start: number;
  readonly end: number;
}

const isFinitePositive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const hasProvenance = (value: unknown): value is ApparatusProvenance => {
  if (value === null || typeof value !== "object") return false;
  const provenance = value as Record<string, unknown>;
  return typeof provenance.sourceId === "string" && provenance.sourceId.trim().length > 0
    && typeof provenance.sourceRef === "string" && provenance.sourceRef.trim().length > 0
    && typeof provenance.claim === "string" && provenance.claim.trim().length > 0
    && (provenance.sourceClass === "standard-family" || provenance.sourceClass === "manufacturer-anchor" || provenance.sourceClass === "approximate-visual")
    && (provenance.reportedPrecision === "reported" || provenance.reportedPrecision === "not-stated" || provenance.reportedPrecision === "approximate");
};

function assertCommon(value: Record<string, unknown>): void {
  const range = value.displayRangeMl;
  if (range === null || typeof range !== "object") throw new TypeError("instrument marking range is required");
  const minimum = (range as Record<string, unknown>).minimum;
  const maximum = (range as Record<string, unknown>).maximum;
  if (!isFiniteNonNegative(minimum) || !isFinitePositive(maximum) || minimum >= maximum) {
    throw new RangeError("instrument marking range must be finite and increasing");
  }
  if (value.labelPolicy !== "all-major" && value.labelPolicy !== "selected-major" && value.labelPolicy !== "none") {
    throw new TypeError("instrument marking label policy is invalid");
  }
  if (!hasProvenance(value.provenance)) throw new TypeError("instrument marking provenance is required");
  if (value.reference === "top-zero" && value.valueDirection !== "increases-downward") {
    throw new TypeError("top-zero instrument markings must increase downward");
  }
  if (value.reference === "bottom-zero" && value.valueDirection !== "increases-upward") {
    throw new TypeError("bottom-zero instrument markings must increase upward");
  }
  if (value.reference === "single-calibration-mark" && value.valueDirection !== "single-mark") {
    throw new TypeError("single calibration markings must use single-mark direction");
  }
}

export function assertInstrumentMarking(value: unknown): asserts value is InstrumentMarking {
  if (value === null || typeof value !== "object") throw new TypeError("instrument marking object is required");
  const record = value as Record<string, unknown>;
  assertCommon(record);
  switch (record.kind) {
    case "burette-ex":
      if (record.calibration !== "Ex" || record.markingSurface !== "tube-wrap" || record.reference !== "top-zero") {
        throw new TypeError("burette Ex marking has incompatible calibration, surface, or reference");
      }
      if (!isFinitePositive(record.majorIntervalMl) || !isFinitePositive(record.minorIntervalMl) || !isFinitePositive(record.readingResolutionMl)) {
        throw new RangeError("burette marking intervals must be positive");
      }
      if (!Number.isFinite(record.calibrationTemperatureCelsius) || typeof record.accuracyClass !== "string" || record.accuracyClass.trim().length === 0) {
        throw new TypeError("burette marking calibration identity is incomplete");
      }
      return;
    case "graduated-cylinder-in":
      if (record.calibration !== "In" || record.markingSurface !== "vessel-wall" || record.reference !== "bottom-zero") {
        throw new TypeError("graduated-cylinder In marking has incompatible calibration, surface, or reference");
      }
      if (!isFinitePositive(record.majorIntervalMl) || !isFinitePositive(record.minorIntervalMl) || !isFinitePositive(record.readingResolutionMl)) {
        throw new RangeError("graduated-cylinder marking intervals must be positive");
      }
      return;
    case "burette-approximate":
      if (record.calibration !== "approximate" || record.markingSurface !== "tube-wrap" || record.reference !== "top-zero") {
        throw new TypeError("approximate burette marking has incompatible calibration, surface, or reference");
      }
      if (!isFinitePositive(record.majorIntervalMl) || !isFinitePositive(record.minorIntervalMl) || !isFinitePositive(record.readingResolutionMl)) {
        throw new RangeError("approximate burette marking intervals must be positive");
      }
      return;
    case "approximate-contained":
      if (record.calibration !== "approximate" || record.markingSurface !== "vessel-wall" || record.reference !== "bottom-zero") {
        throw new TypeError("approximate contained marking has incompatible calibration, surface, or reference");
      }
      if (!isFinitePositive(record.majorIntervalMl)
        || (record.minorIntervalMl !== undefined && !isFinitePositive(record.minorIntervalMl))
        || (record.readingResolutionMl !== undefined && !isFinitePositive(record.readingResolutionMl))) {
        throw new RangeError("approximate contained marking intervals must be positive when present");
      }
      return;
    case "volumetric-single-mark":
      if (record.markingSurface !== "neck-ring" || record.reference !== "single-calibration-mark") {
        throw new TypeError("volumetric marking has incompatible surface or reference");
      }
      if (!isFinitePositive(record.nominalVolumeMl)
        || (record.toleranceMl !== undefined && !isFiniteNonNegative(record.toleranceMl))
        || (record.calibrationTemperatureCelsius !== undefined && !Number.isFinite(record.calibrationTemperatureCelsius))) {
        throw new RangeError("volumetric marking values must be finite and valid");
      }
      return;
    default:
      throw new TypeError("instrument marking kind is required");
  }
}

export function valueToPhysicalPosition(
  marking: InstrumentMarking,
  valueMl: number,
  span: PhysicalMarkingSpan,
): number {
  assertInstrumentMarking(marking);
  if (!Number.isFinite(valueMl)) throw new RangeError("marking value must be finite");
  if (!Number.isFinite(span.start) || !Number.isFinite(span.end) || span.start === span.end) {
    throw new RangeError("physical marking span must be finite and non-zero");
  }
  const { minimum, maximum } = marking.displayRangeMl;
  if (valueMl < minimum || valueMl > maximum) throw new RangeError("marking value is outside the display range");
  if (marking.kind === "volumetric-single-mark") {
    if (valueMl !== marking.nominalVolumeMl) throw new RangeError("single calibration marking has one nominal value");
    return (span.start + span.end) / 2;
  }
  const fraction = (valueMl - minimum) / (maximum - minimum);
  return marking.valueDirection === "increases-downward"
    ? span.start + fraction * (span.end - span.start)
    : span.end - fraction * (span.end - span.start);
}
