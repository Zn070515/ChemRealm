/**
 * The world event log (`ADR-0002`).
 *
 * WHAT IS AND IS NOT AN EVENT
 * ---------------------------
 * An event records a meaningful chemical/experimental transition. The test:
 * *if this event were deleted and re-created identically, would the chemical
 * world be different?* If no, it is a UI gesture, not a domain event.
 *
 * Explicitly NOT events: `pointermove`, `dragframe`, hover, scroll, camera pan,
 * animation ticks, and live slider position during a drag.
 *
 * Two designed-out candidates are worth keeping visible, because both are the
 * obvious first guess:
 *
 *   `BuretteReadingChanged` — REJECTED. The reading is derived:
 *   `reading = initialVolume − Σ delivered`. Storing it would be a second
 *   source of truth for one quantity, which is the most reliable way to make a
 *   replay diverge.
 *
 *   `TransferStarted` — DEFERRED, not rejected. With instantaneous equilibrium
 *   a transfer has no duration in world time, so the event would carry no
 *   semantic content. It becomes real when kinetics arrive.
 *
 * IDENTITY IS EVENT-SOURCED. `WorldCreated` carries `worldId` and
 * `WorldBranched` carries the child's identity, because otherwise
 * `WorldState ≠ fold(events)` — `worldId` was unreconstructable from the log.
 * Identity is generated ONCE when the event is created and frozen; replay reads
 * it and never regenerates it.
 */

import { z } from "zod";

import { SerializedQuantitySchema } from "./quantity.js";
import {
  ApparatusIdSchema,
  CURRENT_SCHEMA_VERSION,
  HashSchema,
  MaterialIdSchema,
  PositionSchema,
  ScenarioSnapshotSchema,
  VesselIdSchema,
  WorldIdSchema,
} from "./world.js";
import { SolverConfigSchema } from "./scientific.js";

/** Every event carries this envelope. `meta` is excluded from state hashes. */
export const EventEnvelopeShape = {
  seq: z.number().int().nonnegative(),
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  /** Wall-clock, for human reading only. Never hashed, never an ordering key. */
  meta: z
    .object({ recordedAt: z.string().optional() })
    .optional(),
};

/**
 * Genesis. Self-contained: the snapshot carries resolved inventory, so replay
 * never reads `content/`. `solverConfig` is the single record of what was
 * RESOLVED and USED; the snapshot carries only what the scenario REQUIRED.
 */
export const WorldCreatedSchema = z.object({
  ...EventEnvelopeShape,
  type: z.literal("WorldCreated"),
  payload: z.object({
    worldId: WorldIdSchema,
    scenarioSnapshot: ScenarioSnapshotSchema,
    /** The snapshot's checksum, verified on load: hash(snapshot) === this. */
    contentHash: HashSchema,
    solverConfig: SolverConfigSchema,
    /** No randomness in v0; present so a future seeded PRNG has a home. */
    seed: z.number().int().nullable(),
  }),
});

export const ApparatusPlacedSchema = z.object({
  ...EventEnvelopeShape,
  type: z.literal("ApparatusPlaced"),
  payload: z.object({
    apparatusId: ApparatusIdSchema,
    kind: z.string().min(1),
    position: PositionSchema,
  }),
});

export const ApparatusAttachedSchema = z.object({
  ...EventEnvelopeShape,
  type: z.literal("ApparatusAttached"),
  payload: z.object({
    childId: z.union([ApparatusIdSchema, VesselIdSchema]),
    parentId: z.union([ApparatusIdSchema, VesselIdSchema]),
    portId: z.string().min(1),
  }),
});

/**
 * Carries the CHARGED VOLUME, not an amount.
 *
 * A material is a solution with a declared molarity and density; the reducer
 * derives amount, water mass, and initial liquid volume from the snapshot's
 * resolved inventory. This also matches what a learner actually does — dispense
 * a volume.
 */
export const MaterialChargedSchema = z.object({
  ...EventEnvelopeShape,
  type: z.literal("MaterialCharged"),
  payload: z.object({
    vesselId: VesselIdSchema,
    materialId: MaterialIdSchema,
    volume: SerializedQuantitySchema,
  }),
});

/**
 * The chemically load-bearing event.
 *
 * All deltas are computed from the PRE-TRANSFER snapshot, then applied. An
 * implementation that interleaves the reads and writes moves too little on the
 * second line — the first has already changed the source. The spike's
 * implementation was correct and the spec's pseudocode was not, which is why
 * the rule is stated as a rule.
 */
export const TransferCommittedSchema = z.object({
  ...EventEnvelopeShape,
  type: z.literal("TransferCommitted"),
  payload: z.object({
    fromVesselId: VesselIdSchema,
    toVesselId: VesselIdSchema,
    volume: SerializedQuantitySchema,
    mechanism: z.enum(["burette", "pipette", "poured"]),
  }),
});

/**
 * Creates a child world's identity. Recorded in the CHILD's log.
 *
 * `forkStateHash` pins the point the child diverged from, so replay can verify
 * the shared prefix rather than trusting it.
 */
export const WorldBranchedSchema = z.object({
  ...EventEnvelopeShape,
  type: z.literal("WorldBranched"),
  payload: z.object({
    childWorldId: WorldIdSchema,
    parentWorldId: WorldIdSchema,
    forkSequence: z.number().int().nonnegative(),
    forkStateHash: HashSchema,
  }),
});

export const DomainEventSchema = z.discriminatedUnion("type", [
  WorldCreatedSchema,
  ApparatusPlacedSchema,
  ApparatusAttachedSchema,
  MaterialChargedSchema,
  TransferCommittedSchema,
  WorldBranchedSchema,
]);

export type DomainEvent = z.infer<typeof DomainEventSchema>;
export type EventType = DomainEvent["type"];
export type WorldCreated = z.infer<typeof WorldCreatedSchema>;
export type MaterialCharged = z.infer<typeof MaterialChargedSchema>;
export type TransferCommitted = z.infer<typeof TransferCommittedSchema>;
export type WorldBranched = z.infer<typeof WorldBranchedSchema>;

/** A serialized world: the complete log from genesis to the branch tip. */
export const EventLogSchema = z.array(DomainEventSchema);
export type EventLog = z.infer<typeof EventLogSchema>;
