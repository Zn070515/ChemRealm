/** Shared mechanics for the independent persisted and authoring migration namespaces. */

export interface Migration {
  readonly from: number;
  readonly to: number;
  readonly describe: string;
  migrate(record: Record<string, unknown>): Record<string, unknown>;
}

export type MigrationResult =
  | { status: "OK"; record: Record<string, unknown>; applied: number[] }
  | { status: "REFUSED_FROM_FUTURE"; foundVersion: number; supportedVersion: number }
  | { status: "NO_PATH"; foundVersion: number; supportedVersion: number };

/**
 * Run one explicitly supplied migration namespace.
 *
 * A namespace is passed in rather than discovered globally. This prevents an
 * authored Scenario version from accidentally being interpreted as a
 * persisted World/Event version (or vice versa).
 */
export function runMigrations(
  record: Record<string, unknown>,
  targetVersion: number,
  migrations: readonly Migration[],
): MigrationResult {
  const found = record["schemaVersion"];
  if (typeof found !== "number" || !Number.isInteger(found)) {
    return { status: "NO_PATH", foundVersion: Number.NaN, supportedVersion: targetVersion };
  }

  if (found > targetVersion) {
    return {
      status: "REFUSED_FROM_FUTURE",
      foundVersion: found,
      supportedVersion: targetVersion,
    };
  }
  if (found === targetVersion) {
    return { status: "OK", record, applied: [] };
  }

  let current = record;
  let version = found;
  const applied: number[] = [];

  while (version < targetVersion) {
    const step = migrations.find((migration) => migration.from === version);
    if (step === undefined) {
      return { status: "NO_PATH", foundVersion: version, supportedVersion: targetVersion };
    }
    current = { ...step.migrate(current), schemaVersion: step.to };
    version = step.to;
    applied.push(step.to);
  }

  return { status: "OK", record: current, applied };
}
