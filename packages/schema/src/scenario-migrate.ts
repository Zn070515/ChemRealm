/** Forward-only authored Scenario migrations, independent from World/Event data. */

import { runMigrations, type Migration, type MigrationResult } from "./migration-core.js";

export type { Migration, MigrationResult } from "./migration-core.js";

/**
 * No authoring migration is currently promised. In particular, deleting the
 * old `fullyDissociated` field cannot be a silent v2→v3 rewrite because that
 * field was presented as scientific content even though the resolver ignored
 * it. A future migration must be explicitly designed, tested, and reviewed.
 */
export const SCENARIO_MIGRATIONS: readonly Migration[] = [];

/** Migrate an authored Scenario only through the explicitly authored namespace. */
export function migrateScenario(
  record: Record<string, unknown>,
  targetVersion: number,
): MigrationResult {
  return runMigrations(record, targetVersion, SCENARIO_MIGRATIONS);
}
