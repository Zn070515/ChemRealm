import { describe, expect, it } from "vitest";

import {
  COMMAND_SCHEMA_VERSION,
  SCENARIO_SCHEMA_VERSION,
  kelvin,
  kilogram,
  litre,
  mol,
  type ModelDescriptor,
} from "@chemrealm/schema";
import {
  ACID_BASE_COMPONENT_CATALOG,
  DEFAULT_ACID_BASE_CONSTANTS,
  SolverRegistry,
  createAcidBaseAdapter,
} from "@chemrealm/sci";
import {
  createWorldFromScenario,
} from "./world-creation.js";
import {
  emitCommand,
  reduce,
  type WorldState,
} from "@chemrealm/world";

const provenance = {
  source: "M4 acceptance fixture",
  reference: "controlled component-conservation fixture",
  category: "evaluated" as const,
};

const descriptor: ModelDescriptor = createAcidBaseAdapter().model;

function registry(): SolverRegistry {
  return new SolverRegistry([createAcidBaseAdapter()]);
}

function material(
  materialId: string,
  soluteId: string,
  molarMass: number,
  density: number,
) {
  return {
    materialId,
    label: `${soluteId} acceptance stock`,
    phase: "aqueous" as const,
    solutes: [{
      soluteId,
      basis: "molarity" as const,
      amountConcentration: { value: 0.02, unit: "mol/L" as const, provenance },
      molarMass: { value: molarMass, unit: "kg/mol" as const, provenance },
    }],
    density: { value: density, unit: "kg/L" as const, provenance },
  };
}

const scenario = {
  schemaVersion: SCENARIO_SCHEMA_VERSION,
  contentVersion: 1,
  scenarioRef: "m4-component-conservation",
  title: "M4 component conservation",
  materials: [
    material("hcl-stock", "HCl", 0.0364609, 1.002),
    material("naoh-stock", "NaOH", 0.0399971, 1.004),
    material("hoac-stock", "HOAc", 0.060052, 1.001),
    material("naoac-stock", "NaOAc", 0.0820343, 1.02),
  ],
  vessels: [
    {
      vesselId: "source",
      kind: "conicalFlask" as const,
      capacity: { value: 1, unit: "L" as const },
      geometryRef: "flask-1L",
      position: { unit: "mm" as const, x: 0, y: 0 },
      initialContents: [
        { materialId: "hcl-stock", volume: { value: 0.1, unit: "L" as const } },
        { materialId: "naoh-stock", volume: { value: 0.1, unit: "L" as const } },
        { materialId: "hoac-stock", volume: { value: 0.1, unit: "L" as const } },
        { materialId: "naoac-stock", volume: { value: 0.1, unit: "L" as const } },
      ],
    },
    {
      vesselId: "target",
      kind: "beaker" as const,
      capacity: { value: 1, unit: "L" as const },
      geometryRef: "beaker-1L",
      position: { unit: "mm" as const, x: 100, y: 0 },
      initialContents: [],
    },
  ],
  apparatus: [],
  indicators: [],
  modelRequirements: {
    temperature: { value: 298.15, unit: "K" as const },
    species: [...descriptor.validity.species],
    solvent: "water" as const,
    phase: "aqueous" as const,
    activityCorrected: true,
  },
};

type ConservedTotals = {
  strongAcidChloride: number;
  strongBaseSodium: number;
  acidFamily: number;
};

function conservedTotals(state: WorldState): ConservedTotals {
  const totals: ConservedTotals = {
    strongAcidChloride: 0,
    strongBaseSodium: 0,
    acidFamily: 0,
  };
  for (const contents of Object.values(state.canonical.byVessel)) {
    for (const component of contents.componentAmounts) {
      const entry = ACID_BASE_COMPONENT_CATALOG.get(component.componentId as never);
      if (entry === undefined) throw new Error(`unexpected component ${component.componentId}`);
      for (const contribution of entry.contributes) {
        if (contribution === "strongAcidChloride") totals.strongAcidChloride += component.amount;
        if (contribution === "strongBaseSodium") totals.strongBaseSodium += component.amount;
        if (contribution === "acidFamily") totals.acidFamily += component.amount;
      }
    }
  }
  return totals;
}

function relativeError(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.max(Math.abs(expected), Number.EPSILON);
}

describe("M4 world/science acceptance evidence", () => {
  it("conserves model-declared Na, Cl, and acid-family totals over 100 transfers", async () => {
    const created = createWorldFromScenario(registry(), {
      worldId: "m4-conservation-world",
      scenario,
      seed: null,
    });
    expect(created.accepted).toBe(true);
    if (!created.accepted) throw new Error(created.reason);

    const initial = conservedTotals(created.state);
    let state = created.state;
    for (let index = 0; index < 100; index += 1) {
      const emission = emitCommand(state, {
        schemaVersion: COMMAND_SCHEMA_VERSION,
        type: "DeliverTitrant",
        fromVesselId: "source",
        toVesselId: "target",
        volume: { value: 0.003, unit: "L" },
      });
      expect(emission.accepted).toBe(true);
      if (!emission.accepted) throw new Error(emission.detail);
      state = reduce(state, emission.event);
    }

    const final = conservedTotals(state);
    expect(relativeError(final.strongAcidChloride, initial.strongAcidChloride)).toBeLessThanOrEqual(1e-13);
    expect(relativeError(final.strongBaseSodium, initial.strongBaseSodium)).toBeLessThanOrEqual(1e-13);
    expect(relativeError(final.acidFamily, initial.acidFamily)).toBeLessThanOrEqual(1e-13);
    expect(Object.values(state.canonical.byVessel).flatMap((contents) => contents.componentAmounts)
      .every((component) => component.amount >= 0)).toBe(true);

    const target = state.canonical.byVessel.target!;
    const result = await createAcidBaseAdapter().solve({
      waterMass: kilogram(target.waterMass),
      liquidVolume: litre(target.liquidVolume),
      temperature: kelvin(298.15),
      solutes: target.componentAmounts.map((component) => ({
        soluteId: component.componentId,
        amount: mol(component.amount),
        ...(component.componentId === "HOAc"
          ? { mode: "monoprotic-equilibrium" as const, ka: DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc }
          : { mode: "fully-dissociated" as const }),
      })),
      indicators: [],
    });
    expect(result.status).toBe("OK");
  });

  it("checks the v0 scenario sweep maximum against the proposed envelope", async () => {
    const adapter = createAcidBaseAdapter();
    const stockCases = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((factor) => ({
      waterMass: (1.002 - 0.1 * 0.0364609) + factor * (1.004 - 0.1 * 0.0399971),
      hcl: 0.1,
      naoh: 0.1 * factor,
      factor,
    }));
    const ionicStrengths: number[] = [];
    for (const stock of stockCases) {
      const result = await adapter.solve({
        waterMass: kilogram(stock.waterMass),
        liquidVolume: litre(1 + stock.factor),
        temperature: kelvin(298.15),
        solutes: [
          { soluteId: "HCl", amount: mol(stock.hcl), mode: "fully-dissociated" },
          ...(stock.naoh === 0
            ? []
            : [{ soluteId: "NaOH", amount: mol(stock.naoh), mode: "fully-dissociated" as const }]),
        ],
        indicators: [],
      });
      expect(result.status).toBe("OK");
      if (result.status !== "OK") throw new Error(result.status);
      ionicStrengths.push(result.state.ionicStrengthMolal.value);
      expect(result.state.validity.withinProposedAccuracyEnvelope).toBe(true);
    }

    const maximum = Math.max(...ionicStrengths);
    expect(maximum).toBeLessThanOrEqual(0.12);
    expect(maximum).toBeCloseTo(0.1002, 3);
  });
});
