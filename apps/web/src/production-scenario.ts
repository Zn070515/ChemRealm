import {
  SCENARIO_SCHEMA_VERSION,
  type Scenario,
} from "@chemrealm/schema";

const hclConcentrationProvenance = {
  source: "VWR Tightrant hydrochloric acid 0.100 N product record",
  reference: "https://www.vwr.com/us/en/product/4547084/tightrant-hydrochloric-acid-0100-normal-n10-tested-in-an-iso-17025-accredited-facility",
  category: "evaluated" as const,
  temperature: { value: 298.15, unit: "K" as const },
};

const naohConcentrationProvenance = {
  source: "VWR sodium hydroxide 0.100 N product record",
  reference: "https://us-prod2.vwr.com/store/catalog/product.jsp?catalog_number=RC735032&originalCatNum=RC640032",
  category: "evaluated" as const,
  temperature: { value: 298.15, unit: "K" as const },
};

const hclDensityProvenance = {
  source: "VWR Tightrant hydrochloric acid 0.100 N product record",
  reference: "https://www.vwr.com/us/en/product/4547084/tightrant-hydrochloric-acid-0100-normal-n10-tested-in-an-iso-17025-accredited-facility",
  category: "evaluated" as const,
  uncertainty: "Product-record density 1.004 g/cm³ at 25 °C; not a universal solution-density law",
  temperature: { value: 298.15, unit: "K" as const },
};

const naohDensityProvenance = {
  source: "VWR sodium hydroxide 0.100 N product record",
  reference: "https://us-prod2.vwr.com/store/catalog/product.jsp?catalog_number=RC735032&originalCatNum=RC640032",
  category: "evaluated" as const,
  uncertainty: "The product record reports 1 g/cm³ at 25 °C without decimal-place precision",
  temperature: { value: 298.15, unit: "K" as const },
};

const hclMolarMassProvenance = {
  source: "IUPAC Commission on Isotopic Abundances and Atomic Weights",
  reference: "https://iupac.qmul.ac.uk/AtWt/AtWt21.html",
  edition: "2021",
  category: "calculated" as const,
  uncertainty: "Formula sum from cited standard atomic weights; frozen to 0.0364609 kg/mol for this fixture",
};

const naohMolarMassProvenance = {
  source: "IUPAC Commission on Isotopic Abundances and Atomic Weights",
  reference: "https://iupac.qmul.ac.uk/AtWt/AtWt21.html",
  edition: "2021",
  category: "calculated" as const,
  uncertainty: "Formula sum from cited standard atomic weights; frozen to 0.0399971 kg/mol for this fixture",
};

const profileProvenance = {
  source: "ChemRealm deterministic M5 representation fixture",
  reference: "docs/superpowers/specs/2026-09-13-m5-production-composition.md#profile",
  category: "pedagogicalApproximation" as const,
};

const indicatorProvenance = {
  source: "ChemRealm v0 indicator input record",
  reference: "docs/research/constants-provenance.json#phenolphthalein",
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
    provenance: profileProvenance,
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
        amountConcentration: { value: 0.1, unit: "mol/L", provenance: hclConcentrationProvenance },
        molarMass: { value: 0.0364609, unit: "kg/mol", provenance: hclMolarMassProvenance },
      }],
      density: { value: 1.004, unit: "kg/L", provenance: hclDensityProvenance },
    },
    {
      materialId: "production-naoh-0.1",
      label: "0.100 mol/L sodium hydroxide",
      phase: "aqueous",
      solutes: [{
        soluteId: "NaOH",
        basis: "molarity",
        amountConcentration: { value: 0.1, unit: "mol/L", provenance: naohConcentrationProvenance },
        molarMass: { value: 0.0399971, unit: "kg/mol", provenance: naohMolarMassProvenance },
      }],
      density: { value: 1, unit: "kg/L", provenance: naohDensityProvenance },
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
      provenance: indicatorProvenance,
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

const probeProvenance = {
  source: "ChemRealm deterministic M5 accuracy-envelope probe fixture",
  reference: "docs/superpowers/specs/2026-09-13-m5-production-composition.md#accuracy-envelope-probe",
  category: "pedagogicalApproximation" as const,
};

const productionHclMaterial = productionTitrationScenario.materials[0]!;
const productionHclSolute = productionHclMaterial.solutes[0]!;
if (productionHclSolute.basis !== "molarity") {
  throw new Error("production scenario HCl fixture must use molarity authoring");
}

const probeHclMaterial = {
  ...productionHclMaterial,
  materialId: "accuracy-probe-hcl-0.3",
  label: "0.300 mol/L hydrochloric acid accuracy-envelope probe",
  solutes: [{
    ...productionHclSolute,
    amountConcentration: {
      ...productionHclSolute.amountConcentration,
      value: 0.3,
      provenance: probeProvenance,
    },
  }],
};

/** Valid model-domain fixture deliberately outside the proposed accuracy envelope. */
export const accuracyEnvelopeProbeScenario: Scenario = {
  ...productionTitrationScenario,
  scenarioRef: "m5-accuracy-envelope-probe",
  title: "M5 accuracy-envelope qualification probe",
  description: "Deterministic valid-domain fixture whose scientific result is outside the proposed v0 accuracy envelope.",
  materials: [probeHclMaterial, ...productionTitrationScenario.materials.slice(1)],
  vessels: productionTitrationScenario.vessels.map((vessel) =>
    vessel.vesselId === "titration-flask"
      ? {
          ...vessel,
          initialContents: vessel.initialContents.map((contents) =>
            contents.materialId === productionHclMaterial.materialId
              ? { ...contents, materialId: probeHclMaterial.materialId }
              : contents,
          ),
        }
      : vessel,
  ),
};
