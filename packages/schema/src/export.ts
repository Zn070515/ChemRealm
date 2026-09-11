/**
 * The export bundle (`ADR-0005`).
 *
 * EXPORT FLATTENS. `ADR-0002` stores a branch internally as
 * `(shared immutable prefix) + (its own suffix)`, which is correct and
 * efficient *inside* IndexedDB. It does not transfer:
 *
 *     Root   events 0..20
 *        └── Child   events 21..35      ← exported alone
 *
 * A suffix-only bundle cannot be replayed anywhere else — the prefix that
 * produced the child's starting state is missing — so "attach the event log to
 * reproduce a bug" would silently fail for every branch.
 *
 * So an exported bundle always carries the COMPLETE log from genesis to the
 * branch tip, plus lineage metadata. Internal storage may share the prefix;
 * export is a portability boundary and does not inherit an internal storage
 * optimisation. `SPEC-0001` AC-R17 requires a round-trip test that discards the
 * parent entirely.
 *
 * ON IDENTIFIERS. `ADR-0005` says a bundle contains no identifiers. Read
 * literally that would forbid the `worldId` that flattened export requires, so
 * the rule is stated precisely: no PERSONAL, DEVICE, or CROSS-SESSION TRACKING
 * identifier. World ids are content, not identity.
 */

import { z } from "zod";

import { EventLogSchema } from "./events.js";
import { SerializedQuantitySchema } from "./quantity.js";
import { SolverConfigSchema } from "./scientific.js";
import {
  CURRENT_SCHEMA_VERSION,
  HashSchema,
  LineageSchema,
  ScenarioSnapshotSchema,
  WorldIdSchema,
} from "./world.js";

export const EXPORT_FORMAT = "chemrealm.export";
export const EXPORT_FORMAT_VERSION = 1;

/**
 * One link in the chain from genesis to the exported branch tip. The last entry
 * describes the exported world itself.
 */
export const LineageLinkSchema = z.object({
  worldId: WorldIdSchema,
  lineage: LineageSchema,
});
export type LineageLink = z.infer<typeof LineageLinkSchema>;

export const ExportBundleSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  formatVersion: z.literal(EXPORT_FORMAT_VERSION),
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),

  /**
   * Genesis-to-tip chain. More than one entry means the exported world is a
   * branch and its ancestors' identities travel with it.
   */
  lineage: z.array(LineageLinkSchema).min(1),

  /**
   * The COMPLETE event log from genesis, not a branch suffix. This is what
   * makes the bundle replayable on a machine that has never seen the parent.
   */
  events: EventLogSchema,

  /** Self-contained genesis, so replay never reads `content/` (AC-R12). */
  scenarioSnapshot: ScenarioSnapshotSchema,
  contentHash: HashSchema,
  solverConfig: SolverConfigSchema,

  /** Explicitly states whether learner evidence is in this bundle. */
  includesLearnerEvidence: z.boolean(),
  learnerEvidence: z.array(z.object({}).passthrough()).optional(),

  createdAt: z.string().optional(),
});
export type ExportBundle = z.infer<typeof ExportBundleSchema>;

/**
 * Fields that must NEVER appear in a bundle. Listed explicitly so a test can
 * assert their absence rather than relying on nobody adding them.
 */
export const FORBIDDEN_BUNDLE_FIELDS = [
  "deviceId",
  "installId",
  "userId",
  "learnerId",
  "email",
  "phone",
  "fingerprint",
  "sessionId",
  "ipAddress",
] as const;

/** Serialized quantity is re-exported so bundle consumers need one import. */
export { SerializedQuantitySchema };
