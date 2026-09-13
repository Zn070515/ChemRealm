import type { SerializedWorldCreated } from "../src/state.js";
import { scenarioSnapshotHash } from "../src/state.js";

export const WORLD_CREATED: SerializedWorldCreated = {
  seq: 0,
  schemaVersion: 3,
  type: "WorldCreated",
  payload: {
    worldId: "w-1",
    scenarioSnapshot: {
      scenarioRef: "hcl-naoh",
      materials: [
        {
          materialId: "hcl-0.1",
          sourceDefinition: "0.1000 mol/L HCl",
          density: {
            value: 1.002,
            unit: "kg/L",
            provenance: {
              source: "CRC Handbook",
              reference: "aqueous HCl density table",
              category: "evaluated",
            },
          },
          composition: [
            {
              soluteId: "HCl",
              amountConcentration: { value: 0.1, unit: "mol/L" },
              provenance: {
                source: "Scenario record",
                reference: "hcl-0.1 composition label",
                category: "evaluated",
              },
            },
          ],
          molarMasses: [
            {
              soluteId: "HCl",
              molarMass: { value: 0.0364609, unit: "kg/mol" },
              provenance: {
                source: "IUPAC standard atomic weights",
                reference: "HCl molar mass calculation",
                category: "calculated",
              },
            },
          ],
          resolvedInventoryPerLitre: {
            waterMass: { value: 0.99835391, unit: "kg" },
            soluteAmounts: [{ soluteId: "HCl", amount: { value: 0.1, unit: "mol" } }],
          },
        },
      ],
      vessels: [
        {
          vesselId: "flask",
          kind: "conicalFlask",
          capacity: { value: 0.25, unit: "L" },
          geometryRef: "flask-250",
          position: { unit: "mm", x: 0, y: 0 },
        },
        {
          vesselId: "burette",
          kind: "burette",
          capacity: { value: 0.05, unit: "L" },
          geometryRef: "burette-50",
          position: { unit: "mm", x: 100, y: 0 },
        },
      ],
      apparatusDefaults: [],
      indicators: [
        {
          indicatorId: "phenolphthalein",
          kaIn: { value: 3.98e-10, unit: "1" },
          provenance: {
            source: "M4 provisional fixture",
            reference: "indicator contract test vector",
            category: "pedagogicalApproximation",
          },
        },
      ],
      modelRequirements: {
        temperature: { value: 298.15, unit: "K" },
        species: ["H2O", "H+", "OH-", "Cl-", "Na+"],
        solvent: "water",
        phase: "aqueous",
        activityCorrected: true,
      },
    },
    contentHash: "sha256:fixture",
    solverConfig: {
      id: "acidbase-monoprotic-davies",
      version: "1.0.0",
      parameters: { Kw: 1e-14 },
    },
    seed: null,
  },
};

WORLD_CREATED.payload.contentHash = scenarioSnapshotHash(WORLD_CREATED.payload.scenarioSnapshot);

/** A valid high-precision fixture used to exercise canonical-state boundaries. */
export function highPrecisionWorldCreated(): SerializedWorldCreated {
  const event = JSON.parse(JSON.stringify(WORLD_CREATED)) as SerializedWorldCreated;
  const snapshot = event.payload.scenarioSnapshot;
  const material = snapshot.materials[0]!;
  const amountPerLitre = 0.4938271560504;
  const waterMassPerLitre = 0.7999999999996;
  const molarMass = material.molarMasses[0]!.molarMass.value;

  snapshot.vessels[1]!.capacity = { value: 0.5, unit: "L" };
  material.composition[0]!.amountConcentration = { value: amountPerLitre, unit: "mol/L" };
  material.resolvedInventoryPerLitre.waterMass = { value: waterMassPerLitre, unit: "kg" };
  material.resolvedInventoryPerLitre.soluteAmounts[0]!.amount = {
    value: amountPerLitre,
    unit: "mol",
  };
  material.density.value = waterMassPerLitre + amountPerLitre * molarMass;
  event.payload.contentHash = scenarioSnapshotHash(snapshot);
  return event;
}
