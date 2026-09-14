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
 * The bridge is a parse function per contract. It validates dimensions at the
 * DTO boundary, canonicalizes the tagged value with `toCanonical()`, and then
 * goes through the constructors — so a value that could not have been
 * constructed cannot enter the domain even if a caller hand-builds a DTO.
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

import { VERSION_MANIFEST } from "./generated/versions.js";
import { hashCanonical } from "./canonical-hash.js";
import {
  canonicalQuantityOfDimension,
  quantityOfDimension,
  toCanonical,
} from "./quantity.js";
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
export const SCIENTIFIC_SCHEMA_VERSION = VERSION_MANIFEST.schema.scientific;

/** Independent version for the Rust/WASM JSON bridge envelope. */
export const NATIVE_BRIDGE_SCHEMA_VERSION = VERSION_MANIFEST.schema.nativeBridge;

/** Standalone schema version for model-generated symbolic expressions. */
export const SCIENTIFIC_EXPRESSION_SCHEMA_VERSION =
  VERSION_MANIFEST.schema.scientificExpression;

export const ScientificExpressionEquationIdSchema = z.enum([
  "charge-balance",
  "water-autoprotolysis",
  "ionic-strength-fixed-point",
  "davies-activity-coefficient",
  "activity-definition",
  "acid-family-equilibrium",
  "acid-family-balance",
]);
export type ScientificExpressionEquationId = z.infer<
  typeof ScientificExpressionEquationIdSchema
>;

/** A current value substituted into a Scientific Core-owned equation. */
export const ScientificExpressionSubstitutionSchema = z.strictObject({
  symbol: z.string().min(1),
  value: z.number().finite(),
  unit: z.string().min(1),
});
export type ScientificExpressionSubstitution = z.infer<
  typeof ScientificExpressionSubstitutionSchema
>;

/**
 * A symbolic expression is a scientific output, not free-form render copy.
 * Its model and source-state identity travel with it so a presentation layer
 * cannot label arbitrary text as an exact expression for the current state.
 */
export const ScientificExpressionSchema = z.strictObject({
  schemaVersion: z.literal(SCIENTIFIC_EXPRESSION_SCHEMA_VERSION),
  id: z.string().min(1),
  equationId: ScientificExpressionEquationIdSchema,
  label: z.enum(["exact", "shortcut"]),
  expression: z.string().min(1),
  formula: z.string().min(1),
  substitutions: z.array(ScientificExpressionSubstitutionSchema).min(1),
  omittedTerms: z.array(z.string()),
  producerId: z.literal("scientific-core"),
  producerVersion: z.string().min(1),
  modelId: z.string().min(1),
  modelVersion: z.string().min(1),
  sourceStateHash: z.string().min(1),
});
export type ScientificExpression = z.infer<typeof ScientificExpressionSchema>;

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

/**
 * Provenance for a scientific DATA INPUT, not for a solver/model run.
 *
 * `Provenance` above answers "which model produced this state?". This type
 * answers "where did the density, composition, or molar mass come from?". The
 * two are intentionally separate because a solver identity is not a citation
 * for an input value (`GOAL.md` §12, `SPEC-0001` genesis contract).
 */
export const DataProvenanceSchema = z.strictObject({
  source: z.string().min(1),
  reference: z.string().min(1),
  edition: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
  category: ProvenanceCategorySchema,
  /** Source notation for an uncertainty; not a parsed quantity. */
  uncertainty: z.string().min(1).optional(),
  /** Conditions are quantities, so they retain their tagged wire form. */
  temperature: quantityOfDimension("temperature").optional(),
  pressure: quantityOfDimension("pressure").optional(),
  lastVerified: z.string().min(1).optional(),
});
export type DataProvenanceDto = z.infer<typeof DataProvenanceSchema>;
export type DataProvenance = DataProvenanceDto;

export function parseDataProvenance(dto: DataProvenanceDto): DataProvenance {
  return DataProvenanceSchema.parse(dto);
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
    /** Equilibrium species the model can represent. */
    species: z.array(z.string().min(1)).min(1),
    /** Input component identities accepted by SolveRequest. */
    components: z.array(z.string().min(1)).min(1),
    solvent: z.string(),
    phase: z.string(),
    /** Whether the model accounts for activity coefficients. */
    activityCorrected: z.boolean(),
  }),
});
export type ModelDescriptorDto = z.infer<typeof ModelDescriptorSchema>;

/** The declared validity envelope, as values the solver can compare against. */
export interface ModelValidity {
  readonly temperature: { readonly min: Kelvin; readonly max: Kelvin };
  readonly ionicStrengthMolalMax: IonicStrengthMolal;
  readonly species: readonly string[];
  readonly components: readonly string[];
  readonly solvent: string;
  readonly phase: string;
  readonly activityCorrected: boolean;
}

export interface ModelDescriptor {
  readonly id: string;
  readonly version: string;
  readonly description: string;
  readonly validity: ModelValidity;
}

/** DTO → domain. Canonicalizes all quantity fields before branded construction. */
export function parseModelDescriptor(dto: ModelDescriptorDto): ModelDescriptor {
  return {
    id: dto.id,
    version: dto.version,
    description: dto.description,
    validity: {
      temperature: {
        min: kelvin(toCanonical(dto.validity.temperature.min).value),
        max: kelvin(toCanonical(dto.validity.temperature.max).value),
      },
      ionicStrengthMolalMax: ionicStrengthMolal(
        toCanonical(dto.validity.ionicStrengthMolalMax).value,
      ),
      species: dto.validity.species,
      components: dto.validity.components,
      solvent: dto.validity.solvent,
      phase: dto.validity.phase,
      activityCorrected: dto.validity.activityCorrected,
    },
  };
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
    reducedMolality: reducedMolality(toCanonical(dto.reducedMolality).value),
    molality: molPerKilogram(toCanonical(dto.molality).value),
    amount: mol(toCanonical(dto.amount).value),
    activityCoefficient: activityCoefficient(
      toCanonical(dto.activityCoefficient).value,
    ),
    activity: activity(toCanonical(dto.activity).value),
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
    ionicStrengthMolal: ionicStrengthMolal(
      toCanonical(dto.ionicStrengthMolal).value,
    ),
    ionicStrengthReduced: reducedIonicStrength(
      toCanonical(dto.ionicStrengthReduced).value,
    ),
    modelPh: ph(toCanonical(dto.modelPh).value),
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
export const SolveRequestSoluteSchema = z.discriminatedUnion("mode", [
  z.strictObject({
    soluteId: z.string().min(1),
    amount: quantityOfDimension("amount"),
    mode: z.literal("fully-dissociated"),
  }),
  z.strictObject({
    soluteId: z.string().min(1),
    amount: quantityOfDimension("amount"),
    mode: z.literal("monoprotic-equilibrium"),
    /** Monoprotic acid dissociation constant, dimensionless and molality-based. */
    ka: quantityOfDimension("dimensionless"),
  }),
]);
export type SolveRequestSoluteDto = z.infer<typeof SolveRequestSoluteSchema>;

export type SolveRequestSolute =
  | {
      soluteId: string;
      amount: Mol;
      mode: "fully-dissociated";
    }
  | {
      soluteId: string;
      amount: Mol;
      mode: "monoprotic-equilibrium";
      ka: ThermodynamicConstant;
    };

export const SolveRequestSchema = z.strictObject({
  schemaVersion: z.literal(SCIENTIFIC_SCHEMA_VERSION),
  /** Conserved solvent. */
  waterMass: quantityOfDimension("mass"),
  /** Operational: sets nothing thermodynamically, but a molarity needs it. */
  liquidVolume: quantityOfDimension("volume"),
  /**
   * The inventory the equilibrium is solved over. The mode is explicit so a
   * caller cannot supply contradictory instructions such as a finite `Ka` for a
   * fully dissociated solute or omit the constant for an equilibrium solute.
   */
  solutes: z.array(SolveRequestSoluteSchema),
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
      /** Optional conserved dose present in the target vessel. */
      totalAmount: quantityOfDimension("amount").optional(),
    }),
  ),
});
export type SolveRequestDto = z.infer<typeof SolveRequestSchema>;

export interface SolveRequest {
  waterMass: Kilogram;
  liquidVolume: Litre;
  solutes: readonly SolveRequestSolute[];
  temperature: Kelvin;
  indicators: readonly {
    indicatorId: string;
    kaIn: ThermodynamicConstant;
    totalAmount?: Mol;
  }[];
}

export function parseSolveRequest(dto: SolveRequestDto): SolveRequest {
  return {
    waterMass: kilogram(toCanonical(dto.waterMass).value),
    liquidVolume: litre(toCanonical(dto.liquidVolume).value),
    solutes: dto.solutes.map((s) => {
      const amount = mol(toCanonical(s.amount).value);
      if (s.mode === "fully-dissociated") {
        return { soluteId: s.soluteId, amount, mode: s.mode };
      }
      return {
        soluteId: s.soluteId,
        amount,
        mode: s.mode,
        ka: thermodynamicConstant(toCanonical(s.ka).value),
      };
    }),
    temperature: kelvin(toCanonical(dto.temperature).value),
    indicators: dto.indicators.map((i) => ({
      indicatorId: i.indicatorId,
      kaIn: thermodynamicConstant(toCanonical(i.kaIn).value),
      ...(i.totalAmount === undefined
        ? {}
        : { totalAmount: mol(toCanonical(i.totalAmount).value) }),
    })),
  };
}

/** Domain → canonical DTO bridge used by every native execution boundary. */
export function serializeSolveRequest(request: SolveRequest): SolveRequestDto {
  return SolveRequestSchema.parse({
    schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
    waterMass: { value: request.waterMass, unit: "kg" },
    liquidVolume: { value: request.liquidVolume, unit: "L" },
    solutes: request.solutes.map((solute) => ({
      soluteId: solute.soluteId,
      amount: { value: solute.amount, unit: "mol" },
      mode: solute.mode,
      ...(solute.mode === "monoprotic-equilibrium"
        ? { ka: { value: solute.ka.value, unit: "1" } }
        : {}),
    })),
    temperature: { value: request.temperature, unit: "K" },
    indicators: request.indicators.map((indicator) => ({
      indicatorId: indicator.indicatorId,
      kaIn: { value: indicator.kaIn.value, unit: "1" },
      ...(indicator.totalAmount === undefined
        ? {}
        : { totalAmount: { value: indicator.totalAmount, unit: "mol" } }),
    })),
  });
}

/**
 * Canonical request representation consumed by the Rust/WASM ABI.
 *
 * `SolveRequestSchema` is intentionally an authoring-facing wire contract:
 * it accepts equivalent units and the DTO bridge canonicalizes them. A native
 * executor is a second language boundary and cannot perform that authoring
 * normalization implicitly, so its envelope uses this stricter schema.
 */
const NativeSolveRequestSoluteSchema = z.discriminatedUnion("mode", [
  z.strictObject({
    soluteId: z.string().min(1),
    amount: canonicalQuantityOfDimension("amount"),
    mode: z.literal("fully-dissociated"),
  }),
  z.strictObject({
    soluteId: z.string().min(1),
    amount: canonicalQuantityOfDimension("amount"),
    mode: z.literal("monoprotic-equilibrium"),
    ka: canonicalQuantityOfDimension("dimensionless"),
  }),
]);

export const NativeSolveRequestSchema = z.strictObject({
  schemaVersion: z.literal(SCIENTIFIC_SCHEMA_VERSION),
  waterMass: canonicalQuantityOfDimension("mass"),
  liquidVolume: canonicalQuantityOfDimension("volume"),
  solutes: z.array(NativeSolveRequestSoluteSchema),
  temperature: canonicalQuantityOfDimension("temperature"),
  indicators: z.array(z.strictObject({
    indicatorId: z.string().min(1),
    kaIn: canonicalQuantityOfDimension("dimensionless"),
    totalAmount: canonicalQuantityOfDimension("amount").optional(),
  })),
});
export type NativeSolveRequestDto = z.infer<typeof NativeSolveRequestSchema>;

// ---------------------------------------------------------------------------
// SolveResult
// ---------------------------------------------------------------------------

export const InputViolationSchema = z.strictObject({
  field: z.string().min(1),
  message: z.string().min(1),
});
export type InputViolationDto = z.infer<typeof InputViolationSchema>;
export type InputViolation = InputViolationDto;

export const SolveFailureCodeSchema = z.enum([
  "INNER_BRACKET_NOT_FOUND",
  "OUTER_BRACKET_NOT_FOUND",
  "INNER_ITERATION_LIMIT",
  "OUTER_ITERATION_LIMIT",
  "INVALID_NUMERIC_ARGUMENT",
]);
export type SolveFailureCode = z.infer<typeof SolveFailureCodeSchema>;

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
    nearestSupported: ModelDescriptorSchema,
  }),
  z.strictObject({
    schemaVersion: z.literal(SCIENTIFIC_SCHEMA_VERSION),
    status: z.literal("NOT_CONVERGED"),
    code: SolveFailureCodeSchema,
    reason: z.string().min(1),
    /** Present only when the failed iteration produced a meaningful residual. */
    residual: z.number().finite().optional(),
    iterations: z.number().int().nonnegative(),
  }),
  z.strictObject({
    schemaVersion: z.literal(SCIENTIFIC_SCHEMA_VERSION),
    status: z.literal("INVALID_INPUT"),
    violations: z.array(InputViolationSchema),
  }),
]);
export type SolveResultDto = z.infer<typeof SolveResultSchema>;

/** Context supplied by the composition boundary, not generated by the backend. */
export const NativeExecutionContextSchema = z.strictObject({
  sourceStateHash: z.string().min(1),
});
export type NativeExecutionContextDto = z.infer<
  typeof NativeExecutionContextSchema
>;

/** The only public request shape accepted by the Rust/WASM bridge. */
export const NativeSolveEnvelopeSchema = z.strictObject({
  bridgeSchemaVersion: z.literal(NATIVE_BRIDGE_SCHEMA_VERSION),
  request: NativeSolveRequestSchema,
  context: NativeExecutionContextSchema,
});
export type NativeSolveEnvelopeDto = z.infer<typeof NativeSolveEnvelopeSchema>;

export const NativeBackendIdentitySchema = z.strictObject({
  id: z.string().min(1),
  version: z.string().min(1),
});

/** The only public payload shape emitted by the Rust/WASM bridge. */
export const NativeBackendPayloadSchema = z.strictObject({
  bridgeSchemaVersion: z.literal(NATIVE_BRIDGE_SCHEMA_VERSION),
  backend: NativeBackendIdentitySchema,
  /** SHA-256 of the exact canonical bridge envelope bytes. */
  requestHash: z.string().min(1),
  /** Opaque replay-equivalence identity supplied in the request context. */
  sourceStateHash: z.string().min(1),
  result: SolveResultSchema,
  expressions: z.array(ScientificExpressionSchema),
});
export type NativeBackendPayloadDto = z.infer<
  typeof NativeBackendPayloadSchema
>;

export type SolveResult =
  | { status: "OK"; state: ScientificState }
  | {
      status: "MODEL_OUT_OF_DOMAIN";
      reason: string;
      nearestSupported: ModelDescriptor;
    }
  | {
      status: "NOT_CONVERGED";
      code: SolveFailureCode;
      reason: string;
      residual?: number;
      iterations: number;
    }
  | { status: "INVALID_INPUT"; violations: readonly InputViolation[] };

export function parseSolveResult(dto: SolveResultDto): SolveResult {
  switch (dto.status) {
    case "OK":
      return { status: "OK", state: parseScientificState(dto.state) };
    case "MODEL_OUT_OF_DOMAIN":
      return {
        status: "MODEL_OUT_OF_DOMAIN",
        reason: dto.reason,
        nearestSupported: parseModelDescriptor(dto.nearestSupported),
      };
    case "NOT_CONVERGED":
      return {
        status: "NOT_CONVERGED",
        code: dto.code,
        reason: dto.reason,
        ...(dto.residual === undefined ? {} : { residual: dto.residual }),
        iterations: dto.iterations,
      };
    case "INVALID_INPUT":
      return { status: "INVALID_INPUT", violations: dto.violations };
  }
}

/** Domain → DTO bridge used to validate results returned by adapter code. */
export function serializeModelDescriptor(
  descriptor: ModelDescriptor,
): ModelDescriptorDto {
  return {
    id: descriptor.id,
    version: descriptor.version,
    description: descriptor.description,
    validity: {
      temperature: {
        min: { value: descriptor.validity.temperature.min, unit: "K" },
        max: { value: descriptor.validity.temperature.max, unit: "K" },
      },
      ionicStrengthMolalMax: {
        value: descriptor.validity.ionicStrengthMolalMax.value,
        unit: "mol/kg",
      },
      species: [...descriptor.validity.species],
      components: [...descriptor.validity.components],
      solvent: descriptor.validity.solvent,
      phase: descriptor.validity.phase,
      activityCorrected: descriptor.validity.activityCorrected,
    },
  };
}

export function serializeScientificState(
  state: ScientificState,
): ScientificStateDto {
  return {
    schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
    species: state.species.map((species) => ({
      symbol: species.symbol,
      reducedMolality: { value: species.reducedMolality.value, unit: "1" },
      molality: { value: species.molality, unit: "mol/kg" },
      amount: { value: species.amount, unit: "mol" },
      activityCoefficient: { value: species.activityCoefficient.value, unit: "1" },
      activity: { value: species.activity.value, unit: "1" },
    })),
    ionicStrengthMolal: { value: state.ionicStrengthMolal.value, unit: "mol/kg" },
    ionicStrengthReduced: { value: state.ionicStrengthReduced.value, unit: "1" },
    modelPh: { value: state.modelPh.value, unit: "1" },
    indicators: state.indicators.map((indicator) => ({ ...indicator })),
    validity: { ...state.validity },
    provenance: { ...state.provenance, parameters: { ...state.provenance.parameters } },
  };
}

/** Validate a domain-form result through the same DTO contract used on the wire. */
export function serializeSolveResult(result: SolveResult): SolveResultDto {
  switch (result.status) {
    case "OK":
      return {
        schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
        status: "OK",
        state: serializeScientificState(result.state),
      };
    case "MODEL_OUT_OF_DOMAIN":
      return {
        schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
        status: "MODEL_OUT_OF_DOMAIN",
        reason: result.reason,
        nearestSupported: serializeModelDescriptor(result.nearestSupported),
      };
    case "NOT_CONVERGED":
      return {
        schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
        status: "NOT_CONVERGED",
        code: result.code,
        reason: result.reason,
        ...(result.residual === undefined ? {} : { residual: result.residual }),
        iterations: result.iterations,
      };
    case "INVALID_INPUT":
      return {
        schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
        status: "INVALID_INPUT",
        violations: result.violations.map((violation) => ({ ...violation })),
      };
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
export interface SolverConfig {
  readonly id: string;
  readonly version: string;
  readonly parameters: Readonly<Record<string, number>>;
}

/**
 * Stable identity for the complete persisted solver configuration.
 *
 * Object keys are canonicalized by `hashCanonical`, so parameter insertion
 * order is not identity. Every parameter value is encoded as its canonical
 * numeric spelling, with signed zero preserved because solver identity uses
 * `Object.is` semantics at the adapter boundary.
 */
export function solverConfigIdentityHash(config: SolverConfig): string {
  const parameters = Object.fromEntries(
    Object.keys(config.parameters)
      .sort()
      .map((key) => {
        const value = config.parameters[key];
        if (!Number.isFinite(value)) {
          throw new RangeError(`solver config parameter ${key} must be finite`);
        }
        return [key, Object.is(value, -0) ? "-0" : String(value)];
      }),
  );
  return `sha256:${hashCanonical({
    id: config.id,
    version: config.version,
    parameters,
  })}`;
}
