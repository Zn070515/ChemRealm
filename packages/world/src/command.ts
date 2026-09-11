/** Command validation and event emission for the World Runtime (`ADR-0002`). */

import {
  CommandSchema,
  CURRENT_SCHEMA_VERSION,
  toCanonical,
  type Command,
  type DomainEvent,
  type RejectionReason,
} from "@chemrealm/schema";

import { quantize } from "./hash.js";
import { stateHash, type WorldState } from "./state.js";

export type CommandRejection = {
  readonly accepted: false;
  readonly reason: RejectionReason;
  readonly detail: string;
};

export type CommandEmission =
  | { readonly accepted: true; readonly event: DomainEvent }
  | CommandRejection;

export interface CommandOptions {
  /** Identity is supplied by the caller; the runtime never calls randomness. */
  readonly childWorldId?: string;
}

function reject(reason: RejectionReason, detail: string): CommandRejection {
  return { accepted: false, reason, detail };
}

function canonicalVolume(command: Command & { volume: unknown }) {
  const value = canonicalVolumeQuantity(command.volume as Parameters<typeof toCanonical>[0]);
  if (value <= 0) return reject("INVALID_QUANTITY", "volume must be greater than zero");
  return { value, unit: "L" as const };
}

function canonicalVolumeQuantity(input: Parameters<typeof toCanonical>[0]): number {
  return quantize(toCanonical(input).value);
}

/** Normalize event quantities before they become append-only persisted facts. */
export function canonicalizeDomainEvent(event: DomainEvent): DomainEvent {
  switch (event.type) {
    case "MaterialCharged":
      return {
        ...event,
        payload: {
          ...event.payload,
          volume: { value: canonicalVolumeQuantity(event.payload.volume), unit: "L" },
        },
      };
    case "TransferCommitted":
      return {
        ...event,
        payload: {
          ...event.payload,
          volume: { value: canonicalVolumeQuantity(event.payload.volume), unit: "L" },
        },
      };
    default:
      return event;
  }
}

function vessel(state: WorldState, id: string) {
  return state.vessels.find((candidate) => candidate.id === id);
}

function contents(state: WorldState, id: string) {
  return state.canonical.byVessel[id];
}

function material(state: WorldState, id: string) {
  return state.scenarioSnapshot.materials.find((candidate) => candidate.materialId === id);
}

function accepted(event: DomainEvent): CommandEmission {
  return { accepted: true, event };
}

function validateParsedCommand(
  state: WorldState,
  command: Command,
  options: CommandOptions,
): CommandEmission {
  const seq = state.sequence + 1;
  switch (command.type) {
    case "PlaceApparatus":
      if (state.apparatus.some((candidate) => candidate.id === command.apparatusId)) {
        return reject("DUPLICATE_ID", `apparatus ${command.apparatusId} already exists`);
      }
      return accepted({
        seq,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        type: "ApparatusPlaced",
        payload: {
          apparatusId: command.apparatusId,
          kind: command.kind,
          position: command.position,
        },
      });

    case "AttachApparatus": {
      const hasNode = (id: string) =>
        state.vessels.some((candidate) => candidate.id === id) ||
        state.apparatus.some((candidate) => candidate.id === id);
      if (!hasNode(command.childId) || !hasNode(command.parentId)) {
        return reject("NODE_NOT_FOUND", "attachment references an unknown node");
      }
      if (command.childId === command.parentId) {
        return reject("INVALID_ATTACHMENT", "a node cannot attach to itself");
      }
      return accepted({
        seq,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        type: "ApparatusAttached",
        payload: {
          childId: command.childId,
          parentId: command.parentId,
          portId: command.portId,
        },
      });
    }

    case "ChargeVessel": {
      const target = vessel(state, command.vesselId);
      if (target === undefined) return reject("VESSEL_NOT_FOUND", `unknown vessel ${command.vesselId}`);
      if (material(state, command.materialId) === undefined) {
        return reject("MATERIAL_NOT_FOUND", `unknown material ${command.materialId}`);
      }
      const volume = canonicalVolume(command);
      if ("accepted" in volume) return volume;
      if (target.capacity < (contents(state, target.id)?.liquidVolume ?? 0) + volume.value) {
        return reject("CAPACITY_EXCEEDED", `charging ${target.id} would exceed its capacity`);
      }
      return accepted({
        seq,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        type: "MaterialCharged",
        payload: {
          vesselId: command.vesselId,
          materialId: command.materialId,
          volume,
        },
      });
    }

    case "DeliverTitrant": {
      const source = vessel(state, command.fromVesselId);
      const target = vessel(state, command.toVesselId);
      if (source === undefined || target === undefined) {
        return reject("VESSEL_NOT_FOUND", "delivery references an unknown vessel");
      }
      if (source.id === target.id) return reject("INVALID_QUANTITY", "source and target must differ");
      const volume = canonicalVolume(command);
      if ("accepted" in volume) return volume;
      const sourceContents = contents(state, source.id);
      const targetContents = contents(state, target.id);
      if (sourceContents === undefined || sourceContents.liquidVolume < volume.value) {
        return reject("INSUFFICIENT_VOLUME", `delivery exceeds source volume in ${source.id}`);
      }
      if (targetContents === undefined || targetContents.liquidVolume + volume.value > target.capacity) {
        return reject("CAPACITY_EXCEEDED", `delivery would exceed target capacity in ${target.id}`);
      }
      return accepted({
        seq,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        type: "TransferCommitted",
        payload: {
          fromVesselId: command.fromVesselId,
          toVesselId: command.toVesselId,
          volume,
          mechanism: "burette",
        },
      });
    }

    case "BranchWorld": {
      if (command.fromSequence !== state.sequence) {
        return reject("SEQUENCE_NOT_IN_LOG", `branch point ${command.fromSequence} is not the current sequence`);
      }
      if (options.childWorldId === undefined || options.childWorldId.length === 0) {
        return reject("INVALID_QUANTITY", "branch identity must be supplied explicitly");
      }
      return accepted({
        seq,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        type: "WorldBranched",
        payload: {
          childWorldId: options.childWorldId,
          parentWorldId: state.worldId,
          forkSequence: state.sequence,
          forkStateHash: stateHash(state),
        },
      });
    }
  }
}

/** Validate a command. A rejected command contains no event by construction. */
export function validateCommand(
  state: WorldState,
  input: unknown,
  options: CommandOptions = {},
): CommandEmission {
  const parsed = CommandSchema.safeParse(input);
  if (!parsed.success) return reject("INVALID_QUANTITY", "command failed schema validation");
  return validateParsedCommand(state, parsed.data, options);
}

/** Alias emphasizing that this function is the only command-to-event boundary. */
export function emitCommand(
  state: WorldState,
  input: unknown,
  options: CommandOptions = {},
): CommandEmission {
  return validateCommand(state, input, options);
}
