import { describe, expect, it } from "vitest";

import {
  assertInstrumentMarking,
  valueToPhysicalPosition,
  type InstrumentMarking,
} from "./instrument-marking.js";

const provenance = {
  sourceId: "test-instrument-source",
  sourceRef: "docs/research/test-instrument.md",
  sourceClass: "manufacturer-anchor" as const,
  claim: "Test instrument marking semantics",
  reportedPrecision: "reported" as const,
};

const burette: InstrumentMarking = {
  kind: "burette-ex",
  displayRangeMl: { minimum: 0, maximum: 25 },
  valueDirection: "increases-downward",
  reference: "top-zero",
  calibration: "Ex",
  markingSurface: "tube-wrap",
  labelPolicy: "all-major",
  majorIntervalMl: 1,
  minorIntervalMl: 0.05,
  readingResolutionMl: 0.05,
  calibrationTemperatureCelsius: 20,
  accuracyClass: "AS",
  provenance,
};

describe("instrument-specific marking semantics", () => {
  it("maps a top-zero burette value downward onto its tube marking surface", () => {
    expect(valueToPhysicalPosition(burette, 0, { start: 24, end: 744 })).toBe(24);
    expect(valueToPhysicalPosition(burette, 12.5, { start: 24, end: 744 })).toBe(384);
    expect(valueToPhysicalPosition(burette, 25, { start: 24, end: 744 })).toBe(744);
  });

  it("maps approximate contained-volume marks upward from the vessel base", () => {
    const beaker: InstrumentMarking = {
      kind: "approximate-contained",
      displayRangeMl: { minimum: 25, maximum: 200 },
      valueDirection: "increases-upward",
      reference: "bottom-zero",
      calibration: "approximate",
      markingSurface: "vessel-wall",
      labelPolicy: "selected-major",
      majorIntervalMl: 25,
      minorIntervalMl: undefined,
      readingResolutionMl: undefined,
      provenance,
    };
    expect(valueToPhysicalPosition(beaker, 25, { start: 20, end: 85 })).toBe(85);
    expect(valueToPhysicalPosition(beaker, 200, { start: 20, end: 85 })).toBe(20);
  });

  it("rejects a burette marking whose direction and reference disagree", () => {
    expect(() => assertInstrumentMarking({
      ...burette,
      valueDirection: "increases-upward",
    })).toThrow(/top-zero.*downward|direction.*reference/i);
  });

  it("rejects a generic graduation record instead of treating it as an instrument rule", () => {
    expect(() => assertInstrumentMarking({
      maximumMl: 25,
      majorEveryMl: 1,
      minorEveryMl: 0.05,
      readingResolutionMl: 0.05,
    })).toThrow(/instrument marking|kind/i);
  });
});
