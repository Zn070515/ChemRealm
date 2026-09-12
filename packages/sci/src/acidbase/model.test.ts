import { describe, expect, it } from "vitest";
import { buildAcidBaseModelDescriptor } from "./catalog.js";

describe("acid-base model domain", () => {
  it("declares the aqueous 25 C supported domain", () => {
    const descriptor = buildAcidBaseModelDescriptor();
    expect(descriptor.validity.solvent).toBe("water");
    expect(descriptor.validity.phase).toBe("aqueous");
    expect(descriptor.validity.temperature.min).toBe(298.15);
    expect(descriptor.validity.temperature.max).toBe(298.15);
    expect(descriptor.validity.species).toEqual([
      "HCl",
      "NaOH",
      "HOAc",
      "NaOAc",
    ]);
  });
});
