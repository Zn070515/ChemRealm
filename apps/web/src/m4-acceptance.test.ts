import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  COMMAND_SCHEMA_VERSION,
  SCENARIO_CONTENT_VERSION,
  SCENARIO_SCHEMA_VERSION,
  VOLUME_PROFILE_VERSION,
  kelvin,
  kilogram,
  litre,
  mol,
  type ModelDescriptor,
  type SolveRequest,
} from "@chemrealm/schema";
import {
  ACID_BASE_COMPONENT_CATALOG,
  DEFAULT_ACID_BASE_CONSTANTS,
  ACID_BASE_MODEL_ID,
  ACID_BASE_MODEL_VERSION,
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

type V0Provenance = {
  readonly source: string;
  readonly reference: string;
  readonly category: "measured" | "evaluated" | "calculated" | "empirical" | "pedagogicalApproximation";
  readonly uncertainty?: string;
  readonly temperature?: { readonly value: number; readonly unit: "K" };
  readonly pressure?: { readonly value: number; readonly unit: "kPa" };
  readonly lastVerified?: string;
};

type V0Stock = {
  readonly stockId: string;
  readonly materialId: string;
  readonly soluteId: "HCl" | "NaOH" | "HOAc" | "NaOAc";
  readonly concentrationMolPerL: number;
  readonly densityKgPerL: number;
  readonly molarMassKgPerMol: number;
  readonly concentrationProvenance: V0Provenance;
  readonly densityProvenance: V0Provenance;
  readonly molarMassProvenance: V0Provenance;
};

type V0Manifest = {
  readonly schemaVersion: 2;
  readonly id: string;
  readonly temperatureK: number;
  readonly proposedEnvelopeIonicStrengthMolal: number;
  readonly equivalentFactors: readonly number[];
  readonly stocks: readonly V0Stock[];
  readonly families: readonly {
    readonly familyId: string;
    readonly acidStockId: string;
    readonly baseStockId: string;
    readonly acidMode: "fully-dissociated" | "monoprotic-equilibrium";
    readonly baseMode: "fully-dissociated" | "monoprotic-equilibrium";
  }[];
};

type V0EnvelopeReference = {
  readonly schemaVersion: 1;
  readonly id: "v0-acid-base-titration-envelope-reference";
  readonly inputManifestSha256: string;
  readonly expectedMaximum: {
    readonly ionicStrengthMolal: number;
    readonly familyId: string;
    readonly equivalentFactor: number;
    readonly absoluteTolerance: number;
  };
};

const v0InputText = readFileSync(
  new URL("../../../docs/research/v0-scientific-inputs.json", import.meta.url),
  "utf8",
);
const v0Inputs = JSON.parse(v0InputText) as V0Manifest;
const v0EnvelopeReference = JSON.parse(readFileSync(
  new URL("../../../docs/research/v0-envelope-reference.json", import.meta.url),
  "utf8",
)) as V0EnvelopeReference;

const stockById = new Map(v0Inputs.stocks.map((stock) => [stock.stockId, stock]));
function stock(stockId: string): V0Stock {
  const value = stockById.get(stockId);
  if (value === undefined) throw new Error(`missing v0 stock ${stockId}`);
  return value;
}

function volumeProfile(profileId: string, maxVolume: number, maxHeight: number) {
  return {
    profileId,
    profileVersion: VOLUME_PROFILE_VERSION,
    representation: "piecewise-linear" as const,
    maxVolume: { value: maxVolume, unit: "L" as const },
    maxHeight: { value: maxHeight, unit: "mm" as const },
    roundTripTolerance: { value: 1e-12, unit: "L" as const },
    knots: [
      { volume: { value: 0, unit: "L" as const }, height: { value: 0, unit: "mm" as const } },
      { volume: { value: maxVolume, unit: "L" as const }, height: { value: maxHeight, unit: "mm" as const } },
    ],
    provenance: { source: "M4 fixture", reference: `${profileId} profile`, category: "evaluated" as const },
  };
}

function solveSolute(
  source: V0Stock,
  amount: number,
  mode: V0Manifest["families"][number]["acidMode"],
): SolveRequest["solutes"][number] {
  if (mode === "monoprotic-equilibrium") {
    return {
      soluteId: source.soluteId,
      amount: mol(amount),
      mode,
      ka: DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc,
    };
  }
  return {
    soluteId: source.soluteId,
    amount: mol(amount),
    mode,
  };
}

const descriptor: ModelDescriptor = createAcidBaseAdapter().model;

function registry(): SolverRegistry {
  return new SolverRegistry([createAcidBaseAdapter()]);
}

function material(stockId: string) {
  const source = stock(stockId);
  return {
    materialId: source.materialId,
    label: `${source.soluteId} acceptance stock`,
    phase: "aqueous" as const,
    solutes: [{
      soluteId: source.soluteId,
      basis: "molarity" as const,
      amountConcentration: {
        value: source.concentrationMolPerL,
        unit: "mol/L" as const,
        provenance: source.concentrationProvenance,
      },
      molarMass: {
        value: source.molarMassKgPerMol,
        unit: "kg/mol" as const,
        provenance: source.molarMassProvenance,
      },
    }],
    density: {
      value: source.densityKgPerL,
      unit: "kg/L" as const,
      provenance: source.densityProvenance,
    },
  };
}

const scenario = {
  schemaVersion: SCENARIO_SCHEMA_VERSION,
  contentVersion: SCENARIO_CONTENT_VERSION,
  scenarioRef: "m4-component-conservation",
  title: "M4 component conservation",
  materials: v0Inputs.stocks.map((source) => material(source.stockId)),
  vessels: [
    {
      vesselId: "source",
      kind: "conicalFlask" as const,
      capacity: { value: 1, unit: "L" as const },
      geometryRef: "flask-1L",
      volumeProfile: volumeProfile("flask-1L", 1, 100),
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
      volumeProfile: volumeProfile("beaker-1L", 1, 100),
      position: { unit: "mm" as const, x: 100, y: 0 },
      initialContents: [],
    },
  ],
  apparatus: [],
  indicators: [],
  modelRequirements: {
    temperature: { value: v0Inputs.temperatureK, unit: "K" as const },
    species: [...descriptor.validity.species],
    solvent: "water" as const,
    phase: "aqueous" as const,
    activityCorrected: true,
  },
};

function scenarioForEnvelopePoint(
  family: V0Manifest["families"][number],
  factor: number,
) {
  const acid = stock(family.acidStockId);
  const base = stock(family.baseStockId);
  return {
    schemaVersion: SCENARIO_SCHEMA_VERSION,
  contentVersion: SCENARIO_CONTENT_VERSION,
    scenarioRef: `m4-envelope-${family.familyId}-${factor}`,
    title: `M4 envelope ${family.familyId} at ${factor} equivalents`,
    materials: factor === 0
      ? [material(acid.stockId)]
      : [material(acid.stockId), material(base.stockId)],
    vessels: [{
      vesselId: "flask",
      kind: "conicalFlask" as const,
      capacity: { value: 3, unit: "L" as const },
      geometryRef: "flask-3L",
      volumeProfile: volumeProfile("flask-3L", 3, 120),
      position: { unit: "mm" as const, x: 0, y: 0 },
      initialContents: [
        { materialId: acid.materialId, volume: { value: 1, unit: "L" as const } },
        ...(factor === 0 ? [] : [{
          materialId: base.materialId,
          volume: { value: factor, unit: "L" as const },
        }]),
      ],
    }],
    apparatus: [],
    indicators: [],
    modelRequirements: {
      temperature: { value: v0Inputs.temperatureK, unit: "K" as const },
      species: [...descriptor.validity.species],
      solvent: "water" as const,
      phase: "aqueous" as const,
      activityCorrected: true,
    },
  };
}

function requestFromEnvelopeWorld(
  state: WorldState,
  family: V0Manifest["families"][number],
): SolveRequest {
  const contents = state.canonical.byVessel.flask;
  if (contents === undefined) throw new Error("missing envelope flask");
  const acid = stock(family.acidStockId);
  const base = stock(family.baseStockId);
  return {
    waterMass: kilogram(contents.waterMass),
    liquidVolume: litre(contents.liquidVolume),
    temperature: kelvin(v0Inputs.temperatureK),
    solutes: contents.componentAmounts.map((component) => {
      if (component.componentId === acid.soluteId) {
        return solveSolute(acid, component.amount, family.acidMode);
      }
      if (component.componentId === base.soluteId) {
        return solveSolute(base, component.amount, family.baseMode);
      }
      throw new Error(`unexpected envelope component ${component.componentId}`);
    }),
    indicators: [],
  };
}

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
  it("uses the complete v0 family and equivalent-factor contract", () => {
    expect(v0Inputs.equivalentFactors).toEqual([0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]);
    expect(v0Inputs.families.map((family) => family.familyId).sort()).toEqual([
      "strong-acid-strong-base",
      "weak-acid-strong-base",
    ]);
    expect(v0EnvelopeReference.inputManifestSha256).toBe(
      createHash("sha256").update(v0InputText).digest("hex"),
    );
  });

  it("conserves model-declared Na, Cl, and acid-family totals over 100 transfers", async () => {
    const created = createWorldFromScenario(registry(), {
      worldId: "m4-conservation-world",
      scenario,
      seed: null,
      solverSelection: { id: ACID_BASE_MODEL_ID, version: ACID_BASE_MODEL_VERSION },
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
      temperature: kelvin(v0Inputs.temperatureK),
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

  it("checks the complete v0 scenario-to-world-to-solver sweep against the proposed envelope", async () => {
    const adapter = createAcidBaseAdapter();
    const measurements: Array<{
      readonly familyId: string;
      readonly factor: number;
      readonly ionicStrengthMolal: number;
    }> = [];
    for (const family of v0Inputs.families) {
      for (const factor of v0Inputs.equivalentFactors) {
        const created = createWorldFromScenario(registry(), {
          worldId: `m4-envelope-world-${family.familyId}-${factor}`,
          scenario: scenarioForEnvelopePoint(family, factor),
          seed: null,
          solverSelection: { id: ACID_BASE_MODEL_ID, version: ACID_BASE_MODEL_VERSION },
        });
        expect(created.accepted).toBe(true);
        if (!created.accepted) throw new Error(created.reason);
        const result = await adapter.solve(requestFromEnvelopeWorld(created.state, family));
        expect(result.status).toBe("OK");
        if (result.status !== "OK") throw new Error(result.status);
        const ionicStrengthMolal = result.state.ionicStrengthMolal.value;
        measurements.push({ familyId: family.familyId, factor, ionicStrengthMolal });
        expect(result.state.validity.withinProposedAccuracyEnvelope).toBe(true);
      }
    }

    expect(measurements).toHaveLength(v0Inputs.families.length * v0Inputs.equivalentFactors.length);
    for (const family of v0Inputs.families) {
      expect(measurements.filter((measurement) => measurement.familyId === family.familyId))
        .toHaveLength(v0Inputs.equivalentFactors.length);
    }
    const maximumMeasurement = measurements.reduce((maximum, measurement) =>
      measurement.ionicStrengthMolal > maximum.ionicStrengthMolal ? measurement : maximum,
    );
    expect(maximumMeasurement.ionicStrengthMolal)
      .toBeLessThanOrEqual(v0Inputs.proposedEnvelopeIonicStrengthMolal);
    expect(Math.abs(
      maximumMeasurement.ionicStrengthMolal - v0EnvelopeReference.expectedMaximum.ionicStrengthMolal,
    )).toBeLessThanOrEqual(v0EnvelopeReference.expectedMaximum.absoluteTolerance);
    expect(maximumMeasurement.familyId).toBe(v0EnvelopeReference.expectedMaximum.familyId);
    expect(maximumMeasurement.factor).toBe(v0EnvelopeReference.expectedMaximum.equivalentFactor);
  });
});
