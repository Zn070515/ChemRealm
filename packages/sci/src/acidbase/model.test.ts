import { describe, expect, it } from "vitest";
import { buildAcidBaseModelDescriptor } from "./catalog.js";
import {
  acidBaseConstantsFromSolverConfig,
  buildAcidBaseSolverConfig,
} from "./model.js";

describe("acid-base model domain", () => {
  it("decodes production constants from the frozen solver config", () => {
    const config = buildAcidBaseSolverConfig();
    const constants = acidBaseConstantsFromSolverConfig(config);

    expect(constants.Kw.value).toBe(config.parameters.Kw);
    expect(constants.Ka_HOAc.value).toBe(config.parameters.Ka_HOAc);
    expect(constants.daviesA).toBe(config.parameters.Davies_A);
    expect(constants.daviesB).toBe(config.parameters.Davies_b);
    expect(constants.standardMolality).toBe(config.parameters.standardMolality);
    expect(constants.waterActivity.value).toBe(config.parameters.waterActivity);
  });

  it("declares the aqueous 25 C supported domain", () => {
    const descriptor = buildAcidBaseModelDescriptor();
    expect(descriptor.validity.solvent).toBe("water");
    expect(descriptor.validity.phase).toBe("aqueous");
    expect(descriptor.validity.temperature.min).toBe(298.15);
    expect(descriptor.validity.temperature.max).toBe(298.15);
    expect(descriptor.validity.species).toEqual([
      "H2O",
      "H+",
      "OH-",
      "HOAc",
      "OAc-",
      "Na+",
      "Cl-",
    ]);
    expect(descriptor.validity.components).toEqual(["HCl", "NaOH", "HOAc", "NaOAc"]);
  });
});
