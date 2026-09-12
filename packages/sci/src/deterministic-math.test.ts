import { describe, expect, it } from "vitest";
import {
  DET_EXP10_DOMAIN,
  detExp10,
  detLog10,
} from "./deterministic-math.js";

function orderedBits(value: number): bigint {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value);
  const bits = view.getBigUint64(0);
  const sign = 0x8000000000000000n;
  return (bits & sign) === 0n ? sign + bits : sign - (bits & ~sign);
}

function ulpDistance(actual: number, expected: number): bigint {
  const actualBits = orderedBits(actual);
  const expectedBits = orderedBits(expected);
  return actualBits >= expectedBits
    ? actualBits - expectedBits
    : expectedBits - actualBits;
}

describe("deterministic base-10 math", () => {
  it.each([
    [1, "0"],
    [10, "1"],
    [0.1, "-1"],
    [2, "0.301029995663981195213738894724493026768"],
    [1e-14, "-14"],
    [1e5, "5"],
    [1.00000053, "2.301760144596877955911705599375672784258e-7"],
    [1.0001, "0.0000434272768626648547275520783448479648887"],
  ] as const)("computes log10(%s) within one ulp of the independent reference", (input, expected) => {
    expect(ulpDistance(detLog10(input), Number(expected))).toBeLessThanOrEqual(1n);
  });

  it.each([
    [-0.137, "0.7294575102545687214141455472302692669374"],
    [-0.135, "0.7328245331389040846182252915434901346266"],
    [-0.117099, "0.7636616825301398363695933656006664336279"],
    [-0.1, "0.794328234724281502065918282836387932589"],
    [-0.05, "0.891250938133745529953108681078296963985"],
    [-0.01, "0.977237220955810682697076006961561238634"],
    [0, "1"],
  ] as const)("computes 10^(%s) within one ulp of the independent reference", (input, expected) => {
    expect(ulpDistance(detExp10(input), Number(expected))).toBeLessThanOrEqual(1n);
  });

  it("declares the measured exp10 domain explicitly", () => {
    expect(DET_EXP10_DOMAIN).toEqual([-0.137, 0]);
    expect(Number.isFinite(detExp10(DET_EXP10_DOMAIN[0]))).toBe(true);
    expect(Number.isFinite(detExp10(DET_EXP10_DOMAIN[1]))).toBe(true);
  });

  it.each([
    ["log zero", () => detLog10(0)],
    ["log negative", () => detLog10(-1)],
    ["log subnormal", () => detLog10(Number.MIN_VALUE)],
    ["log infinity", () => detLog10(Number.POSITIVE_INFINITY)],
    ["log NaN", () => detLog10(Number.NaN)],
    ["exp below domain", () => detExp10(-0.137001)],
    ["exp above domain", () => detExp10(0.000001)],
    ["exp infinity", () => detExp10(Number.POSITIVE_INFINITY)],
    ["exp NaN", () => detExp10(Number.NaN)],
  ])("rejects %s instead of silently using native math", (_name, operation) => {
    expect(operation).toThrow(RangeError);
  });
});
