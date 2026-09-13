import {
  parseScientificState,
  serializeScientificState,
  type Litre,
  type ScientificState,
} from "@chemrealm/schema";
import {
  projectScientificState,
  type ScientificProjection,
} from "./projection.js";

export interface ScientificFrame {
  readonly sourceStateHash: string;
  /** World event sequence represented by this frame. */
  readonly sequence: number;
  readonly scientificState: ScientificState;
  readonly physical: {
    readonly liquidVolume: Litre;
    /** Content hash of the replay-frozen volume profile used by Observable. */
    readonly volumeProfileHash: string;
  };
  readonly projection: ScientificProjection;
}

export interface ScientificFrameInput {
  readonly sourceStateHash: string;
  readonly sequence: number;
  readonly liquidVolume: Litre;
  readonly volumeProfileHash: string;
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function nonEmptyIdentity(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RangeError(`${name} cannot be empty`);
  }
  return value;
}

/**
 * Build the scientific state/projection pair at one composition boundary.
 * The projection receives the same authoritative source identity that is
 * exposed on the frame, so render callers do not invent a second identity.
 */
export function projectScientificFrame(
  scientificState: ScientificState,
  input: ScientificFrameInput,
): ScientificFrame {
  if (!Number.isInteger(input.sequence) || input.sequence < 0) {
    throw new RangeError("scientific frame sequence must be a non-negative integer");
  }
  const sourceStateHash = nonEmptyIdentity(input.sourceStateHash, "scientific frame source state hash");
  const volumeProfileHash = nonEmptyIdentity(
    input.volumeProfileHash,
    "scientific frame volume profile hash",
  );
  const frozenState = deepFreeze(
    parseScientificState(serializeScientificState(scientificState)),
  );
  const physical = Object.freeze({
    liquidVolume: input.liquidVolume,
    volumeProfileHash,
  });
  const projection = projectScientificState(frozenState, {
    sourceStateHash,
    liquidVolume: physical.liquidVolume,
  });
  return deepFreeze({
    sourceStateHash: projection.sourceStateHash,
    sequence: input.sequence,
    scientificState: frozenState,
    physical,
    projection,
  });
}
