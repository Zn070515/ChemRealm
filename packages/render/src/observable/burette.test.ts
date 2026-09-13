import { describe, expect, it } from "vitest";
import { litre } from "@chemrealm/schema";
import { deriveBuretteReading } from "./burette.js";

describe("burette observable", () => {
  it("derives reading as initial volume minus committed deliveries", () => {
    const reading = deriveBuretteReading({
      initialVolume: litre(0.05),
      deliveredVolumes: [litre(0.01), litre(0.015), litre(0.005)],
    });
    expect(reading).toBeCloseTo(0.02, 15);
  });

  it("allows a full draw and returns semantic zero", () => {
    expect(
      deriveBuretteReading({
        initialVolume: litre(0.05),
        deliveredVolumes: [litre(0.02), litre(0.03)],
      }),
    ).toBe(0);
  });

  it("rejects a delivery sequence that overdraws the burette", () => {
    expect(() =>
      deriveBuretteReading({
        initialVolume: litre(0.05),
        deliveredVolumes: [litre(0.04), litre(0.02)],
      }),
    ).toThrow(RangeError);
  });
});
