import type { SerializedWorldCreated } from "../src/state.js";
import { scenarioSnapshotHash, volumeProfileHash } from "../src/state.js";
import { hashCanonical } from "../src/hash.js";

function volumeProfile(
  profileId: string,
  maxVolume: number,
  maxHeight: number,
): {
  profileId: string;
  profileVersion: string;
  profileHash: string;
  representation: "piecewise-linear";
  maxVolume: { value: number; unit: "L" };
  maxHeight: { value: number; unit: "mm" };
  roundTripTolerance: { value: number; unit: "L" };
  knots: { volume: { value: number; unit: "L" }; height: { value: number; unit: "mm" } }[];
  provenance: { source: string; reference: string; category: "evaluated" };
} {
  const payload = {
    profileId,
    profileVersion: "1.0.0",
    representation: "piecewise-linear" as const,
    maxVolume: { value: maxVolume, unit: "L" as const },
    maxHeight: { value: maxHeight, unit: "mm" as const },
    roundTripTolerance: { value: 1e-12, unit: "L" as const },
    knots: [
      { volume: { value: 0, unit: "L" as const }, height: { value: 0, unit: "mm" as const } },
      { volume: { value: maxVolume, unit: "L" as const }, height: { value: maxHeight, unit: "mm" as const } },
    ],
    provenance: {
      source: "World runtime fixture",
      reference: `${profileId} piecewise-linear profile`,
      category: "evaluated" as const,
    },
  };
  return { ...payload, profileHash: `sha256:${hashCanonical(payload)}` };
}

export const WORLD_CREATED: SerializedWorldCreated = {
  seq: 0,
  schemaVersion: 4,
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
          volumeProfile: volumeProfile("flask-250", 0.25, 100),
          position: { unit: "mm", x: 0, y: 0 },
        },
        {
          vesselId: "burette",
          kind: "burette",
          capacity: { value: 0.05, unit: "L" },
          geometryRef: "burette-50",
          volumeProfile: volumeProfile("burette-50", 0.05, 500),
          position: { unit: "mm", x: 100, y: 0 },
        },
      ],
      apparatusDefaults: [],
      indicators: [
        {
          indicatorId: "phenolphthalein",
          kaIn: { value: 3.98e-10, unit: "1" },
          provenance: {
            source: "Takayanagi & Motomizu, Chemistry Letters 30(1), 2001",
            reference: "phenolphthalein second transition, reported pKa=9.40; v0 monoprotic proxy",
            uncertainty: "±0.005 pKa from half the last reported decimal place; approximation is not a claim about the higher transition",
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
  snapshot.vessels[1]!.volumeProfile.maxVolume = { value: 0.5, unit: "L" };
  snapshot.vessels[1]!.volumeProfile.knots[1]!.volume = { value: 0.5, unit: "L" };
  snapshot.vessels[1]!.volumeProfile.profileHash = volumeProfileHash(
    snapshot.vessels[1]!.volumeProfile,
  );
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
