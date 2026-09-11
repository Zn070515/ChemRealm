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
 * ON IDENTIFIERS. Earlier wording in `ADR-0005` said a bundle contains no
 * identifiers. Read literally that would forbid the `worldId` that flattened
 * export requires, so the rule is stated precisely: no PERSONAL, DEVICE, or
 * CROSS-SESSION TRACKING identifier. World ids are content, not identity.
 *
 * WHERE GENESIS FACTS LIVE. A bundle carries the log and nothing that the log
 * already says. An earlier version also copied `scenarioSnapshot`,
 * `contentHash`, and `solverConfig` to the top level, where they duplicated
 * `WorldCreated.payload` with nothing checking the two agreed — the same
 * second-source-of-truth defect this project removed from `Vessel.contents`.
 * The complete log from genesis already makes the bundle self-contained
 * (`AC-R17`), so a consumer reads them from `events[0]`:
 *
 *     events[0].type === "WorldCreated"
 *     events[0].payload.{worldId, scenarioSnapshot, contentHash, solverConfig}
 *
 * Making them look convenient to read at the top level is what let them drift.
 */

import { z } from "zod";

import { EventLogSchema } from "./events.js";
import { CURRENT_SCHEMA_VERSION, LineageSchema, WorldIdSchema } from "./world.js";

export const EXPORT_FORMAT = "chemrealm.export";
export const EXPORT_FORMAT_VERSION = 1;

/**
 * One link in the chain from genesis to the exported branch tip. The last entry
 * describes the exported world itself.
 */
export const LineageLinkSchema = z.strictObject({
  worldId: WorldIdSchema,
  lineage: LineageSchema,
});
export type LineageLink = z.infer<typeof LineageLinkSchema>;

export const ExportBundleSchema = z.strictObject({
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
   * makes the bundle replayable on a machine that has never seen the parent,
   * and `events[0]` is the genesis — see the header. Nothing here restates what
   * the log already carries.
   */
  events: EventLogSchema,

  /**
   * WHETHER this bundle carries learner evidence. In v1 the answer is always
   * `false`, expressed as a literal.
   *
   * The previous shape was `learnerEvidence: z.array(z.strictObject({})
   * .passthrough()).optional()`, sitting beside a `FORBIDDEN_BUNDLE_FIELDS` list
   * and an AC-P4 test that inspected only the TOP-LEVEL field names. Verified
   * before the fix: a bundle carrying `learnerEvidence: [{ learnerId: "123",
   * email: "x@example.com", sessionId: "abc" }]` parsed successfully.
   * `passthrough()` means "any key at all", so the bundle AC-P4 exists to
   * prevent was the one the schema invited.
   *
   * M9 defines `EvidenceEvent` and its privacy-safe export form. Until then
   * there is nothing truthful to put here, and a hole left open "for later" is
   * how the later version inherits it. v1 states `false` and carries no
   * payload; M9 adds the `true` branch together with a `formatVersion` bump.
   */
  includesLearnerEvidence: z.literal(false),

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
