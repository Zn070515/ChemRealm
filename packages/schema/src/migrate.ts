/**
 * Forward-only schema migrations (`ADR-0005` §Schema versioning).
 *
 * Version 2 adds resolved, scenario-specific indicator inputs to the genesis
 * snapshot. The migration is deliberately structural: old records that had no
 * persisted indicator definition receive an explicit empty list. No value is
 * invented, and callers must decide how to handle worlds that used an
 * unrecorded request-local indicator in a pre-v2 build.
 *
 * Rules, all of them learned from the failure modes in `ADR-0005`:
 *
 *   - Forward only. A newer `schemaVersion` is REFUSED, not attempted.
 *   - Failure is LOUD and NON-DESTRUCTIVE. An unmigratable record is reported
 *     and left untouched. A silent reset destroys the user's work and is a
 *     P0-class defect.
 *   - Every migration is independently testable, so a chain can be verified
 *     step by step rather than only end to end.
 */

export interface Migration {
  readonly from: number;
  readonly to: number;
  readonly describe: string;
  migrate(record: Record<string, unknown>): Record<string, unknown>;
}

/**
 * The registry. Order matters only in that each `from` must be reachable.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function addIndicatorsToScenarioRecord(value: unknown): unknown {
  if (!isRecord(value)) return value;
  if ("indicators" in value) return value;
  if (
    "scenarioRef" in value &&
    "materials" in value &&
    "vessels" in value &&
    "modelRequirements" in value &&
    ("apparatusDefaults" in value || "apparatus" in value)
  ) {
    return { ...value, indicators: [] };
  }
  return value;
}

function addIndicatorsToSnapshot(value: unknown): unknown {
  return addIndicatorsToScenarioRecord(value);
}

function migrateEvent(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const migrated = migrateContainer(value);
  return typeof migrated.schemaVersion === "number"
    ? { ...migrated, schemaVersion: 2 }
    : migrated;
}

function migrateContainer(record: Record<string, unknown>): Record<string, unknown> {
  // Always clone before descending. A successful migration must not mutate
  // the caller's in-memory record while it adds nested v2 fields.
  const next = { ...(addIndicatorsToScenarioRecord(record) as Record<string, unknown>) };
  if ("scenarioSnapshot" in next) {
    next.scenarioSnapshot = addIndicatorsToSnapshot(next.scenarioSnapshot);
  }
  if (isRecord(next.payload)) {
    next.payload = migrateContainer(next.payload);
  }
  if (Array.isArray(next.events)) {
    next.events = next.events.map(migrateEvent);
  }
  return next;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    from: 1,
    to: 2,
    describe: "add the explicit scenario snapshot indicator block",
    migrate: migrateContainer,
  },
];

export type MigrationResult =
  | { status: "OK"; record: Record<string, unknown>; applied: number[] }
  | { status: "REFUSED_FROM_FUTURE"; foundVersion: number; supportedVersion: number }
  | { status: "NO_PATH"; foundVersion: number; supportedVersion: number };

/**
 * Migrate a record to `targetVersion`, or refuse it.
 *
 * A refusal returns the ORIGINAL record untouched inside the result — the
 * caller must not have to reach for it separately, because a caller that has to
 * remember to preserve it is a caller that will forget.
 */
export function migrate(
  record: Record<string, unknown>,
  targetVersion: number,
): MigrationResult {
  const found = record["schemaVersion"];
  if (typeof found !== "number" || !Number.isInteger(found)) {
    return { status: "NO_PATH", foundVersion: Number.NaN, supportedVersion: targetVersion };
  }

  if (found > targetVersion) {
    // Older app, newer data. Never partially migrate; never guess.
    return { status: "REFUSED_FROM_FUTURE", foundVersion: found, supportedVersion: targetVersion };
  }
  if (found === targetVersion) {
    return { status: "OK", record, applied: [] };
  }

  let current = record;
  let version = found;
  const applied: number[] = [];

  while (version < targetVersion) {
    const step = MIGRATIONS.find((m) => m.from === version);
    if (step === undefined) {
      // The chain is broken. Return what we have, plus the failure, rather than
      // a half-migrated record that looks migrated.
      return { status: "NO_PATH", foundVersion: version, supportedVersion: targetVersion };
    }
    current = { ...step.migrate(current), schemaVersion: step.to };
    version = step.to;
    applied.push(step.to);
  }

  return { status: "OK", record: current, applied };
}
