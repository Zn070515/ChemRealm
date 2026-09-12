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
} from "@chemrealm/schema";

export const ACID_BASE_MODEL_ID = "acidbase-monoprotic-davies" as const;
export const ACID_BASE_MODEL_VERSION = "1.0.0" as const;

export interface AcidBaseConstants {
  readonly Kw: ThermodynamicConstant;
  readonly Ka_HOAc: ThermodynamicConstant;
  readonly daviesA: number;
  readonly daviesB: number;
  readonly standardMolality: MolPerKilogram;
  readonly neutralAcidActivityCoefficient: ActivityCoefficient;
  /** Explicit v0 unit-water-activity approximation used by Kw. */
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
      ionicStrengthMolalMax: ionicStrengthMolal(0.5),
      species: Object.freeze(["HCl", "NaOH", "HOAc", "NaOAc"]),
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
      numericPolicyVersion: 1,
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
