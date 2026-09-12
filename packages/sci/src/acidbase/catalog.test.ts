import { describe, expect, it } from "vitest";
import {
  aggregateComponents,
  ACID_BASE_COMPONENT_CATALOG,
} from "./catalog.js";
import {
  ACID_BASE_MODEL_ID,
  ACID_BASE_MODEL_VERSION,
  DEFAULT_ACID_BASE_CONSTANTS,
  buildAcidBaseModelDescriptor,
  buildAcidBaseSolverConfig,
} from "./model.js";
import { kilogram, litre, mol, thermodynamicConstant } from "@chemrealm/schema";
import type { SolveRequest } from "@chemrealm/schema";

const ka = DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc;

function request(
  solutes: SolveRequest["solutes"],
): SolveRequest {
  return {
    waterMass: kilogram(1),
    liquidVolume: litre(1),
    solutes,
    temperature: 298.15 as SolveRequest["temperature"],
    indicators: [],
  };
}

describe("v0 acid-base component catalog", () => {
  it("maps the four supported components to model-owned analytical totals", () => {
    const totals = aggregateComponents(
      request([
        { soluteId: "HCl", amount: mol(0.1), mode: "fully-dissociated" },
        { soluteId: "NaOH", amount: mol(0.02), mode: "fully-dissociated" },
        {
          soluteId: "HOAc",
          amount: mol(0.03),
          mode: "monoprotic-equilibrium",
          ka,
        },
        { soluteId: "NaOAc", amount: mol(0.04), mode: "fully-dissociated" },
      ]),
    );

    expect(totals.strongAcidChlorideMolality.value).toBe(0.1);
    expect(totals.strongBaseSodiumMolality.value).toBe(0.06);
    expect(totals.totalAcidFamilyMolality.value).toBe(0.03);
    expect(totals.totalAcetateMolality.value).toBe(0.04);
  });

  it("aggregates identical duplicate entries without changing their meaning", () => {
    const totals = aggregateComponents(
      request([
        { soluteId: "HCl", amount: mol(0.02), mode: "fully-dissociated" },
        { soluteId: "HCl", amount: mol(0.03), mode: "fully-dissociated" },
        {
          soluteId: "HOAc",
          amount: mol(0.01),
          mode: "monoprotic-equilibrium",
          ka,
        },
        {
          soluteId: "HOAc",
          amount: mol(0.02),
          mode: "monoprotic-equilibrium",
          ka: thermodynamicConstant(ka.value),
        },
      ]),
    );

    expect(totals.strongAcidChlorideMolality.value).toBe(0.05);
    expect(totals.totalAcidFamilyMolality.value).toBe(0.03);
  });

  it.each([
    {
      name: "unsupported id",
      solutes: [{ soluteId: "HNO3", amount: mol(0.1), mode: "fully-dissociated" }],
    },
    {
      name: "wrong mode for HCl",
      solutes: [{ soluteId: "HCl", amount: mol(0.1), mode: "monoprotic-equilibrium", ka }],
    },
    {
      name: "wrong mode for HOAc",
      solutes: [{ soluteId: "HOAc", amount: mol(0.1), mode: "fully-dissociated" }],
    },
    {
      name: "conflicting duplicate Ka",
      solutes: [
        { soluteId: "HOAc", amount: mol(0.01), mode: "monoprotic-equilibrium", ka },
        {
          soluteId: "HOAc",
          amount: mol(0.01),
          mode: "monoprotic-equilibrium",
          ka: thermodynamicConstant(ka.value + 1e-10),
        },
      ],
    },
  ])("rejects $name as an unsupported model request", ({ solutes }) => {
    expect(() => aggregateComponents(request(solutes))).toThrow(/outside|unsupported|Ka|mode/i);
  });
});

describe("fixed acid-base model identity", () => {
  it("does not allow callers to mutate the model-owned catalog", () => {
    const catalog = ACID_BASE_COMPONENT_CATALOG as Map<string, unknown>;

    expect(() => catalog.set("HNO3", {})).toThrow();
    expect(ACID_BASE_COMPONENT_CATALOG.has("HNO3")).toBe(false);
    expect(ACID_BASE_COMPONENT_CATALOG.get("HCl")?.mode).toBe(
      "fully-dissociated",
    );
  });

  it("builds the exact descriptor and config used by the production factory", () => {
    const descriptor = buildAcidBaseModelDescriptor();
    const config = buildAcidBaseSolverConfig();

    expect(descriptor.id).toBe(ACID_BASE_MODEL_ID);
    expect(descriptor.version).toBe(ACID_BASE_MODEL_VERSION);
    expect(config).toEqual({
      id: ACID_BASE_MODEL_ID,
      version: ACID_BASE_MODEL_VERSION,
      parameters: expect.objectContaining({
        Kw: DEFAULT_ACID_BASE_CONSTANTS.Kw.value,
        Ka_HOAc: DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc.value,
        Davies_A: 0.509,
        Davies_b: 0.3,
        standardMolality: 1,
        neutralAcidActivityCoefficient: 1,
        numericPrecisionSignificantDigits: 12,
        numericPolicyVersion: 1,
      }),
    });
    expect(descriptor.validity.temperature.min).toBe(298.15);
    expect(descriptor.validity.temperature.max).toBe(298.15);
    expect(descriptor.validity.ionicStrengthMolalMax.value).toBe(0.5);
    expect(descriptor.validity.species).toEqual(
      expect.arrayContaining(["HCl", "NaOH", "HOAc", "NaOAc"]),
    );
    expect(descriptor.validity.activityCorrected).toBe(true);
  });

  it("returns immutable identity objects", () => {
    const descriptor = buildAcidBaseModelDescriptor();
    const config = buildAcidBaseSolverConfig();

    expect(Object.isFrozen(descriptor)).toBe(true);
    expect(Object.isFrozen(descriptor.validity)).toBe(true);
    expect(Object.isFrozen(descriptor.validity.species)).toBe(true);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.parameters)).toBe(true);
  });
});
