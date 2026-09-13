import { describe, expect, it } from "vitest";
import {
  kelvin,
  kilogram,
  litre,
  mol,
  thermodynamicConstant,
} from "@chemrealm/schema";
import { buildAcidBaseSolveRequest } from "./request.js";
import { DEFAULT_ACID_BASE_CONSTANTS } from "./model.js";

describe("acid-base solve request builder", () => {
  it("owns component mode and model Ka selection in Scientific Core", () => {
    const request = buildAcidBaseSolveRequest({
      waterMass: kilogram(1),
      liquidVolume: litre(0.1),
      temperature: kelvin(298.15),
      componentAmounts: [
        { componentId: "HCl", amount: mol(0.01) },
        { componentId: "NaOH", amount: mol(0.02) },
        { componentId: "HOAc", amount: mol(0.03) },
        { componentId: "NaOAc", amount: mol(0.04) },
      ],
      indicators: [{ indicatorId: "phenolphthalein", kaIn: thermodynamicConstant(3.98e-10) }],
    });

    expect(request.solutes).toMatchObject([
      { soluteId: "HCl", mode: "fully-dissociated" },
      { soluteId: "NaOH", mode: "fully-dissociated" },
      {
        soluteId: "HOAc",
        mode: "monoprotic-equilibrium",
        ka: DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc,
      },
      { soluteId: "NaOAc", mode: "fully-dissociated" },
    ]);
    expect(request.indicators[0]?.kaIn.value).toBe(3.98e-10);
    expect(Object.isFrozen(request.solutes)).toBe(true);
  });

  it("rejects an actual component that the model catalog does not own", () => {
    expect(() =>
      buildAcidBaseSolveRequest({
        waterMass: kilogram(1),
        liquidVolume: litre(0.1),
        temperature: kelvin(298.15),
        componentAmounts: [{ componentId: "HNO3", amount: mol(0.01) }],
        indicators: [],
      }),
    ).toThrow(/outside the v0 model/);
  });
});
