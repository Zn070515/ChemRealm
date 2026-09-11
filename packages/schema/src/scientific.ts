/**
 * The Scientific Reality Core's contracts (`ADR-0003`).
 *
 * TWO KINDS OF TYPE LIVE HERE, AND THEY ARE NOT THE SAME
 * -----------------------------------------------------
 * An earlier version made one `z.infer` type serve as both the runtime domain
 * model and the wire format. That is convenient and it is why the entire
 * quantity apparatus was flattened back to `number` at the most important
 * boundary in the project: with `amountMol` and `modelPh` both `number`,
 *
 *     const s: SpeciesState = { ..., amountMol: state.modelPh, ... };
 *
 * typechecks. The compile barrier `units.ts` exists to provide stopped exactly
 * where a mistake would be most expensive.
 *
 *   DTO      `*Schema` + `*Dto`   the wire format. Every quantity is
 *                                 `{ value, unit }` (`ADR-0004` §3).
 *   DOMAIN   `*`                  the runtime model. Every quantity is its
 *                                 opaque or branded type, so it cannot be a
 *                                 bare `number` and cannot be confused with a
 *                                 quantity of another dimension.
 *
 * The bridge is a parse function per contract, and it goes through the
 * constructors — so a value that could not have been constructed cannot enter
 * the domain even if a caller hand-builds a DTO.
 *
 * WHAT THIS CONTAINS, AND WHAT IT MUST NOT
 * ----------------------------------------
 * `ScientificState` holds the scientific core's output: reduced and physical
 * molalities, activity coefficients, activities, both ionic strengths, the
 * activity-based MODEL pH, indicator speciation, validity, and provenance.
 *
 * It does NOT hold molarity, `c(H⁺)`, or the taught `−lg c(H⁺)`. Those need the
 * world's solution volume, which the scientific core does not have; they belong
 * to `ScientificProjection` (`SPEC-0001` §Who owns which quantity).
 *
 * The naming is deliberate: **activity-based model pH**, never "the true pH".
 * IUPAC's pH is a *notional* definition — the activity of a single ion is not
 * independently measurable — so this number is only as good as the activity
 * model named in its provenance.
 */

import { z } from "zod";

import { quantityOfDimension } from "./quantity.js";
import {
  activity,
  activityCoefficient,
  ionicStrengthMolal,
  kelvin,
  kilogram,
  litre,
  molPerKilogram,
  mol,
  ph,
  reducedIonicStrength,
  reducedMolality,
  thermodynamicConstant,
  type Activity,
  type ActivityCoefficient,
  type IonicStrengthMolal,
  type Kelvin,
  type Kilogram,
  type Litre,
  type Mol,
  type MolPerKilogram,
  type Ph,
  type ReducedIonicStrength,
  type ReducedMolality,
  type ThermodynamicConstant,
} from "./units.js";

// ---------------------------------------------------------------------------
// VERSION OF THE SHAPE
// ---------------------------------------------------------------------------

/**
 * Every root contract carries this, because every root contract is emitted as
 * JSON Schema (`json-schema.ts`) and validated by the Python side. A type that
 * crosses a language boundary is not an internal TypeScript type any more, and
 * an unversioned wire format cannot be migrated later without guesswork.
 */
export const SCIENTIFIC_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

/**
 * `GOAL.md` §12's confidence categories. A pedagogical approximation must not
 * be mislabelled as a measured fact, which is why this is required rather than
 * optional.
 */
export const ProvenanceCategorySchema = z.enum([
  "measured",
  "evaluated",
  "calculated",
  "empirical",
  "pedagogicalApproximation",
]);
export type ProvenanceCategory = z.infer<typeof ProvenanceCategorySchema>;

export const ProvenanceSchema = z.strictObject({
  /** e.g. "acidbase-monoprotic-davies". Names the MODEL, not a quality claim. */
  modelId: z.string().min(1),
  modelVersion: z.string().min(1),
  /** The activity model actually used, named. Never left implicit. */
  activityModel: z.string().min(1),
  category: ProvenanceCategorySchema,
  /**
   * Every constant that entered the calculation, so a replay can pin them.
   *
   * A flat bag of numbers, deliberately: these are PINNED VALUES for replay
   * identity, not quantities to compute with, and a replay record has to be
   * byte-stable. Which KIND each constant is (thermodynamic, conditional,
   * empirical) is declared by the model descriptor, not inferred from here —
   * see the note on `SolverConfig.parameters`.
   */
  parameters: z.record(z.string(), z.number()),
  uncertainty: z.string().optional(),
  source: z.string().optional(),
});
export type ProvenanceDto = z.infer<typeof ProvenanceSchema>;
export type Provenance = ProvenanceDto;

/** DTO → domain. A no-op today; present so call sites never change shape. */
export function parseProvenance(dto: ProvenanceDto): Provenance {
  return ProvenanceSchema.parse(dto);
}

// ---------------------------------------------------------------------------
// Model descriptor
// ---------------------------------------------------------------------------

export const ModelDescriptorSchema = z.strictObject({
  id: z.string().min(1),
  version: z.string().min(1),
  /** Free text shown in the model-inspection view. */
  description: z.string(),
  /** The domain the model claims. Outside it, the solver must refuse. */
  validity: z.strictObject({
    temperature: z.strictObject({
      min: quantityOfDimension("temperature"),
      max: quantityOfDimension("temperature"),
    }),
    ionicStrengthMolalMax: quantityOfDimension("molality"),
    species: z.array(z.string()),
    solvent: z.string(),
    phase: z.string(),
  }),
});
export type ModelDescriptorDto = z.infer<typeof ModelDescriptorSchema>;

/** The declared validity envelope, as values the solver can compare against. */
export interface ModelValidity {
  temperature: { min: Kelvin; max: Kelvin };
  ionicStrengthMolalMax: IonicStrengthMolal;
  species: readonly string[];
  solvent: string;
  phase: string;
}

export interface ModelDescriptor {
  id: string;
  version: string;
  description: string;
  validity: ModelValidity;
}

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------

/**
 * One species, in BOTH representations.
 *
 * `reducedMolality` is the algebra's native variable and is dimensionless;
 * `molality` is mol/kg. They are numerically identical at `m° = 1 mol/kg`, and
 * both are carried so the boundary conversion is explicit rather than assumed
 * (`ADR-0007`, `SPEC-0001` AC-U5). The DTO makes the distinction visible in the
 * UNIT — `"1"` versus `"mol/kg"` — which is what `ADR-0004` requires.
 */
export const SpeciesStateSchema = z.strictObject({
  symbol: z.string().min(1),
  /** m̂ = m/m°, dimensionless. */
  reducedMolality: quantityOfDimension("dimensionless"),
  /** m, mol/kg. Equal to `reducedMolality · m°`. */
  molality: quantityOfDimension("molality"),
  amount: quantityOfDimension("amount"),
  activityCoefficient: quantityOfDimension("dimensionless"),
  /** a = γ · m̂, dimensionless. */
  activity: quantityOfDimension("dimensionless"),
});
export type SpeciesStateDto = z.infer<typeof SpeciesStateSchema>;

/** The runtime form. Every field is a type no bare `number` can be assigned to. */
export interface SpeciesState {
  symbol: string;
  reducedMolality: ReducedMolality;
  molality: MolPerKilogram;
  amount: Mol;
  activityCoefficient: ActivityCoefficient;
  activity: Activity;
}

export function parseSpeciesState(dto: SpeciesStateDto): SpeciesState {
  return {
    symbol: dto.symbol,
    reducedMolality: reducedMolality(dto.reducedMolality.value),
    molality: molPerKilogram(dto.molality.value),
    amount: mol(dto.amount.value),
    activityCoefficient: activityCoefficient(dto.activityCoefficient.value),
    activity: activity(dto.activity.value),
  };
}

// ---------------------------------------------------------------------------
// Validity and indicators
// ---------------------------------------------------------------------------

export const ValidityStatusSchema = z.strictObject({
  inDomain: z.boolean(),
  /** Present only when `inDomain` is false. A refusal carries its reason. */
  reason: z.string().optional(),
  /** True when inside the PROPOSED accuracy envelope. Note the wording: the
   *  envelope is proposed until M4's oracle validation passes. */
  withinProposedAccuracyEnvelope: z.boolean(),
});
export type ValidityStatusDto = z.infer<typeof ValidityStatusSchema>;
export type ValidityStatus = ValidityStatusDto;

export const IndicatorStateSchema = z.strictObject({
  indicatorId: z.string().min(1),
  /**
   * m(In⁻)/m(HIn). A SCIENTIFIC output, because computing it needs `Ka_in`, an
   * activity, and an activity coefficient. The observable layer receives this
   * ratio and owns only the mapping ratio → colour (`ADR-0006`).
   *
   * A BARE NUMBER, and `SPEC-0001` AC-V9 requires that: "`packages/render`
   * receives a number and computes no `Ka`, activity, or activity
   * coefficient." It is the one place where a plain number at this boundary is
   * the specification rather than a shortcut.
   */
  protonationRatio: z.number().nonnegative(),
});
export type IndicatorStateDto = z.infer<typeof IndicatorStateSchema>;
export type IndicatorState = IndicatorStateDto;

// ---------------------------------------------------------------------------
// ScientificState
// ---------------------------------------------------------------------------

export const ScientificStateSchema = z.strictObject({
  schemaVersion: z.literal(SCIENTIFIC_SCHEMA_VERSION),
  species: z.array(SpeciesStateSchema),
  ionicStrengthMolal: quantityOfDimension("molality"),
  ionicStrengthReduced: quantityOfDimension("dimensionless"),
  /**
   * `−log₁₀ a(H⁺)` under the model named in `provenance`. NOT "the true pH",
   * and NOT the taught `−lg c(H⁺)`.
   *
   * Dimensionless, but it is a pH, not a plain ratio: `units.ts` carries it as
   * `Ph` so that `averagePh` cannot be written (AC-U1).
   */
  modelPh: quantityOfDimension("dimensionless"),
  indicators: z.array(IndicatorStateSchema),
  validity: ValidityStatusSchema,
  provenance: ProvenanceSchema,
});
export type ScientificStateDto = z.infer<typeof ScientificStateSchema>;

/**
 * The runtime form.
 *
 * `provenance` is INSIDE the state, not a sibling on the result envelope —
 * owner-approved 2026-09-11, recorded in `ADR-0003`. A caller that does
 *
 *     const state = result.state;
 *
 * would silently drop a sibling provenance, and "provenance follows the number"
 * is the property the whole provenance requirement exists to provide.
 */
export interface ScientificState {
  species: readonly SpeciesState[];
  ionicStrengthMolal: IonicStrengthMolal;
  ionicStrengthReduced: ReducedIonicStrength;
  modelPh: Ph;
  indicators: readonly IndicatorState[];
  validity: ValidityStatus;
  provenance: Provenance;
}

export function parseScientificState(dto: ScientificStateDto): ScientificState {
  return {
    species: dto.species.map(parseSpeciesState),
    ionicStrengthMolal: ionicStrengthMolal(dto.ionicStrengthMolal.value),
    ionicStrengthReduced: reducedIonicStrength(dto.ionicStrengthReduced.value),
    modelPh: ph(dto.modelPh.value),
    indicators: dto.indicators.map((i) => ({
      indicatorId: i.indicatorId,
      protonationRatio: i.protonationRatio,
    })),
    validity: dto.validity,
    provenance: parseProvenance(dto.provenance),
  };
}

// ---------------------------------------------------------------------------
// SolveRequest
// ---------------------------------------------------------------------------

/**
 * What the scientific core is asked to solve (`ADR-0003`).
 *
 * PLAIN DATA. `ADR-0001` forbids `sci → world`, so this carries a species
 * inventory rather than world state: the caller resolves materials into solutes
 * before the core sees them. That keeps the core testable with no world, no
 * storage, and no browser.
 */
export const SolveRequestSchema = z.strictObject({
  schemaVersion: z.literal(SCIENTIFIC_SCHEMA_VERSION),
  /** Conserved solvent. */
  waterMass: quantityOfDimension("mass"),
  /** Operational: sets nothing thermodynamically, but a molarity needs it. */
  liquidVolume: quantityOfDimension("volume"),
  /**
   * The inventory the equilibrium is solved over. `Ka` is absent for a strong
   * acid: the model treats it as fully dissociated, which is a model choice
   * recorded in the solver config rather than a constant.
   */
  solutes: z.array(
    z.strictObject({
      soluteId: z.string().min(1),
      amount: quantityOfDimension("amount"),
      /** Monoprotic acid dissociation constant, dimensionless and molality-based. */
      ka: quantityOfDimension("dimensionless").optional(),
      /** Fully dissociated: no equilibrium for this solute. */
      fullyDissociated: z.boolean(),
    }),
  ),
  temperature: quantityOfDimension("temperature"),
  /**
   * Indicator constants. Part of the SCIENTIFIC input because computing the
   * protonation ratio needs `Ka_in`, an activity and an activity coefficient
   * (`ADR-0006`).
   */
  indicators: z.array(
    z.strictObject({
      indicatorId: z.string().min(1),
      kaIn: quantityOfDimension("dimensionless"),
    }),
  ),
});
export type SolveRequestDto = z.infer<typeof SolveRequestSchema>;

export interface SolveRequest {
  waterMass: Kilogram;
  liquidVolume: Litre;
  solutes: readonly {
    soluteId: string;
    amount: Mol;
    /** Absent for a strong acid, which the model treats as fully dissociated. */
    ka: ThermodynamicConstant | undefined;
    fullyDissociated: boolean;
  }[];
  temperature: Kelvin;
  indicators: readonly { indicatorId: string; kaIn: ThermodynamicConstant }[];
}

export function parseSolveRequest(dto: SolveRequestDto): SolveRequest {
  return {
    waterMass: kilogram(dto.waterMass.value),
    liquidVolume: litre(dto.liquidVolume.value),
    solutes: dto.solutes.map((s) => ({
      soluteId: s.soluteId,
      amount: mol(s.amount.value),
      ka: s.ka === undefined ? undefined : thermodynamicConstant(s.ka.value),
      fullyDissociated: s.fullyDissociated,
    })),
    temperature: kelvin(dto.temperature.value),
    indicators: dto.indicators.map((i) => ({
      indicatorId: i.indicatorId,
      kaIn: thermodynamicConstant(i.kaIn.value),
    })),
  };
}

// ---------------------------------------------------------------------------
// SolveResult
// ---------------------------------------------------------------------------

export const InputViolationSchema = z.strictObject({
  field: z.string().min(1),
  message: z.string().min(1),
});
export type InputViolationDto = z.infer<typeof InputViolationSchema>;
export type InputViolation = InputViolationDto;

/**
 * The solver's return envelope (`ADR-0003`). A caller cannot obtain a bare
 * number: every outcome is a tagged result, and validity is a normal return
 * value rather than an exception.
 *
 * DEVIATION FROM `ADR-0003`, owner-approved 2026-09-11: the ADR sketched the OK
 * branch as `{ state, provenance }` with provenance as a SIBLING of state.
 * Provenance lives INSIDE `ScientificState` here. Carrying it twice would be
 * the same double-source-of-truth defect this project removed from
 * `Vessel.contents` and from genesis `solverConfig`.
 */
export const SolveResultSchema = z.discriminatedUnion("status", [
  z.strictObject({
    schemaVersion: z.literal(SCIENTIFIC_SCHEMA_VERSION),
    status: z.literal("OK"),
    state: ScientificStateSchema,
  }),
  z.strictObject({
    schemaVersion: z.literal(SCIENTIFIC_SCHEMA_VERSION),
    status: z.literal("MODEL_OUT_OF_DOMAIN"),
    reason: z.string().min(1),
    /**
     * What WOULD have been supported. `ADR-0003` requires this so a refusal
     * tells the caller something actionable; a bare reason does not.
     */
    nearestSupported: ModelDescriptorSchema.optional(),
  }),
  z.strictObject({
    schemaVersion: z.literal(SCIENTIFIC_SCHEMA_VERSION),
    status: z.literal("NOT_CONVERGED"),
    /** A convergence diagnostic, not a physical quantity: bounded by the
     *  iteration scheme, unitless by construction, and never stored. */
    residual: z.number(),
    iterations: z.number().int().nonnegative(),
  }),
  z.strictObject({
    schemaVersion: z.literal(SCIENTIFIC_SCHEMA_VERSION),
    status: z.literal("INVALID_INPUT"),
    violations: z.array(InputViolationSchema),
  }),
]);
export type SolveResultDto = z.infer<typeof SolveResultSchema>;

export type SolveResult =
  | { status: "OK"; state: ScientificState }
  | {
      status: "MODEL_OUT_OF_DOMAIN";
      reason: string;
      nearestSupported: ModelDescriptor | undefined;
    }
  | { status: "NOT_CONVERGED"; residual: number; iterations: number }
  | { status: "INVALID_INPUT"; violations: readonly InputViolation[] };

export function parseSolveResult(dto: SolveResultDto): SolveResult {
  switch (dto.status) {
    case "OK":
      return { status: "OK", state: parseScientificState(dto.state) };
    case "MODEL_OUT_OF_DOMAIN":
      return {
        status: "MODEL_OUT_OF_DOMAIN",
        reason: dto.reason,
        nearestSupported: dto.nearestSupported && {
          id: dto.nearestSupported.id,
          version: dto.nearestSupported.version,
          description: dto.nearestSupported.description,
          validity: {
            temperature: {
              min: kelvin(dto.nearestSupported.validity.temperature.min.value),
              max: kelvin(dto.nearestSupported.validity.temperature.max.value),
            },
            ionicStrengthMolalMax: ionicStrengthMolal(
              dto.nearestSupported.validity.ionicStrengthMolalMax.value,
            ),
            species: dto.nearestSupported.validity.species,
            solvent: dto.nearestSupported.validity.solvent,
            phase: dto.nearestSupported.validity.phase,
          },
        },
      };
    case "NOT_CONVERGED":
      return {
        status: "NOT_CONVERGED",
        residual: dto.residual,
        iterations: dto.iterations,
      };
    case "INVALID_INPUT":
      return { status: "INVALID_INPUT", violations: dto.violations };
  }
}

// ---------------------------------------------------------------------------
// SolverConfig
// ---------------------------------------------------------------------------

/**
 * The solver identity that participates in replay identity (`ADR-0007` §8).
 *
 * `parameters` is a flat bag of NUMBERS, and that is a known soft spot: the
 * ontology distinguishes thermodynamic from conditional constants and forbids
 * storing one as the other (anti-pattern 5). Naming which kind each parameter
 * is belongs to the model descriptor this config points at, and M4's solver is
 * what must declare it. Recorded rather than left for a later reader to
 * discover, because a config bag that silently accepts a conditional `Kw` is
 * exactly how a replay stops reproducing.
 */
export const SolverConfigSchema = z.strictObject({
  id: z.string().min(1),
  version: z.string().min(1),
  parameters: z.record(z.string(), z.number()),
});
export type SolverConfigDto = z.infer<typeof SolverConfigSchema>;
export type SolverConfig = SolverConfigDto;
