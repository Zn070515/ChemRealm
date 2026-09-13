import {
  activity,
  activityCoefficient,
  fromCelsius,
  ionicStrengthMolal,
  molPerKilogram,
  thermodynamicConstant,
  type ActivityCoefficient,
  type Activity,
  type ModelDescriptor,
  type MolPerKilogram,
  type SolverConfig,
  type ThermodynamicConstant,
  VERSION_MANIFEST,
} from "@chemrealm/schema";

const ACID_BASE_VERSION = VERSION_MANIFEST.scientific.acidBase;
export const ACID_BASE_MODEL_ID = ACID_BASE_VERSION.id;
export const ACID_BASE_MODEL_VERSION = ACID_BASE_VERSION.legacyVersion;

/** Analytical component-total molality bounds for the v0 model. */
export const ACID_BASE_MIN_TOTAL_SOLUTE_MOLALITY = 1e-9;
export const ACID_BASE_MAX_TOTAL_SOLUTE_MOLALITY = 0.5;
export const ACID_BASE_MAX_IONIC_STRENGTH = 0.5;

export interface AcidBaseConstants {
  readonly Kw: ThermodynamicConstant;
  readonly Ka_HOAc: ThermodynamicConstant;
  readonly daviesA: number;
  readonly daviesB: number;
  readonly standardMolality: MolPerKilogram;
  readonly neutralAcidActivityCoefficient: ActivityCoefficient;
  /** Explicit v0 unit-water-activity convention carried in model identity. */
  readonly waterActivity: Activity;
  readonly waterActivityConvention: "unit";
}

function freezeQuantity<T>(value: T): T {
  return Object.freeze(value) as T;
}

export const DEFAULT_ACID_BASE_CONSTANTS: AcidBaseConstants = Object.freeze({
  Kw: freezeQuantity(thermodynamicConstant(1e-14)),
  Ka_HOAc: freezeQuantity(thermodynamicConstant(1.7539e-5)),
  daviesA: 0.509,
  daviesB: 0.3,
  standardMolality: freezeQuantity(molPerKilogram(1)),
  neutralAcidActivityCoefficient: freezeQuantity(activityCoefficient(1)),
  waterActivity: freezeQuantity(activity(1)),
  waterActivityConvention: "unit",
});

function parameter(config: SolverConfig, name: string): number {
  const value = config.parameters[name];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RangeError(`acid-base solver config parameter ${name} must be finite`);
  }
  return value;
}

/** Decode the frozen persisted config used by the production adapter. */
export function acidBaseConstantsFromSolverConfig(
  config: SolverConfig,
): AcidBaseConstants {
  if (config.id !== ACID_BASE_MODEL_ID || config.version !== ACID_BASE_MODEL_VERSION) {
    throw new RangeError("solver config identity does not belong to the acid-base model");
  }
  const waterActivity = parameter(config, "waterActivity");
  if (waterActivity <= 0) throw new RangeError("waterActivity must be positive");
  return Object.freeze({
    Kw: freezeQuantity(thermodynamicConstant(parameter(config, "Kw"))),
    Ka_HOAc: freezeQuantity(thermodynamicConstant(parameter(config, "Ka_HOAc"))),
    daviesA: parameter(config, "Davies_A"),
    daviesB: parameter(config, "Davies_b"),
    standardMolality: freezeQuantity(
      molPerKilogram(parameter(config, "standardMolality")),
    ),
    neutralAcidActivityCoefficient: freezeQuantity(
      activityCoefficient(parameter(config, "neutralAcidActivityCoefficient")),
    ),
    waterActivity: freezeQuantity(activity(waterActivity)),
    waterActivityConvention: "unit",
  });
}

export function buildAcidBaseModelDescriptor(): ModelDescriptor {
  return Object.freeze({
    id: ACID_BASE_MODEL_ID,
    version: ACID_BASE_MODEL_VERSION,
    description:
      "Self-consistent monoprotic aqueous acid-base equilibrium with Davies activity coefficients at 25 °C.",
    validity: Object.freeze({
      temperature: Object.freeze({
        min: fromCelsius(25),
        max: fromCelsius(25),
      }),
      ionicStrengthMolalMax: ionicStrengthMolal(ACID_BASE_MAX_IONIC_STRENGTH),
      species: Object.freeze(["H2O", "H+", "OH-", "HOAc", "OAc-", "Na+", "Cl-"]),
      components: Object.freeze(["HCl", "NaOH", "HOAc", "NaOAc"]),
      solvent: "water",
      phase: "aqueous",
      activityCorrected: true,
    }),
  });
}

export function buildAcidBaseSolverConfig(): SolverConfig {
  return Object.freeze({
    id: ACID_BASE_MODEL_ID,
    version: ACID_BASE_MODEL_VERSION,
    parameters: Object.freeze({
      Kw: DEFAULT_ACID_BASE_CONSTANTS.Kw.value,
      Ka_HOAc: DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc.value,
      Davies_A: DEFAULT_ACID_BASE_CONSTANTS.daviesA,
      Davies_b: DEFAULT_ACID_BASE_CONSTANTS.daviesB,
      standardMolality: DEFAULT_ACID_BASE_CONSTANTS.standardMolality,
      neutralAcidActivityCoefficient:
        DEFAULT_ACID_BASE_CONSTANTS.neutralAcidActivityCoefficient.value,
      waterActivity: DEFAULT_ACID_BASE_CONSTANTS.waterActivity.value,
      numericPrecisionSignificantDigits: 12,
      numericPolicyVersion: VERSION_MANIFEST.scientific.numericPolicyVersion,
    }),
  });
}

export const ACID_BASE_COMPONENT_IDS = Object.freeze([
  "HCl",
  "NaOH",
  "HOAc",
  "NaOAc",
] as const);

export type AcidBaseComponentId = (typeof ACID_BASE_COMPONENT_IDS)[number];
