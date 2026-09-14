import {
  activityCoefficient,
  fromCelsius,
  ionicStrengthMolal,
  reducedMolality,
  thermodynamicConstant,
  IndicatorMultiformObservationSchema,
  parseIndicatorMultiformObservation,
  VERSION_MANIFEST,
  mol,
  type Activity,
  type ActivityCoefficient,
  type Kilogram,
  type IndicatorMultiformObservation,
  type Mol,
  type ModelDescriptor,
  type ReducedMolality,
  type SolverConfig,
  type ThermodynamicConstant,
} from "@chemrealm/schema";
import { INDICATOR_MULTIFORM_CONTRACT } from "../generated/indicator-multiform-contract.js";

import {
  ACID_BASE_MAX_IONIC_STRENGTH,
  DEFAULT_ACID_BASE_CONSTANTS,
} from "./model.js";
import { ACID_BASE_COMPONENT_CATALOG } from "./catalog.js";

const MULTIFORM_VERSION = VERSION_MANIFEST.scientific.indicatorMultiform;

export const PHENOLPHTHALEIN_MULTIFORM_MODEL_ID = MULTIFORM_VERSION.id;
export const PHENOLPHTHALEIN_MULTIFORM_MODEL_VERSION = MULTIFORM_VERSION.version;

export const PHENOLPHTHALEIN_FORM_IDS = [
  "neutral-lactone",
  "intermediate-monoanion",
  "quinoid-base",
] as const;

export type PhenolphthaleinOrdinaryFormId =
  (typeof PHENOLPHTHALEIN_FORM_IDS)[number];

/** Constants for the ordinary aqueous H₂In/HIn⁻/In²⁻ network. */
export interface DiproticIndicatorConstants {
  readonly Ka_In_1: ThermodynamicConstant;
  readonly Ka_In_2: ThermodynamicConstant;
  /** Explicit neutral-form activity coefficient; never borrowed from HOAc. */
  readonly neutralIndicatorActivityCoefficient: ActivityCoefficient;
}

/**
 * Tamura et al. report pK₁=9.05 and pK₂=9.50 for phenolphthalein in aqueous
 * phosphate buffers. These are the source-backed values used by this
 * candidate; the conversion is recorded in the accompanying provenance
 * packet, not inferred from the legacy monoprotic KaIn.
 */
export const DEFAULT_PHENOLPHTHALEIN_MULTIFORM_CONSTANTS: DiproticIndicatorConstants =
  Object.freeze({
    Ka_In_1: Object.freeze(
      thermodynamicConstant(INDICATOR_MULTIFORM_CONTRACT.constants.Ka_In_1),
    ),
    Ka_In_2: Object.freeze(
      thermodynamicConstant(INDICATOR_MULTIFORM_CONTRACT.constants.Ka_In_2),
    ),
    neutralIndicatorActivityCoefficient: Object.freeze(
      activityCoefficient(
        INDICATOR_MULTIFORM_CONTRACT.constants.neutralIndicatorActivityCoefficient,
      ),
    ),
  });

export interface DiproticIndicatorActivityInput {
  readonly constants: DiproticIndicatorConstants;
  readonly hydrogenActivity: Activity;
  readonly monovalentAnionActivityCoefficient: ActivityCoefficient;
  readonly divalentAnionActivityCoefficient: ActivityCoefficient;
}

export interface DiproticIndicatorFractions {
  readonly neutralLactone: number;
  readonly intermediateMonoanion: number;
  readonly quinoidBase: number;
}

export interface DiproticIndicatorReducedForms extends DiproticIndicatorFractions {
  readonly neutralLactoneMolality: ReducedMolality;
  readonly intermediateMonoanionMolality: ReducedMolality;
  readonly quinoidBaseMolality: ReducedMolality;
}

export interface PhenolphthaleinMultiformWorldInput {
  readonly waterMass: Kilogram;
  readonly componentAmounts: readonly {
    readonly componentId: string;
    readonly amount: Mol;
  }[];
  readonly indicatorAmounts: readonly {
    readonly indicatorId: string;
    readonly amount: Mol;
  }[];
}

export interface PhenolphthaleinMultiformRequest {
  readonly sourceReplayHash: string;
  readonly totalAmount: Mol;
  readonly totals: {
    readonly strongAcidChlorideMolality: ReducedMolality;
    readonly strongBaseSodiumMolality: ReducedMolality;
    readonly totalAcidFamilyMolality: ReducedMolality;
  };
  readonly indicatorTotalMolality: ReducedMolality;
}

type OrdinaryPhenolphthaleinObservation = Extract<
  IndicatorMultiformObservation,
  { readonly status: "CHEMICAL_FORMS_OK" }
>;

function positive(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be finite and positive`);
  }
  return value;
}

function nonNegative(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be finite and non-negative`);
  }
  return value;
}

/**
 * Convert committed world inventory into the candidate model's reduced input.
 * Component contribution semantics remain in the Scientific Core catalog;
 * the composition root supplies only canonical quantities and source identity.
 */
export function buildPhenolphthaleinMultiformRequest(
  input: PhenolphthaleinMultiformWorldInput,
  sourceReplayHash: string,
): PhenolphthaleinMultiformRequest {
  const waterMass = positive(input.waterMass, "world water mass");
  if (sourceReplayHash.trim().length === 0) {
    throw new RangeError("source replay hash must be non-empty");
  }
  const totals = {
    strongAcidChlorideMolality: 0,
    strongBaseSodiumMolality: 0,
    totalAcidFamilyMolality: 0,
  };
  for (const component of input.componentAmounts) {
    const entry = ACID_BASE_COMPONENT_CATALOG.get(component.componentId as never);
    if (entry === undefined) {
      throw new RangeError(`candidate component is outside the acid-base catalog: ${component.componentId}`);
    }
    const molality = nonNegative(component.amount, `${component.componentId} amount`) / waterMass;
    for (const contribution of entry.contributes) {
      if (contribution === "strongAcidChloride") {
        totals.strongAcidChlorideMolality += molality;
      }
      if (contribution === "strongBaseSodium") {
        totals.strongBaseSodiumMolality += molality;
      }
      if (contribution === "acidFamily") {
        totals.totalAcidFamilyMolality += molality;
      }
    }
  }
  const indicatorIds = new Set(input.indicatorAmounts.map((indicator) => indicator.indicatorId));
  if (indicatorIds.size !== input.indicatorAmounts.length) {
    throw new RangeError("candidate indicator inventory contains duplicate IDs");
  }
  const indicator = input.indicatorAmounts.find(
    (candidate) => candidate.indicatorId === "phenolphthalein",
  );
  if (indicator === undefined) {
    throw new RangeError("phenolphthalein inventory is missing");
  }
  const totalAmount = positive(indicator.amount, "phenolphthalein dose");
  return Object.freeze({
    sourceReplayHash,
    totalAmount: mol(totalAmount),
    totals: Object.freeze({
      strongAcidChlorideMolality: reducedMolality(totals.strongAcidChlorideMolality),
      strongBaseSodiumMolality: reducedMolality(totals.strongBaseSodiumMolality),
      totalAcidFamilyMolality: reducedMolality(totals.totalAcidFamilyMolality),
    }),
    indicatorTotalMolality: reducedMolality(totalAmount / waterMass),
  });
}

function validateConstants(constants: DiproticIndicatorConstants): void {
  positive(constants.Ka_In_1.value, "Ka_In_1");
  positive(constants.Ka_In_2.value, "Ka_In_2");
  positive(
    constants.neutralIndicatorActivityCoefficient.value,
    "neutral indicator activity coefficient",
  );
}

/**
 * Calculate the ordinary three-form distribution from activities.
 *
 * The ratios follow the activity equations directly:
 *   Ka₁ = aH a(HIn⁻) / a(H₂In)
 *   Ka₂ = aH a(In²⁻) / a(HIn⁻)
 */
export function calculateDiproticIndicatorFractions(
  input: DiproticIndicatorActivityInput,
): DiproticIndicatorFractions {
  validateConstants(input.constants);
  const hydrogen = positive(input.hydrogenActivity.value, "hydrogen activity");
  const monoGamma = positive(
    input.monovalentAnionActivityCoefficient.value,
    "monovalent indicator activity coefficient",
  );
  const diGamma = positive(
    input.divalentAnionActivityCoefficient.value,
    "divalent indicator activity coefficient",
  );

  const monoanionToNeutral =
    input.constants.Ka_In_1.value *
    input.constants.neutralIndicatorActivityCoefficient.value /
    (hydrogen * monoGamma);
  const dianionToMonoanion =
    input.constants.Ka_In_2.value * monoGamma /
    (hydrogen * diGamma);
  const dianionToNeutral = monoanionToNeutral * dianionToMonoanion;
  const denominator = 1 + monoanionToNeutral + dianionToNeutral;
  if (!Number.isFinite(denominator) || denominator <= 0) {
    throw new RangeError("diprotic indicator fraction denominator is not finite");
  }

  const fractions = {
    neutralLactone: 1 / denominator,
    intermediateMonoanion: monoanionToNeutral / denominator,
    quinoidBase: dianionToNeutral / denominator,
  };
  const sum =
    fractions.neutralLactone +
    fractions.intermediateMonoanion +
    fractions.quinoidBase;
  if (!Number.isFinite(sum) || Math.abs(sum - 1) > 1e-12) {
    throw new RangeError("diprotic indicator fractions do not sum to one");
  }
  return Object.freeze(fractions);
}

export function calculateDiproticIndicatorForms(
  totalMolality: ReducedMolality,
  input: DiproticIndicatorActivityInput,
): DiproticIndicatorReducedForms {
  const total = nonNegative(totalMolality.value, "total indicator molality");
  const fractions = calculateDiproticIndicatorFractions(input);
  return Object.freeze({
    ...fractions,
    neutralLactoneMolality: Object.freeze(
      reducedMolality(total * fractions.neutralLactone),
    ),
    intermediateMonoanionMolality: Object.freeze(
      reducedMolality(total * fractions.intermediateMonoanion),
    ),
    quinoidBaseMolality: Object.freeze(
      reducedMolality(total * fractions.quinoidBase),
    ),
  });
}

/**
 * Convert solved ordinary forms into the schema-owned candidate observation.
 * The positive-dose check prevents a mathematically normalised zero inventory
 * from being misreported as a measured chemical distribution.
 */
export function buildPhenolphthaleinMultiformObservation(
  totalAmount: Mol,
  forms: DiproticIndicatorFractions,
  sourceReplayHash: string,
): OrdinaryPhenolphthaleinObservation {
  positive(totalAmount, "indicator dose");
  if (sourceReplayHash.trim().length === 0) {
    throw new RangeError("source replay hash must be non-empty");
  }
  const dto = IndicatorMultiformObservationSchema.parse({
    status: "CHEMICAL_FORMS_OK",
    indicatorId: "phenolphthalein",
    totalAmount: { value: totalAmount, unit: "mol" },
    forms: [
      { formId: "neutral-lactone", fraction: forms.neutralLactone },
      {
        formId: "intermediate-monoanion",
        fraction: forms.intermediateMonoanion,
      },
      { formId: "quinoid-base", fraction: forms.quinoidBase },
    ],
    modelId: PHENOLPHTHALEIN_MULTIFORM_MODEL_ID,
    modelVersion: PHENOLPHTHALEIN_MULTIFORM_MODEL_VERSION,
    sourceReplayHash,
  });
  return parseIndicatorMultiformObservation(dto) as OrdinaryPhenolphthaleinObservation;
}

export type UnsupportedPhenolphthaleinRegime =
  | "strong-acid-cation"
  | "strong-base-altered";

/** Refusal-only boundary for the explicitly unimplemented regimes. */
export function refuseUnsupportedPhenolphthaleinRegime(
  regime: UnsupportedPhenolphthaleinRegime,
  totalAmount: Mol | undefined,
  sourceReplayHash: string,
): IndicatorMultiformObservation {
  const name = regime === "strong-acid-cation"
    ? "strong-acid cation chemistry"
    : "strong-base altered chemistry";
  return {
    status: "CHEMICAL_FORMS_UNAVAILABLE",
    indicatorId: "phenolphthalein",
    ...(totalAmount === undefined ? {} : { totalAmount }),
    reasonCode: "FORM_OUT_OF_DOMAIN",
    reason: `${name} is documented but not implemented by the ordinary aqueous model`,
    modelId: PHENOLPHTHALEIN_MULTIFORM_MODEL_ID,
    modelVersion: PHENOLPHTHALEIN_MULTIFORM_MODEL_VERSION,
    sourceReplayHash,
  };
}

/** Refusal boundary for an ordinary case whose required source data is absent. */
export function refuseMissingPhenolphthaleinFormData(
  totalAmount: Mol | undefined,
  sourceReplayHash: string,
): IndicatorMultiformObservation {
  const dto = IndicatorMultiformObservationSchema.parse({
    status: "CHEMICAL_FORMS_UNAVAILABLE",
    indicatorId: "phenolphthalein",
    ...(totalAmount === undefined
      ? {}
      : { totalAmount: { value: totalAmount, unit: "mol" } }),
    reasonCode: "FORM_DATA_MISSING",
    reason: "ordinary phenolphthalein form constants or provenance are unavailable",
    modelId: PHENOLPHTHALEIN_MULTIFORM_MODEL_ID,
    modelVersion: PHENOLPHTHALEIN_MULTIFORM_MODEL_VERSION,
    sourceReplayHash,
  });
  return parseIndicatorMultiformObservation(dto);
}

export function buildPhenolphthaleinMultiformModelDescriptor(): ModelDescriptor {
  return Object.freeze({
    id: PHENOLPHTHALEIN_MULTIFORM_MODEL_ID,
    version: PHENOLPHTHALEIN_MULTIFORM_MODEL_VERSION,
    description:
      "Ordinary-aqueous diprotic phenolphthalein H2In/HIn-/In2- equilibrium with Davies activities at 25 °C; strong-acid cation and strong-base altered regimes refuse.",
    validity: Object.freeze({
      temperature: Object.freeze({
        min: fromCelsius(25),
        max: fromCelsius(25),
      }),
      ionicStrengthMolalMax: ionicStrengthMolal(ACID_BASE_MAX_IONIC_STRENGTH),
      species: Object.freeze([
        "H2O",
        "H+",
        "OH-",
        "HOAc",
        "OAc-",
        "Na+",
        "Cl-",
        "H2In",
        "HIn-",
        "In2-",
      ]),
      components: Object.freeze(["HCl", "NaOH", "HOAc", "NaOAc"]),
      solvent: "water",
      phase: "aqueous",
      activityCorrected: true,
    }),
  });
}

export function buildPhenolphthaleinMultiformSolverConfig(): SolverConfig {
  return Object.freeze({
    id: PHENOLPHTHALEIN_MULTIFORM_MODEL_ID,
    version: PHENOLPHTHALEIN_MULTIFORM_MODEL_VERSION,
    parameters: Object.freeze({
      Kw: DEFAULT_ACID_BASE_CONSTANTS.Kw.value,
      Ka_HOAc: DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc.value,
      Ka_In_1: DEFAULT_PHENOLPHTHALEIN_MULTIFORM_CONSTANTS.Ka_In_1.value,
      Ka_In_2: DEFAULT_PHENOLPHTHALEIN_MULTIFORM_CONSTANTS.Ka_In_2.value,
      Davies_A: DEFAULT_ACID_BASE_CONSTANTS.daviesA,
      Davies_b: DEFAULT_ACID_BASE_CONSTANTS.daviesB,
      standardMolality: DEFAULT_ACID_BASE_CONSTANTS.standardMolality,
      neutralAcidActivityCoefficient:
        DEFAULT_ACID_BASE_CONSTANTS.neutralAcidActivityCoefficient.value,
      neutralIndicatorActivityCoefficient:
        DEFAULT_PHENOLPHTHALEIN_MULTIFORM_CONSTANTS.neutralIndicatorActivityCoefficient.value,
      waterActivity: DEFAULT_ACID_BASE_CONSTANTS.waterActivity.value,
      numericPolicyVersion: VERSION_MANIFEST.scientific.numericPolicyVersion,
    }),
  });
}

/** Decode the candidate's constants from its identity-bearing config. */
export function diproticIndicatorConstantsFromSolverConfig(
  config: SolverConfig,
): DiproticIndicatorConstants {
  if (
    config.id !== PHENOLPHTHALEIN_MULTIFORM_MODEL_ID ||
    config.version !== PHENOLPHTHALEIN_MULTIFORM_MODEL_VERSION
  ) {
    throw new RangeError("solver config identity does not belong to the multiform indicator model");
  }
  const ka1 = config.parameters.Ka_In_1;
  const ka2 = config.parameters.Ka_In_2;
  const neutralGamma = config.parameters.neutralIndicatorActivityCoefficient;
  if (
    typeof ka1 !== "number" ||
    typeof ka2 !== "number" ||
    typeof neutralGamma !== "number"
  ) {
    throw new RangeError("multiform indicator constants are missing from solver config");
  }
  const constants = {
    Ka_In_1: thermodynamicConstant(ka1),
    Ka_In_2: thermodynamicConstant(ka2),
    neutralIndicatorActivityCoefficient: activityCoefficient(neutralGamma),
  };
  validateConstants(constants);
  return Object.freeze(constants);
}
