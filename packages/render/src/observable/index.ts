import {
  type Litre,
  type ScientificExpression,
  type ScientificState,
  type TeachingHydrogenIonExponent,
} from "@chemrealm/schema";
import {
  deriveBuretteState,
  type BuretteInput,
  type BuretteState,
} from "./burette.js";
import { mapIndicatorRatioToColor, type IndicatorColour } from "./color.js";
import { buildCurve, type CurveFrame, type CurvePoint } from "./curve.js";
import { formatModelPh, formatTaughtPh } from "./format.js";
import { deriveLiquidLevel, type LiquidLevel, type VolumeProfile } from "./level.js";
import { speciesRows, type SpeciesRow } from "./species.js";
import {
  presentSymbolicLines,
  type PresentedScientificExpression,
} from "./symbolic.js";

export const OBSERVABLE_MODEL_VERSION = 1;

export interface ScientificProjectionReadout {
  readonly sourceStateHash: string;
  readonly taughtHydrogenIonExponent: TeachingHydrogenIonExponent;
}

export interface ScientificFrame {
  readonly sourceStateHash: string;
  readonly sequence: number;
  readonly scientificState: ScientificState;
  readonly physical: {
    readonly liquidVolume: Litre;
    readonly volumeProfileHash: string;
  };
  readonly projection: ScientificProjectionReadout;
}

export interface ObservableInput {
  readonly frame: ScientificFrame;
  readonly volumeProfile: VolumeProfile;
  readonly burette?: BuretteInput;
  readonly curveFrames?: readonly CurveFrame[];
  readonly symbolicLines?: readonly ScientificExpression[];
}

export interface ObservableIndicator {
  readonly indicatorId: string;
  readonly protonationRatio: number;
  readonly color: IndicatorColour;
}

export interface ObservableReadouts {
  readonly taughtPh: string;
  readonly modelPh: string;
  readonly activityModel: string;
  readonly withinProposedAccuracyEnvelope: boolean;
}

export interface ObservableModel {
  readonly version: typeof OBSERVABLE_MODEL_VERSION;
  readonly indicators: readonly ObservableIndicator[];
  readonly liquidLevel: LiquidLevel;
  readonly sourceStateHash: string;
  readonly burette: BuretteState | undefined;
  readonly curve: readonly CurvePoint[];
  readonly species: readonly SpeciesRow[];
  readonly symbolicLines: readonly PresentedScientificExpression[];
  readonly readouts: ObservableReadouts;
}

/**
 * Compose the pure ObservableModel from scientific outputs and presentation
 * inputs. No solver, world event, or display clock is consulted here.
 */
export function buildObservableModel(input: ObservableInput): ObservableModel {
  if (
    !Number.isInteger(input.frame.sequence) ||
    input.frame.sequence < 0
  ) {
    throw new RangeError("scientific frame sequence must be a non-negative integer");
  }
  if (
    typeof input.frame.sourceStateHash !== "string" ||
    input.frame.sourceStateHash.trim().length === 0
  ) {
    throw new RangeError("scientific frame source state hash cannot be empty");
  }
  if (input.frame.projection.sourceStateHash !== input.frame.sourceStateHash) {
    throw new RangeError("scientific state and projection source identities differ");
  }
  if (
    typeof input.frame.physical.volumeProfileHash !== "string" ||
    input.volumeProfile.profileHash !== input.frame.physical.volumeProfileHash
  ) {
    throw new RangeError("volume profile does not belong to the scientific frame");
  }

  const scientificState = input.frame.scientificState;
  const indicatorIds = new Set<string>();
  const indicators = scientificState.indicators.map((indicator) => {
    if (indicator.indicatorId.trim().length === 0 || indicatorIds.has(indicator.indicatorId)) {
      throw new RangeError(`duplicate or empty indicator id: ${indicator.indicatorId}`);
    }
    indicatorIds.add(indicator.indicatorId);
    return Object.freeze({
      indicatorId: indicator.indicatorId,
      protonationRatio: indicator.protonationRatio,
      color: mapIndicatorRatioToColor(indicator.indicatorId, indicator.protonationRatio),
    });
  });

  const readouts = Object.freeze({
    taughtPh: formatTaughtPh(input.frame.projection.taughtHydrogenIonExponent),
    modelPh: formatModelPh(
      scientificState.modelPh,
      scientificState.provenance.activityModel,
    ),
    activityModel: scientificState.provenance.activityModel,
    withinProposedAccuracyEnvelope:
      scientificState.validity.withinProposedAccuracyEnvelope,
  });

  return Object.freeze({
    version: OBSERVABLE_MODEL_VERSION,
    sourceStateHash: input.frame.sourceStateHash,
    indicators: Object.freeze(indicators),
    liquidLevel: deriveLiquidLevel(
      input.frame.physical.liquidVolume,
      input.volumeProfile,
    ),
    burette:
      input.burette === undefined ? undefined : deriveBuretteState(input.burette),
    curve: buildCurve(input.curveFrames ?? []),
    species: speciesRows(scientificState),
    symbolicLines: presentSymbolicLines(
      input.symbolicLines ?? [],
      {
        sourceStateHash: input.frame.sourceStateHash,
        modelId: scientificState.provenance.modelId,
        modelVersion: scientificState.provenance.modelVersion,
      },
    ),
    readouts,
  });
}
