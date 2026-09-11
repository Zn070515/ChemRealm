/**
 * Commands — validated requests that MAY become events (`ADR-0002`).
 *
 * ```
 * UserIntent      (transient: "user dragged the burette", "user clicked Deliver")
 *     |           translated by the app layer; may be discarded
 * Command         (a validated request: DeliverTitrant{ vesselId, volume })
 *     |           validated against current WorldState; may be REJECTED
 * DomainEvent     (an accepted fact: TransferCommitted{ ... })
 *     |           reducer (pure, deterministic)
 * WorldState'
 * ```
 *
 * A command that fails validation emits NO event. Rejection is a returned
 * result, not a log entry, so the log stays a record of what happened rather
 * than of what was attempted.
 */

import { z } from "zod";

import { quantityOfDimension } from "./quantity.js";
import {
  ApparatusIdSchema,
  MaterialIdSchema,
  PositionSchema,
  VesselIdSchema,
} from "./world.js";

/**
 * Version of the command shape.
 *
 * Commands are emitted as JSON Schema (`json-schema.ts`) and validated by the
 * Python side, so they are a wire format rather than an internal TypeScript
 * type. An unversioned wire format cannot be migrated later without guesswork
 * (M1 contract remediation item 6).
 */
export const COMMAND_SCHEMA_VERSION = 1;

export const CommandSchema = z.discriminatedUnion("type", [
  z.strictObject({
    schemaVersion: z.literal(COMMAND_SCHEMA_VERSION),
    type: z.literal("PlaceApparatus"),
    apparatusId: ApparatusIdSchema,
    kind: z.string().min(1),
    position: PositionSchema,
  }),
  z.strictObject({
    schemaVersion: z.literal(COMMAND_SCHEMA_VERSION),
    type: z.literal("AttachApparatus"),
    childId: z.union([ApparatusIdSchema, VesselIdSchema]),
    parentId: z.union([ApparatusIdSchema, VesselIdSchema]),
    portId: z.string().min(1),
  }),
  z.strictObject({
    schemaVersion: z.literal(COMMAND_SCHEMA_VERSION),
    type: z.literal("ChargeVessel"),
    vesselId: VesselIdSchema,
    materialId: MaterialIdSchema,
    volume: quantityOfDimension("volume"),
  }),
  /**
   * The learner-facing "add titrant". Named for the intent; the event it
   * produces is `TransferCommitted`, because that is the fact.
   */
  z.strictObject({
    schemaVersion: z.literal(COMMAND_SCHEMA_VERSION),
    type: z.literal("DeliverTitrant"),
    fromVesselId: VesselIdSchema,
    toVesselId: VesselIdSchema,
    volume: quantityOfDimension("volume"),
  }),
  z.strictObject({
    schemaVersion: z.literal(COMMAND_SCHEMA_VERSION),
    type: z.literal("BranchWorld"),
    fromSequence: z.number().int().nonnegative(),
  }),
]);

export type Command = z.infer<typeof CommandSchema>;

/**
 * Why a command was refused. Refusal is a normal outcome at a system boundary,
 * so it is a value rather than an exception — an exception invites
 * `try/catch`-and-continue, which turns a refusal into a stale value.
 */
export const RejectionReasonSchema = z.enum([
  "VESSEL_NOT_FOUND",
  "APPARATUS_NOT_FOUND",
  "MATERIAL_NOT_FOUND",
  "INSUFFICIENT_VOLUME",
  "CAPACITY_EXCEEDED",
  "NO_ATTACHMENT_PORT",
  "SEQUENCE_NOT_IN_LOG",
  "INVALID_QUANTITY",
]);
export type RejectionReason = z.infer<typeof RejectionReasonSchema>;

export type CommandResult =
  | { accepted: true; emittedType: string }
  | { accepted: false; reason: RejectionReason; detail: string };
