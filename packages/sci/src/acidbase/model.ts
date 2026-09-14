import {
  activity,
  activityCoefficient,
  fromCelsius,
  ionicStrengthMolal,
  kelvin,
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
import { NATIVE_MODEL_CONTRACT } from "../generated/native-model-contract.js";

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

export interface NativeModelContract {
  readonly model: ModelDescriptor;
  readonly solverConfig: SolverConfig;
}

function finiteContractNumber(value: number, field: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`native model contract ${field} must be finite`);
  }
  return value;
}

/** Parse the generated view of the language-neutral native model contract. */
export function parseNativeModelContract(): NativeModelContract {
  const contract = NATIVE_MODEL_CONTRACT;
  const expectedId = VERSION_MANIFEST.scientific.acidBase.id;
  const expectedVersion = VERSION_MANIFEST.scientific.acidBase.nativeVersion;
  if (
    contract.model.id !== expectedId ||
    contract.model.version !== expectedVersion ||
    contract.solverConfig.id !== expectedId ||
    contract.solverConfig.version !== expectedVersion
  ) {
    throw new RangeError("native model contract identity does not match the central version manifest");
  }

  const model: ModelDescriptor = Object.freeze({
    id: contract.model.id,
    version: contract.model.version,
    description: contract.model.description,
    validity: Object.freeze({
      temperature: Object.freeze({
        min: kelvin(finiteContractNumber(contract.model.validity.temperature.min.value, "model.validity.temperature.min")),
        max: kelvin(finiteContractNumber(contract.model.validity.temperature.max.value, "model.validity.temperature.max")),
      }),
      ionicStrengthMolalMax: ionicStrengthMolal(
        finiteContractNumber(contract.model.validity.ionicStrengthMolalMax.value, "model.validity.ionicStrengthMolalMax"),
      ),
      species: Object.freeze([...contract.model.validity.species]),
      components: Object.freeze([...contract.model.validity.components]),
      solvent: contract.model.validity.solvent,
      phase: contract.model.validity.phase,
      activityCorrected: contract.model.validity.activityCorrected,
    }),
  });
  const parameters = Object.fromEntries(
    Object.entries(contract.solverConfig.parameters).map(([key, value]) => [
      key,
      finiteContractNumber(value, `solverConfig.parameters.${key}`),
    ]),
  );
  const solverConfig: SolverConfig = Object.freeze({
    id: contract.solverConfig.id,
    version: contract.solverConfig.version,
    parameters: Object.freeze(parameters),
  });
  return Object.freeze({ model, solverConfig });
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
  if (
    config.id !== ACID_BASE_MODEL_ID ||
    (config.version !== VERSION_MANIFEST.scientific.acidBase.legacyVersion &&
      config.version !== VERSION_MANIFEST.scientific.acidBase.nativeVersion)
  ) {
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
