import { describe, expect, it } from "vitest";

import {
  createInitialState,
  parseWorldState,
  scenarioSnapshotHash,
  serializeWorldState,
  stateHash,
  type SerializedWorldCreated,
} from "./state.js";

const WORLD_CREATED: SerializedWorldCreated = {
  seq: 0,
  schemaVersion: 1,
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
            waterMass: { value: 0.998, unit: "kg" },
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
      ],
      apparatusDefaults: [],
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

describe("WorldState domain boundary", () => {
  it("canonicalizes a serialized genesis event into typed independent state", () => {
    const state = createInitialState(WORLD_CREATED);

    expect(state.worldId).toBe("w-1");
    expect(state.sequence).toBe(0);
    expect(state.canonical.byVessel.flask).toEqual({
      waterMass: 0,
      liquidVolume: 0,
      componentAmounts: [],
    });
    expect(state.vessels[0]?.capacity).toBe(0.25);
  });

  it("round-trips typed state through the serialized WorldState contract", () => {
    const state = createInitialState(WORLD_CREATED);
    const serialized = serializeWorldState(state);
    const reparsed = parseWorldState(serialized);

    expect(serializeWorldState(reparsed)).toEqual(serialized);
  });

  it("excludes the present sequence cursor from replay state identity", () => {
    const serialized = serializeWorldState(createInitialState(WORLD_CREATED));
    const later = { ...serialized, sequence: 99 };

    expect(stateHash(parseWorldState(later))).toBe(
      stateHash(parseWorldState(serialized)),
    );
  });

  it("rejects a genesis snapshot whose content checksum is stale", () => {
    const stale = {
      ...WORLD_CREATED,
      payload: { ...WORLD_CREATED.payload, contentHash: "sha256:stale" },
    };
    expect(() => createInitialState(stale)).toThrow(/CONTENT_HASH_MISMATCH/);
  });

  it("deep-freezes the complete state graph", () => {
    const state = createInitialState(WORLD_CREATED);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.scenarioSnapshot)).toBe(true);
    expect(Object.isFrozen(state.canonical.byVessel.flask)).toBe(true);
  });

  it("canonicalizes component-key ordering before hashing", () => {
    const serialized = serializeWorldState(createInitialState(WORLD_CREATED));
    const withComponents = {
      ...serialized,
      canonical: {
        byVessel: {
          ...serialized.canonical.byVessel,
          flask: {
            ...serialized.canonical.byVessel.flask,
            componentAmounts: [
              { componentId: "Na+", amount: { value: 1, unit: "mol" as const } },
              { componentId: "H+", amount: { value: 2, unit: "mol" as const } },
            ],
          },
        },
      },
    };
    const reversed = {
      ...withComponents,
      canonical: {
        ...withComponents.canonical,
        byVessel: {
          ...withComponents.canonical.byVessel,
          flask: {
            ...withComponents.canonical.byVessel.flask,
            componentAmounts: [...withComponents.canonical.byVessel.flask.componentAmounts].reverse(),
          },
        },
      },
    };
    expect(stateHash(parseWorldState(withComponents))).toBe(stateHash(parseWorldState(reversed)));
  });

  it("rejects duplicate structure and missing canonical vessel contents", () => {
    const state = serializeWorldState(createInitialState(WORLD_CREATED));
    const duplicateSnapshot = {
      ...WORLD_CREATED.payload.scenarioSnapshot,
      vessels: [
        ...WORLD_CREATED.payload.scenarioSnapshot.vessels,
        WORLD_CREATED.payload.scenarioSnapshot.vessels[0]!,
      ],
    };
    expect(() => createInitialState({
      ...WORLD_CREATED,
      payload: {
        ...WORLD_CREATED.payload,
        scenarioSnapshot: duplicateSnapshot,
        contentHash: scenarioSnapshotHash(duplicateSnapshot),
      },
    })).toThrow(/DUPLICATE_ID/);
    expect(() => parseWorldState({
      ...state,
      canonical: { byVessel: {} },
    })).toThrow(/STATE_SHAPE_MISMATCH/);
  });
});
