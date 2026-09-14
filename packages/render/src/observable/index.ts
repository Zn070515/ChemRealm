import {
  type Litre,
  type IndicatorOpticalObservation,
  type FrozenOpticalPathSnapshot,
  type Kelvin,
  type OpticalProfileSnapshot,
  type ScientificExpression,
  type ScientificState,
  type TeachingHydrogenIonExponent,
  type VolumeProfileSnapshot,
  VERSION_MANIFEST,
} from "@chemrealm/schema";
import {
  deriveBuretteState,
  type BuretteInput,
  type BuretteState,
} from "./burette.js";
import { buildCurve, type CurveFrame, type CurvePoint } from "./curve.js";
import {
  formatMolarConcentration,
  formatModelPh,
  formatTaughtPh,
} from "./format.js";
import {
  deriveLiquidLevel,
  volumeProfileFromSnapshot,
  type LiquidLevel,
} from "./level.js";
import { observeIndicatorOptics } from "./optics.js";
import { speciesRows, type SpeciesRow } from "./species.js";
import {
  presentSymbolicLines,
  type PresentedScientificExpression,
} from "./symbolic.js";
export {
  ORDINARY_PHENOLPHTHALEIN_OPTICAL_PROFILE,
} from "./production-optical-profile.js";

export const OBSERVABLE_MODEL_VERSION = VERSION_MANIFEST.representation.observableModel;

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
    readonly temperature: Kelvin;
    readonly solvent: string;
    readonly optical: {
      readonly path: FrozenOpticalPathSnapshot | undefined;
      readonly profiles: readonly OpticalProfileSnapshot[];
    };
  };
  readonly projection: ScientificProjectionReadout;
}

export interface ObservableInput {
  readonly frame: ScientificFrame;
  /** Replay-frozen data; executable profile functions are created internally. */
  readonly volumeProfileSnapshot: VolumeProfileSnapshot;
  readonly burette?: BuretteInput;
  readonly curveFrames?: readonly CurveFrame[];
  readonly symbolicLines?: readonly ScientificExpression[];
}

export interface ObservableIndicator {
  readonly indicatorId: string;
  readonly opticalObservation: IndicatorOpticalObservation;
  readonly opticalContext: {
    readonly totalAmountMol: number | undefined;
    readonly concentrationMolPerLitre: number | undefined;
    readonly concentrationMolPerLitreText: string | undefined;
    readonly pathLengthMillimetres: number | undefined;
    readonly profileId: string | undefined;
    readonly profileHash: string | undefined;
  };
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

function opticalDataMissing(
  indicatorId: string,
  sourceReplayHash: string,
  reason: string,
): IndicatorOpticalObservation {
  return {
    status: "OPTICAL_MODEL_DATA_MISSING",
    indicatorId,
    reason,
    sourceReplayHash,
    missingOrOutOfRange: [reason],
  };
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
    input.volumeProfileSnapshot.profileHash !== input.frame.physical.volumeProfileHash
  ) {
    throw new RangeError("volume profile does not belong to the scientific frame");
  }
  const volumeProfile = volumeProfileFromSnapshot(input.volumeProfileSnapshot);

  if (input.burette !== undefined) {
    if (input.burette.sourceStateHash !== input.frame.sourceStateHash) {
      throw new RangeError("burette does not belong to the scientific frame");
    }
    if (input.burette.sequence !== input.frame.sequence) {
      throw new RangeError("burette sequence does not belong to the scientific frame");
    }
  }

  const scientificState = input.frame.scientificState;
  const chemicalObservations = new Map(
    scientificState.indicatorObservations.map((observation) => [
      observation.indicatorId,
      observation,
    ] as const),
  );
  const opticalProfiles = new Map(
    input.frame.physical.optical.profiles.map((profile) => [
      profile.indicatorId,
      profile,
    ] as const),
  );
  const indicatorIds = new Set<string>();
  const indicators = scientificState.indicators.map((indicator) => {
    if (indicator.indicatorId.trim().length === 0 || indicatorIds.has(indicator.indicatorId)) {
      throw new RangeError(`duplicate or empty indicator id: ${indicator.indicatorId}`);
    }
    indicatorIds.add(indicator.indicatorId);
    const chemical = chemicalObservations.get(indicator.indicatorId);
    const opticalProfile = opticalProfiles.get(indicator.indicatorId);
    const opticalObservation = chemical === undefined
      ? opticalDataMissing(
        indicator.indicatorId,
        input.frame.sourceStateHash,
        "Scientific Core did not supply an indicator chemical observation",
      )
      : observeIndicatorOptics({
        chemical,
        opticalProfile,
        opticalPath: input.frame.physical.optical.path,
        liquidVolume: input.frame.physical.liquidVolume,
        temperature: input.frame.physical.temperature,
        ionicStrengthMolal: scientificState.ionicStrengthMolal,
        modelPh: scientificState.modelPh,
        solvent: input.frame.physical.solvent,
        sourceReplayHash: input.frame.sourceStateHash,
      });
    return Object.freeze({
      indicatorId: indicator.indicatorId,
      opticalObservation,
      opticalContext: Object.freeze({
        totalAmountMol: chemical?.totalAmount,
        concentrationMolPerLitre:
          chemical?.totalAmount === undefined
            ? undefined
            : chemical.totalAmount / input.frame.physical.liquidVolume,
        concentrationMolPerLitreText:
          chemical?.totalAmount === undefined
            ? undefined
            : formatMolarConcentration(
                chemical.totalAmount / input.frame.physical.liquidVolume,
              ),
        pathLengthMillimetres: input.frame.physical.optical.path?.pathLength.value,
        profileId: opticalProfile?.profileId,
        profileHash: opticalProfile?.profileHash,
      }),
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
      volumeProfile,
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
