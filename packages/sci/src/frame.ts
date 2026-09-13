import { type Litre, type ScientificState } from "@chemrealm/schema";
import {
  projectScientificState,
  type ScientificProjection,
} from "./projection.js";

export interface ScientificFrame {
  readonly sourceStateHash: string;
  readonly scientificState: ScientificState;
  readonly projection: ScientificProjection;
}

export interface ScientificFrameInput {
  readonly sourceStateHash: string;
  readonly liquidVolume: Litre;
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
  const projection = projectScientificState(scientificState, input);
  return Object.freeze({
    sourceStateHash: projection.sourceStateHash,
    scientificState,
    projection,
  });
}
