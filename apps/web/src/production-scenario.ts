import {
  SCENARIO_SCHEMA_VERSION,
  type Scenario,
} from "@chemrealm/schema";

const provenance = {
  source: "ChemRealm v0 production composition fixture",
  reference: "Deterministic M5 browser composition fixture; not a scientific reference value",
  category: "evaluated" as const,
};

function profile(profileId: string, maxVolume: number, maxHeight: number) {
  return {
    profileId,
    profileVersion: "1.0.0",
    representation: "piecewise-linear" as const,
    maxVolume: { value: maxVolume, unit: "L" as const },
    maxHeight: { value: maxHeight, unit: "mm" as const },
    roundTripTolerance: { value: 1e-12, unit: "L" as const },
    knots: [
      {
        volume: { value: 0, unit: "L" as const },
        height: { value: 0, unit: "mm" as const },
      },
      {
        volume: { value: maxVolume, unit: "L" as const },
        height: { value: maxHeight, unit: "mm" as const },
      },
    ],
    provenance,
  };
}

/**
 * The smallest real authored scenario that exercises the M5 production path:
 * a committed acid solution, a committed burette stock, an indicator, and a
 * replayable target profile. It contains no chemistry implementation.
 */
export const productionTitrationScenario: Scenario = {
  schemaVersion: SCENARIO_SCHEMA_VERSION,
  contentVersion: 1,
  scenarioRef: "m5-production-titration",
  title: "M5 production titration composition",
  description: "Deterministic local composition fixture for the scientific inspection surface.",
  materials: [
    {
      materialId: "production-hcl-0.1",
      label: "0.100 mol/L hydrochloric acid",
      phase: "aqueous",
      solutes: [{
        soluteId: "HCl",
        basis: "molarity",
        amountConcentration: { value: 0.1, unit: "mol/L", provenance },
        molarMass: { value: 0.0364609, unit: "kg/mol", provenance },
      }],
      density: { value: 1.004, unit: "kg/L", provenance },
    },
    {
      materialId: "production-naoh-0.1",
      label: "0.100 mol/L sodium hydroxide",
      phase: "aqueous",
      solutes: [{
        soluteId: "NaOH",
        basis: "molarity",
        amountConcentration: { value: 0.1, unit: "mol/L", provenance },
        molarMass: { value: 0.0399971, unit: "kg/mol", provenance },
      }],
      density: { value: 1, unit: "kg/L", provenance },
    },
  ],
  vessels: [
    {
      vesselId: "titrant-burette",
      kind: "burette",
      capacity: { value: 0.1, unit: "L" },
      geometryRef: "m5-burette-100ml",
      volumeProfile: profile("m5-burette-100ml-profile", 0.1, 150),
      position: { unit: "mm", x: 20, y: 0 },
      initialContents: [{
        materialId: "production-naoh-0.1",
        volume: { value: 0.1, unit: "L" },
      }],
    },
    {
      vesselId: "titration-flask",
      kind: "conicalFlask",
      capacity: { value: 0.25, unit: "L" },
      geometryRef: "m5-conical-flask-250ml",
      volumeProfile: profile("m5-conical-flask-250ml-profile", 0.25, 100),
      position: { unit: "mm", x: 120, y: 100 },
      initialContents: [{
        materialId: "production-hcl-0.1",
        volume: { value: 0.025, unit: "L" },
      }],
    },
  ],
  apparatus: [],
  indicators: [{
    indicatorId: "phenolphthalein",
    kaIn: {
      value: 3.98e-10,
      unit: "1",
      provenance: {
        source: "ChemRealm v0 indicator fixture",
        reference: "docs/research/constants-provenance.json phenolphthalein record",
        category: "evaluated",
      },
    },
  }],
  modelRequirements: {
    temperature: { value: 298.15, unit: "K" },
    species: ["H2O", "H+", "OH-", "HOAc", "OAc-", "Na+", "Cl-"],
    solvent: "water",
    phase: "aqueous",
    activityCorrected: true,
  },
  representation: { defaultViews: ["macro", "micro", "symbolic"] },
  learningGoals: ["Compare taught concentration-based pH with the activity model."],
};
