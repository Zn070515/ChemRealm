/**
 * Forward-only schema migrations (`ADR-0005` §Schema versioning).
 *
 * There is no version 0 and therefore no migration to perform yet — but the
 * MECHANISM exists from the first release, with a registered no-op `1 -> 1`, so
 * the harness is tested before it is needed rather than written under pressure
 * against live user data.
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
 *
 * The `1 -> 1` entry is a no-op by design: it exercises the runner on every
 * test run, so a regression in the harness is caught immediately rather than
 * the first time a real migration exists.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    from: 1,
    to: 1,
    describe: "no-op: exercises the runner before the first real migration exists",
    migrate: (record) => record,
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
