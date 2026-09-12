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

function migratePersistedContainer(
  record: Record<string, unknown>,
  destinationVersion: number,
): Record<string, unknown> {
  const next = { ...record };
  if ("scenarioSnapshot" in next) {
    next.scenarioSnapshot = destinationVersion === 2
      ? addIndicatorsToSnapshot(next.scenarioSnapshot)
      : canonicalTemperature(next.scenarioSnapshot);
  }
  if (isRecord(next.payload)) {
    next.payload = migratePersistedContainer(next.payload, destinationVersion);
  }
  if (Array.isArray(next.events)) {
    next.events = next.events.map((event) => {
      if (!isRecord(event)) return event;
      return {
        ...migratePersistedContainer(event, destinationVersion),
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
];

/** Migrate a persisted World/Event record in its own version namespace. */
export function migrateWorld(
  record: Record<string, unknown>,
  targetVersion: number,
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
  return runMigrations(record, targetVersion, WORLD_MIGRATIONS);
}
