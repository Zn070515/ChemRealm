import {
  type Litre,
  type ScientificState,
  type TeachingHydrogenIonExponent,
} from "@chemrealm/schema";
import {
  deriveBuretteReading,
  type BuretteInput,
} from "./burette.js";
import { mapIndicatorRatioToColor, type IndicatorColour } from "./color.js";
import { buildCurve, type CurveFrame, type CurvePoint } from "./curve.js";
import { formatModelPh, formatTaughtPh } from "./format.js";
import { deriveLiquidLevel, type LiquidLevel, type VolumeProfile } from "./level.js";
import { speciesRows, type SpeciesRow } from "./species.js";
import { presentSymbolicLines, type SymbolicLine } from "./symbolic.js";

export const OBSERVABLE_MODEL_VERSION = 1;

export interface ScientificProjectionReadout {
  readonly taughtHydrogenIonExponent: TeachingHydrogenIonExponent;
}

export interface ObservableInput {
  readonly scientificState: ScientificState;
  readonly projection: ScientificProjectionReadout;
  readonly liquidVolume: Litre;
  readonly volumeProfile: VolumeProfile;
  readonly burette?: BuretteInput;
  readonly curveFrames?: readonly CurveFrame[];
  readonly symbolicLines?: readonly SymbolicLine[];
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
  readonly buretteReading: Litre | undefined;
  readonly curve: readonly CurvePoint[];
  readonly species: readonly SpeciesRow[];
  readonly symbolicLines: readonly SymbolicLine[];
  readonly readouts: ObservableReadouts;
}

/**
 * Compose the pure ObservableModel from scientific outputs and presentation
 * inputs. No solver, world event, or display clock is consulted here.
 */
export function buildObservableModel(input: ObservableInput): ObservableModel {
  const indicatorIds = new Set<string>();
  const indicators = input.scientificState.indicators.map((indicator) => {
    if (indicator.indicatorId.trim().length === 0 || indicatorIds.has(indicator.indicatorId)) {
      throw new RangeError(`duplicate or empty indicator id: ${indicator.indicatorId}`);
    }
    indicatorIds.add(indicator.indicatorId);
    return Object.freeze({
      indicatorId: indicator.indicatorId,
      protonationRatio: indicator.protonationRatio,
      color: mapIndicatorRatioToColor(indicator.protonationRatio),
    });
  });

  const readouts = Object.freeze({
    taughtPh: formatTaughtPh(input.projection.taughtHydrogenIonExponent),
    modelPh: formatModelPh(
      input.scientificState.modelPh,
      input.scientificState.provenance.activityModel,
    ),
    activityModel: input.scientificState.provenance.activityModel,
    withinProposedAccuracyEnvelope:
      input.scientificState.validity.withinProposedAccuracyEnvelope,
  });

  return Object.freeze({
    version: OBSERVABLE_MODEL_VERSION,
    indicators: Object.freeze(indicators),
    liquidLevel: deriveLiquidLevel(input.liquidVolume, input.volumeProfile),
    buretteReading:
      input.burette === undefined ? undefined : deriveBuretteReading(input.burette),
    curve: buildCurve(input.curveFrames ?? []),
    species: speciesRows(input.scientificState),
    symbolicLines: presentSymbolicLines(input.symbolicLines ?? []),
    readouts,
  });
}
