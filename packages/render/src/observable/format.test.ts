import { describe, expect, it } from "vitest";
import { litre, ph, taughtHydrogenIonExponent } from "@chemrealm/schema";
import {
  formatBuretteReading,
  formatModelPh,
  formatTaughtPh,
} from "./format.js";

describe("observable readout formatting", () => {
  it("formats the taught quantity as pH to two decimal places", () => {
    expect(formatTaughtPh(taughtHydrogenIonExponent(4.7447123))).toBe("pH 4.74");
  });

  it("labels model pH with its activity model", () => {
    const formatted = formatModelPh(ph(4.7447123), "Davies");
    expect(formatted).toBe("model pH (Davies) 4.74");
    expect(formatted).not.toContain("true");
    expect(formatted).not.toContain("thermodynamic");
  });

  it("formats burette volume to the instrument's two-decimal display", () => {
    expect(formatBuretteReading(litre(0.025))).toBe("0.03 L");
  });
});
