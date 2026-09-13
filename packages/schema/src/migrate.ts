/** Forward-only persisted World/Event migrations (`ADR-0005` §Schema versioning). */

import { toCanonical } from "./quantity.js";
import { runMigrations, type Migration, type MigrationResult } from "./migration-core.js";

export type { Migration, MigrationResult } from "./migration-core.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function addIndicatorsToSnapshot(value: unknown): unknown {
  if (!isRecord(value) || "indicators" in value) return value;
  if (
    "scenarioRef" in value &&
    "materials" in value &&
    "vessels" in value &&
    "modelRequirements" in value &&
    "apparatusDefaults" in value
  ) {
    return { ...value, indicators: [] };
  }
  return value;
}

function canonicalTemperature(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const requirements = value["modelRequirements"];
  if (!isRecord(requirements)) return value;
  const temperature = requirements["temperature"];
  if (
    !isRecord(temperature) ||
    typeof temperature.value !== "number" ||
    (temperature.unit !== "K" && temperature.unit !== "degC")
  ) {
    return value;
  }
  const canonical = toCanonical(temperature as Parameters<typeof toCanonical>[0]);
  return {
    ...value,
    modelRequirements: {
      ...requirements,
      temperature: {
        value: Number(canonical.value.toPrecision(15)),
        unit: "K",
      },
    },
  };
}

export type VolumeProfileMigrationResolver = (
  geometryRef: string,
  vessel: Record<string, unknown>,
) => Record<string, unknown> | undefined;

function vesselsMissingProfiles(value: unknown): readonly Record<string, unknown>[] {
  if (!isRecord(value) || !Array.isArray(value.vessels)) return [];
  return value.vessels.filter(
    (vessel): vessel is Record<string, unknown> =>
      isRecord(vessel) && !("volumeProfile" in vessel),
  );
}

function addVolumeProfilesToSnapshot(
  value: unknown,
  resolveVolumeProfile: VolumeProfileMigrationResolver,
): unknown {
  if (!isRecord(value) || !Array.isArray(value.vessels)) return value;
  return {
    ...value,
    vessels: value.vessels.map((vessel) => {
      if (!isRecord(vessel) || "volumeProfile" in vessel) return vessel;
      const geometryRef = vessel.geometryRef;
      if (typeof geometryRef !== "string") return vessel;
      const volumeProfile = resolveVolumeProfile(geometryRef, vessel);
      return volumeProfile === undefined ? vessel : { ...vessel, volumeProfile };
    }),
  };
}

function migratePersistedContainer(
  record: Record<string, unknown>,
  destinationVersion: number,
  resolveVolumeProfile?: VolumeProfileMigrationResolver,
): Record<string, unknown> {
  const next = { ...record };
  if ("scenarioSnapshot" in next) {
    let snapshot = destinationVersion === 2
      ? addIndicatorsToSnapshot(next.scenarioSnapshot)
      : canonicalTemperature(next.scenarioSnapshot);
    if (destinationVersion >= 4 && resolveVolumeProfile !== undefined) {
      snapshot = addVolumeProfilesToSnapshot(snapshot, resolveVolumeProfile);
    }
    next.scenarioSnapshot = snapshot;
  }
  if (isRecord(next.payload)) {
    next.payload = migratePersistedContainer(
      next.payload,
      destinationVersion,
      resolveVolumeProfile,
    );
  }
  if (Array.isArray(next.events)) {
    next.events = next.events.map((event) => {
      if (!isRecord(event)) return event;
      return {
        ...migratePersistedContainer(event, destinationVersion, resolveVolumeProfile),
        schemaVersion: destinationVersion,
      };
    });
  }
  return next;
}

export const WORLD_MIGRATIONS: readonly Migration[] = [
  {
    from: 1,
    to: 2,
    describe: "add the explicit scenario snapshot indicator block",
    migrate: (record) => migratePersistedContainer(record, 2),
  },
  {
    from: 2,
    to: 3,
    describe: "canonicalize persisted scenario requirement temperature to Kelvin",
    migrate: (record) => migratePersistedContainer(record, 3),
  },
  {
    from: 3,
    to: 4,
    describe: "freeze serializable volume profiles into persisted genesis vessels",
    migrate: (record) => migratePersistedContainer(record, 4),
  },
];

/** Migrate a persisted World/Event record in its own version namespace. */
export function migrateWorld(
  record: Record<string, unknown>,
  targetVersion: number,
  options: { readonly resolveVolumeProfile?: VolumeProfileMigrationResolver } = {},
): MigrationResult {
  // A top-level scenarioRef/materials pair is an authored Scenario, not a
  // persisted world/event container. Refuse it here instead of allowing a
  // coincidentally compatible version number to cross namespaces.
  if ("scenarioRef" in record && "materials" in record) {
    const found = record["schemaVersion"];
    return {
      status: "NO_PATH",
      foundVersion: typeof found === "number" ? found : Number.NaN,
      supportedVersion: targetVersion,
    };
  }
  const found = record["schemaVersion"];
  if (typeof found === "number" && found < 4 && targetVersion >= 4) {
    const snapshots: unknown[] = [];
    if ("scenarioSnapshot" in record) snapshots.push(record.scenarioSnapshot);
    if (isRecord(record.payload) && "scenarioSnapshot" in record.payload) {
      snapshots.push(record.payload.scenarioSnapshot);
    }
    if (Array.isArray(record.events)) {
      for (const event of record.events) {
        if (isRecord(event) && isRecord(event.payload) && "scenarioSnapshot" in event.payload) {
          snapshots.push(event.payload.scenarioSnapshot);
        }
      }
    }
    if (
      snapshots.some((snapshot) => vesselsMissingProfiles(snapshot).length > 0) &&
      options.resolveVolumeProfile === undefined
    ) {
      return {
        status: "NO_PATH",
        foundVersion: found,
        supportedVersion: targetVersion,
      };
    }
  }
  const migrations = WORLD_MIGRATIONS.map((migration) => {
    if (migration.from !== 3 || options.resolveVolumeProfile === undefined) {
      return migration;
    }
    return {
      ...migration,
      migrate: (current: Record<string, unknown>) =>
        migratePersistedContainer(current, 4, options.resolveVolumeProfile),
    };
  });
  return runMigrations(record, targetVersion, migrations);
}
