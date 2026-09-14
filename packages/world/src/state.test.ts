import { describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  TEST_SOLVER_VERSION,
  VOLUME_PROFILE_VERSION,
} from "@chemrealm/schema";

import {
  createInitialState,
  migrateWorldCreated,
  parseWorldState,
  parseWorldStateForSnapshot,
  scenarioSnapshotHash,
  serializeWorldState,
  stateHash,
  volumeProfileHash,
  type SerializedWorldCreated,
} from "./state.js";
import { createLog } from "./log.js";
import { replay } from "./replay.js";
import { quantize } from "./hash.js";

const WORLD_CREATED: SerializedWorldCreated = {
  seq: 0,
  schemaVersion: CURRENT_SCHEMA_VERSION,
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
          volumeProfile: {
            profileId: "flask-250",
            profileVersion: VOLUME_PROFILE_VERSION,
            profileHash: "sha256:placeholder",
            representation: "piecewise-linear",
            maxVolume: { value: 0.25, unit: "L" },
            maxHeight: { value: 100, unit: "mm" },
            roundTripTolerance: { value: 1e-12, unit: "L" },
            knots: [
              { volume: { value: 0, unit: "L" }, height: { value: 0, unit: "mm" } },
              { volume: { value: 0.25, unit: "L" }, height: { value: 100, unit: "mm" } },
            ],
            provenance: { source: "fixture", reference: "flask profile", category: "evaluated" },
          },
          position: { unit: "mm", x: 0, y: 0 },
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
      version: TEST_SOLVER_VERSION,
      parameters: { Kw: 1e-14 },
    },
    seed: null,
  },
};

const profile = WORLD_CREATED.payload.scenarioSnapshot.vessels[0]!.volumeProfile;
profile.profileHash = volumeProfileHash(profile);

WORLD_CREATED.payload.contentHash = scenarioSnapshotHash(WORLD_CREATED.payload.scenarioSnapshot);

describe("WorldState domain boundary", () => {
  it("canonicalizes a serialized genesis event into typed independent state", () => {
    const state = createInitialState(WORLD_CREATED);

    expect(state.worldId).toBe("w-1");
    expect(state.sequence).toBe(0);
    expect(state.scenarioSnapshot.indicators[0]?.kaIn.value).toBe(3.98e-10);
    expect(state.scenarioSnapshot.indicators[0]?.provenance.reference).toBe(
      "indicator contract test vector",
    );
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

  it("normalizes persisted canonical independent quantities at the state boundary", () => {
    const serialized = serializeWorldState(createInitialState(WORLD_CREATED));
    const stateWithHighPrecisionContents = {
      ...serialized,
      canonical: {
        byVessel: {
          ...serialized.canonical.byVessel,
          flask: {
            waterMass: { value: 0.7999999999996, unit: "kg" as const },
            liquidVolume: { value: 0.1234567890126, unit: "L" as const },
            componentAmounts: [
              { componentId: "HCl", amount: { value: 0.1234567890126, unit: "mol" as const } },
            ],
          },
        },
      },
    };

    const parsed = parseWorldState(stateWithHighPrecisionContents);
    const contents = parsed.canonical.byVessel.flask!;
    expect(contents.waterMass).toBe(quantize(0.7999999999996));
    expect(contents.liquidVolume).toBe(quantize(0.1234567890126));
    expect(contents.componentAmounts[0]?.amount).toBe(quantize(0.1234567890126));
  });

  it("preserves exact paired arithmetic when parsing a snapshot checkpoint", () => {
    const serialized = serializeWorldState(createInitialState(WORLD_CREATED));
    const checkpoint = {
      ...serialized,
      canonical: {
        byVessel: {
          ...serialized.canonical.byVessel,
          flask: {
            waterMass: { value: 0.09404493832199984, unit: "kg" as const },
            liquidVolume: { value: 0.0942, unit: "L" as const },
            componentAmounts: [
              { componentId: "HCl", amount: { value: 0.009420000000000024, unit: "mol" as const } },
            ],
          },
        },
      },
    };

    const parsed = parseWorldStateForSnapshot(checkpoint);
    expect(parsed.canonical.byVessel.flask!.waterMass).toBe(0.09404493832199984);
    expect(parsed.canonical.byVessel.flask!.componentAmounts[0]?.amount).toBe(
      0.009420000000000024,
    );
  });

  it("excludes the present sequence cursor from replay state identity", () => {
    const serialized = serializeWorldState(createInitialState(WORLD_CREATED));
    const later = { ...serialized, sequence: 99 };

    expect(stateHash(parseWorldState(later))).toBe(
      stateHash(parseWorldState(serialized)),
    );
  });

  it("keeps solver parameters exact in replay identity", () => {
    const serialized = serializeWorldState(createInitialState(WORLD_CREATED));
    const changed = {
      ...serialized,
      solverConfig: {
        ...serialized.solverConfig,
        parameters: { Kw: 1e-14 + 1e-28 },
      },
    };

    expect(stateHash(parseWorldState(changed))).not.toBe(stateHash(parseWorldState(serialized)));
  });

  it("keeps genesis snapshot checksums exact instead of quantizing all numbers", () => {
    const changed = {
      ...WORLD_CREATED.payload.scenarioSnapshot,
      modelRequirements: {
        ...WORLD_CREATED.payload.scenarioSnapshot.modelRequirements,
        temperature: { value: 298.15 + 1e-10, unit: "K" as const },
      },
    };

    expect(scenarioSnapshotHash(changed)).not.toBe(
      scenarioSnapshotHash(WORLD_CREATED.payload.scenarioSnapshot),
    );
  });

  it("includes frozen indicator constants in the genesis content hash", () => {
    const changed = {
      ...WORLD_CREATED.payload.scenarioSnapshot,
      indicators: [
        {
          ...WORLD_CREATED.payload.scenarioSnapshot.indicators[0]!,
          kaIn: { value: 4.01e-10, unit: "1" as const },
        },
      ],
    };

    expect(scenarioSnapshotHash(changed)).not.toBe(
      scenarioSnapshotHash(WORLD_CREATED.payload.scenarioSnapshot),
    );
  });

  it("rejects a genesis snapshot whose content checksum is stale", () => {
    const stale = {
      ...WORLD_CREATED,
      payload: { ...WORLD_CREATED.payload, contentHash: "sha256:stale" },
    };
    expect(() => createInitialState(stale)).toThrow(/CONTENT_HASH_MISMATCH/);
  });

  it("rejects a genesis profile whose payload no longer matches its profile hash", () => {
    const tampered = structuredClone(WORLD_CREATED) as SerializedWorldCreated;
    tampered.payload.scenarioSnapshot.vessels[0]!.volumeProfile.provenance.reference =
      "tampered profile";
    tampered.payload.contentHash = scenarioSnapshotHash(tampered.payload.scenarioSnapshot);
    expect(() => createInitialState(tampered)).toThrow(/VOLUME_PROFILE_HASH_MISMATCH/);
  });

  it("rebuilds the derived content checksum when migrating a v1 genesis", () => {
    const legacySnapshot = { ...WORLD_CREATED.payload.scenarioSnapshot };
    delete (legacySnapshot as Record<string, unknown>).indicators;
    const legacy = {
      ...WORLD_CREATED,
      schemaVersion: 1 as const,
      payload: {
        ...WORLD_CREATED.payload,
        scenarioSnapshot: legacySnapshot,
        contentHash: scenarioSnapshotHash(legacySnapshot),
      },
    };

    const migrated = migrateWorldCreated(legacy);

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.payload.scenarioSnapshot.indicators).toEqual([]);
    expect(migrated.payload.contentHash).toBe(
      scenarioSnapshotHash(migrated.payload.scenarioSnapshot),
    );
    expect(() => createInitialState(migrated)).not.toThrow();
  });

  it("requires an explicit profile resolver for legacy geometry-only genesis", () => {
    const legacySnapshot = structuredClone(WORLD_CREATED.payload.scenarioSnapshot) as SerializedWorldCreated["payload"]["scenarioSnapshot"];
    delete (legacySnapshot.vessels[0] as Record<string, unknown>).volumeProfile;
    const legacy = {
      ...WORLD_CREATED,
      schemaVersion: 3,
      payload: {
        ...WORLD_CREATED.payload,
        scenarioSnapshot: legacySnapshot,
        contentHash: scenarioSnapshotHash(legacySnapshot),
      },
    };

    expect(() => migrateWorldCreated(legacy)).toThrow(/NO_PATH/);
    const migrated = migrateWorldCreated(legacy, {
      resolveVolumeProfile: (geometryRef) => {
        if (geometryRef !== "flask-250") return undefined;
        return WORLD_CREATED.payload.scenarioSnapshot.vessels[0]!.volumeProfile;
      },
    });
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.payload.scenarioSnapshot.vessels[0]?.volumeProfile.profileId).toBe(
      "flask-250",
    );
    expect(() => createInitialState(migrated)).not.toThrow();
  });

  it("migrates a legacy v2 Celsius genesis to v3 and preserves replay identity", () => {
    const legacySnapshot = structuredClone(WORLD_CREATED.payload.scenarioSnapshot) as unknown as Record<string, unknown>;
    legacySnapshot.modelRequirements = {
      ...(legacySnapshot.modelRequirements as Record<string, unknown>),
      temperature: { value: 25, unit: "degC" },
    };
    const legacy = {
      ...WORLD_CREATED,
      schemaVersion: 2,
      payload: {
        ...WORLD_CREATED.payload,
        scenarioSnapshot: legacySnapshot,
        contentHash: scenarioSnapshotHash(
          legacySnapshot as Parameters<typeof scenarioSnapshotHash>[0],
        ),
      },
    };

    expect(() => createInitialState(legacy)).toThrow(
      new RegExp(`expected ${CURRENT_SCHEMA_VERSION}`),
    );
    const migrated = migrateWorldCreated(legacy);

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.payload.scenarioSnapshot.modelRequirements.temperature).toEqual({
      value: 298.15,
      unit: "K",
    });
    expect(migrated.payload.contentHash).toBe(WORLD_CREATED.payload.contentHash);
    expect(replay(createLog(migrated)).replayHash).toBe(
      replay(createLog(WORLD_CREATED)).replayHash,
    );
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

  it("rejects duplicate indicator identities in a genesis snapshot", () => {
    const duplicateSnapshot = {
      ...WORLD_CREATED.payload.scenarioSnapshot,
      indicators: [
        ...WORLD_CREATED.payload.scenarioSnapshot.indicators,
        WORLD_CREATED.payload.scenarioSnapshot.indicators[0]!,
      ],
    };
    expect(() => createInitialState({
      ...WORLD_CREATED,
      payload: {
        ...WORLD_CREATED.payload,
        scenarioSnapshot: duplicateSnapshot,
        contentHash: scenarioSnapshotHash(duplicateSnapshot),
      },
    })).toThrow(/DUPLICATE_ID: indicator/);
  });

  it("rejects a material snapshot whose frozen inventory disagrees with its recipe", () => {
    const forgedSnapshot = {
      ...WORLD_CREATED.payload.scenarioSnapshot,
      materials: [
        {
          ...WORLD_CREATED.payload.scenarioSnapshot.materials[0]!,
          resolvedInventoryPerLitre: {
            waterMass: { value: 999, unit: "kg" as const },
            soluteAmounts: [{ soluteId: "HCl", amount: { value: 999, unit: "mol" as const } }],
          },
        },
      ],
    };
    expect(() => createInitialState({
      ...WORLD_CREATED,
      payload: {
        ...WORLD_CREATED.payload,
        scenarioSnapshot: forgedSnapshot,
        contentHash: scenarioSnapshotHash(forgedSnapshot),
      },
    })).toThrow(/MATERIAL_INVENTORY_MISMATCH/);
  });
});
