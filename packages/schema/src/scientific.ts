/**
 * The Scientific Reality Core's output contract (`ADR-0003`).
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
  /** Every constant that entered the calculation, so a replay can pin them. */
  parameters: z.record(z.string(), z.number()),
  uncertainty: z.string().optional(),
  source: z.string().optional(),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const ModelDescriptorSchema = z.strictObject({
  id: z.string().min(1),
  version: z.string().min(1),
  /** Free text shown in the model-inspection view. */
  description: z.string(),
  /** The domain the model claims. Outside it, the solver must refuse. */
  validity: z.strictObject({
    temperatureKelvin: z.strictObject({ min: z.number(), max: z.number() }),
    ionicStrengthMolalMax: z.number().positive(),
    species: z.array(z.string()),
    solvent: z.string(),
    phase: z.string(),
  }),
});
export type ModelDescriptor = z.infer<typeof ModelDescriptorSchema>;

/**
 * One species, in BOTH representations.
 *
 * `reducedMolality` is the algebra's native variable and is dimensionless;
 * `molality` is mol/kg. They are numerically identical at `m° = 1 mol/kg`, and
 * both are carried so the boundary conversion is explicit rather than assumed
 * (`ADR-0007`, `SPEC-0001` AC-U5).
 */
export const SpeciesStateSchema = z.strictObject({
  symbol: z.string().min(1),
  /** m̂ = m/m°, dimensionless. */
  reducedMolality: z.number().nonnegative(),
  /** m, mol/kg. Equal to `reducedMolality · m°`. */
  molality: z.number().nonnegative(),
  amountMol: z.number().nonnegative(),
  activityCoefficient: z.number().nonnegative(),
  /** a = γ · m̂, dimensionless. */
  activity: z.number().nonnegative(),
});
export type SpeciesState = z.infer<typeof SpeciesStateSchema>;

export const ValidityStatusSchema = z.strictObject({
  inDomain: z.boolean(),
  /** Present only when `inDomain` is false. A refusal carries its reason. */
  reason: z.string().optional(),
  /** True when inside the PROPOSED accuracy envelope. Note the wording: the
   *  envelope is proposed until M4's oracle validation passes. */
  withinProposedAccuracyEnvelope: z.boolean(),
});
export type ValidityStatus = z.infer<typeof ValidityStatusSchema>;

export const IndicatorStateSchema = z.strictObject({
  indicatorId: z.string().min(1),
  /**
   * m(In⁻)/m(HIn). A SCIENTIFIC output, because computing it needs `Ka_in`, an
   * activity, and an activity coefficient. The observable layer receives this
   * ratio and owns only the mapping ratio → colour (`ADR-0006`).
   */
  protonationRatio: z.number().nonnegative(),
});
export type IndicatorState = z.infer<typeof IndicatorStateSchema>;

export const ScientificStateSchema = z.strictObject({
  species: z.array(SpeciesStateSchema),
  ionicStrengthMolal: z.number().nonnegative(),
  ionicStrengthReduced: z.number().nonnegative(),
  /**
   * `−log₁₀ a(H⁺)` under the model named in `provenance`. NOT "the true pH",
   * and NOT the taught `−lg c(H⁺)`.
   */
  modelPh: z.number(),
  indicators: z.array(IndicatorStateSchema),
  validity: ValidityStatusSchema,
  provenance: ProvenanceSchema,
});
export type ScientificState = z.infer<typeof ScientificStateSchema>;

/**
 * The solver's return envelope (`ADR-0003`). A caller cannot obtain a bare
 * number: every outcome is a tagged result, and validity is a normal return
 * value rather than an exception.
 */
export const InputViolationSchema = z.strictObject({
  field: z.string().min(1),
  message: z.string().min(1),
});
export type InputViolation = z.infer<typeof InputViolationSchema>;

/**
 * What the scientific core is asked to solve (`ADR-0003`).
 *
 * PLAIN DATA. `ADR-0001` forbids `sci → world`, so this carries a species
 * inventory rather than world state: the caller resolves materials into solutes
 * before the core sees them. That keeps the core testable with no world, no
 * storage, and no browser.
 *
 * This type was referenced by `ADR-0003` and listed by `SPEC-0001` from the
 * start, and did not exist until an audit of the M1 implementation against
 * those documents found the gap.
 */
export const SolveRequestSchema = z.strictObject({
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
      amountMol: z.number().nonnegative(),
      /** Monoprotic acid dissociation constant, dimensionless and molality-based. */
      kaDimensionless: z.number().positive().optional(),
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
      kaInDimensionless: z.number().positive(),
    }),
  ),
});
export type SolveRequest = z.infer<typeof SolveRequestSchema>;

/**
 * The solver's return envelope (`ADR-0003`). A caller cannot obtain a bare
 * number: every outcome is a tagged result, and validity is a normal return
 * value rather than an exception.
 *
 * DEVIATION FROM `ADR-0003`, recorded rather than silent: the ADR sketches the
 * OK branch as `{ state, provenance }`, with provenance as a SIBLING of state.
 * Provenance lives INSIDE `ScientificState` here. Carrying it twice would be
 * the same double-source-of-truth defect this project removed from
 * `Vessel.contents` and from genesis `solverConfig`.
 */
export const SolveResultSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("OK"), state: ScientificStateSchema }),
  z.strictObject({
    status: z.literal("MODEL_OUT_OF_DOMAIN"),
    reason: z.string().min(1),
    /**
     * What WOULD have been supported. `ADR-0003` requires this so a refusal
     * tells the caller something actionable; a bare reason does not.
     */
    nearestSupported: ModelDescriptorSchema.optional(),
  }),
  z.strictObject({
    status: z.literal("NOT_CONVERGED"),
    residual: z.number(),
    iterations: z.number().int().nonnegative(),
  }),
  z.strictObject({
    status: z.literal("INVALID_INPUT"),
    violations: z.array(InputViolationSchema),
  }),
]);
export type SolveResult = z.infer<typeof SolveResultSchema>;

/** The solver identity that participates in replay identity (`ADR-0007` §8). */
export const SolverConfigSchema = z.strictObject({
  id: z.string().min(1),
  version: z.string().min(1),
  parameters: z.record(z.string(), z.number()),
});
export type SolverConfig = z.infer<typeof SolverConfigSchema>;
