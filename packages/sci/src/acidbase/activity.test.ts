import { describe, expect, it } from "vitest";
import {
  reducedIonicStrength,
  type ReducedIonicStrength,
} from "@chemrealm/schema";
import { daviesActivities } from "./activity.js";
import { DEFAULT_ACID_BASE_CONSTANTS } from "./model.js";

function relativeError(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.abs(expected);
}

describe("Davies activity coefficients", () => {
  it.each([
    [0, 1],
    [0.001, 0.9650506422971322],
    [0.01, 0.9020991481709937],
    [0.1, 0.7815939439468334],
    [0.4, 0.7309374666232693],
    [0.5, 0.7336945562067271],
  ])("computes monovalent gamma at reduced I=%s", (ionicStrength, expected) => {
    const activities = daviesActivities(
      reducedIonicStrength(ionicStrength),
      DEFAULT_ACID_BASE_CONSTANTS,
    );

    expect(relativeError(activities.hydrogen.value, expected)).toBeLessThan(2e-15);
    expect(activities.hydroxide.value).toBe(activities.hydrogen.value);
    expect(activities.monovalentAnion.value).toBe(activities.hydrogen.value);
    expect(activities.hydrogen.value).toBeGreaterThan(0);
  });

  it("uses the explicit neutral-acid convention", () => {
    const activities = daviesActivities(
      reducedIonicStrength(0.5),
      DEFAULT_ACID_BASE_CONSTANTS,
    );

    expect(activities.neutralAcid).toEqual(
      DEFAULT_ACID_BASE_CONSTANTS.neutralAcidActivityCoefficient,
    );
    expect(activities.neutralAcid.value).toBe(1);
  });

  it("derives the Davies z=2 coefficient for the ordinary diprotic indicator", () => {
    const activities = daviesActivities(
      reducedIonicStrength(0.1),
      DEFAULT_ACID_BASE_CONSTANTS,
    );

    expect(activities.divalentAnion.value).toBeCloseTo(
      activities.monovalentAnion.value ** 4,
      15,
    );
    expect(activities.divalentAnion.value).toBeGreaterThan(0);
  });

  it.each([
    ["negative", -1],
    ["NaN", Number.NaN],
    ["infinity", Number.POSITIVE_INFINITY],
  ])("rejects %s reduced ionic strength at the activity boundary", (_name, value) => {
    expect(() =>
      daviesActivities(
        { value } as ReducedIonicStrength,
        DEFAULT_ACID_BASE_CONSTANTS,
      ),
    ).toThrow(RangeError);
  });

  it("rejects ionic strength outside the declared Davies domain", () => {
    expect(() =>
      daviesActivities(
        reducedIonicStrength(0.500001),
        DEFAULT_ACID_BASE_CONSTANTS,
      ),
    ).toThrow(/outside.*domain/i);
  });
});
