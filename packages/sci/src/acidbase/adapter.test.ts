import { describe, expect, it } from "vitest";
import {
  kilogram,
  kelvin,
  litre,
  mol,
  thermodynamicConstant,
  type SolveRequest,
  type SolveResult,
} from "@chemrealm/schema";

import { createAcidBaseAdapter } from "./index.js";
import {
  ACID_BASE_MODEL_ID,
  ACID_BASE_MODEL_VERSION,
  DEFAULT_ACID_BASE_CONSTANTS,
  buildAcidBaseSolverConfig,
} from "./model.js";

function request(
  solutes: SolveRequest["solutes"],
  indicators: SolveRequest["indicators"] = [],
): SolveRequest {
  return {
    waterMass: kilogram(1),
    liquidVolume: litre(1),
    solutes,
    temperature: kelvin(298.15),
    indicators,
  };
}

function expectOk(result: SolveResult) {
  expect(result.status).toBe("OK");
  if (result.status !== "OK") throw new Error("expected an OK result");
  return result.state;
}

describe("production acid-base SolverAdapter", () => {
  it("solves a strong-acid request asynchronously with complete ScientificState", async () => {
    const adapter = createAcidBaseAdapter();
    const pending = adapter.solve(
      request([{ soluteId: "HCl", amount: mol(0.1), mode: "fully-dissociated" }]),
    );

    expect(pending).toBeInstanceOf(Promise);
    const state = expectOk(await pending);

    expect(state.species.map((species) => species.symbol)).toEqual([
      "H+",
      "OH-",
      "HOAc",
      "OAc-",
      "Na+",
      "Cl-",
    ]);
    expect(state.species.every((species) =>
      Object.keys(species).sort().join(",") ===
      "activity,activityCoefficient,amount,molality,reducedMolality,symbol",
    )).toBe(true);
    expect(state.modelPh.value).toBeGreaterThan(1);
    expect(state.provenance).toEqual({
      modelId: ACID_BASE_MODEL_ID,
      modelVersion: ACID_BASE_MODEL_VERSION,
      activityModel: "Davies",
      category: "calculated",
      parameters: buildAcidBaseSolverConfig().parameters,
    });
  });

  it("computes indicator ratios inside the Scientific Reality Core", async () => {
    const adapter = createAcidBaseAdapter();
    const result = await adapter.solve(
      request(
        [{ soluteId: "NaOH", amount: mol(0.1), mode: "fully-dissociated" }],
        [{ indicatorId: "phenolphthalein", kaIn: thermodynamicConstant(1e-9) }],
      ),
    );
    const state = expectOk(result);

    expect(state.indicators).toHaveLength(1);
    expect(state.indicators[0]?.indicatorId).toBe("phenolphthalein");
    expect(state.indicators[0]?.protonationRatio).toBeGreaterThan(1);
  });

  it.each([
    [
      "unsupported component",
      request([{ soluteId: "HNO3", amount: mol(0.1), mode: "fully-dissociated" }] as never),
    ],
    [
      "temperature outside model domain",
      { ...request([]), temperature: kelvin(300) },
    ],
    [
      "incompatible HOAc constant",
      request([{
        soluteId: "HOAc",
        amount: mol(0.1),
        mode: "monoprotic-equilibrium",
        ka: thermodynamicConstant(DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc.value * 1.01),
      }]),
    ],
    [
      "ionic strength outside Davies domain",
      request([{ soluteId: "HCl", amount: mol(0.6), mode: "fully-dissociated" }]),
    ],
    [
      "total solute above model domain",
      request([{
        soluteId: "HOAc",
        amount: mol(0.6),
        mode: "monoprotic-equilibrium",
        ka: DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc,
      }]),
    ],
    [
      "total solute below model domain",
      request([{
        soluteId: "HOAc",
        amount: mol(1e-12),
        mode: "monoprotic-equilibrium",
        ka: DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc,
      }]),
    ],
  ] as const)("returns MODEL_OUT_OF_DOMAIN for %s", async (_name, input) => {
    const result = await createAcidBaseAdapter().solve(input);

    expect(result.status).toBe("MODEL_OUT_OF_DOMAIN");
    if (result.status !== "MODEL_OUT_OF_DOMAIN") throw new Error("wrong status");
    expect(result.nearestSupported.id).toBe(ACID_BASE_MODEL_ID);
    expect(result.nearestSupported.version).toBe(ACID_BASE_MODEL_VERSION);
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it.each([
    [
      "0.6 mol/kg weak acid",
      request([{
        soluteId: "HOAc",
        amount: mol(0.6),
        mode: "monoprotic-equilibrium",
        ka: DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc,
      }]),
    ],
    [
      "1e-12 mol/kg weak acid",
      request([{
        soluteId: "HOAc",
        amount: mol(1e-12),
        mode: "monoprotic-equilibrium",
        ka: DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc,
      }]),
    ],
  ] as const)("reports the total-solute domain reason for %s", async (_name, input) => {
    const result = await createAcidBaseAdapter().solve(input);

    expect(result.status).toBe("MODEL_OUT_OF_DOMAIN");
    if (result.status !== "MODEL_OUT_OF_DOMAIN") throw new Error("wrong status");
    expect(result.reason).toMatch(/total analytical solute/i);
  });

  it("returns INVALID_INPUT for malformed decoded data without throwing", async () => {
    const malformed = request([
      {
        soluteId: "HOAc",
        amount: mol(0.1),
        mode: "monoprotic-equilibrium",
      } as never,
    ]);

    const result = await createAcidBaseAdapter().solve(malformed);

    expect(result.status).toBe("INVALID_INPUT");
  });

  it("exposes one fixed identity and does not accept a constants override", () => {
    const adapter = createAcidBaseAdapter();

    expect(createAcidBaseAdapter.length).toBe(0);
    expect(adapter.id).toBe(ACID_BASE_MODEL_ID);
    expect(adapter.version).toBe(ACID_BASE_MODEL_VERSION);
    expect(adapter.solverConfig).toEqual(buildAcidBaseSolverConfig());
    expect(Object.isFrozen(adapter)).toBe(true);
    expect(Object.isFrozen(adapter.solverConfig.parameters)).toBe(true);
  });

  it("keeps the exported fixed scientific constants immutable", () => {
    expect(Object.isFrozen(DEFAULT_ACID_BASE_CONSTANTS.Kw)).toBe(true);
    expect(Object.isFrozen(DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc)).toBe(true);
    expect(Object.isFrozen(DEFAULT_ACID_BASE_CONSTANTS.standardMolality)).toBe(true);
    expect(Object.isFrozen(DEFAULT_ACID_BASE_CONSTANTS.neutralAcidActivityCoefficient)).toBe(true);
    expect(Object.isFrozen(DEFAULT_ACID_BASE_CONSTANTS.waterActivity)).toBe(true);
  });
});
