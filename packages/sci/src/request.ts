/** DTO/domain bridge for solver requirements and solve requests. */

import {
  ModelRequirementsSchema,
  kelvin,
  toCanonical,
  type InputViolation,
  type Kelvin,
  type ModelRequirements as ModelRequirementsDto,
  type SolveRequest,
  type SolveRequestDto,
} from "@chemrealm/schema";

/** Domain form used by the resolver; its temperature is canonical Kelvin. */
export interface SolverRequirements {
  readonly temperature: Kelvin;
  readonly species: readonly string[];
  readonly solvent: string;
  readonly phase: string;
  readonly activityCorrected: boolean;
}

export type SolverRequirementsDto = ModelRequirementsDto;
export type ModelRequirements = SolverRequirements;

/** Validate and canonicalize a content/scenario requirements block. */
export function parseSolverRequirements(input: unknown): SolverRequirements {
  const dto = ModelRequirementsSchema.parse(input);
  return {
    temperature: kelvin(toCanonical(dto.temperature).value),
    species: [...dto.species],
    solvent: dto.solvent,
    phase: dto.phase,
    activityCorrected: dto.activityCorrected,
  };
}

/** Descriptive alias for call sites that use the schema's terminology. */
export const parseModelRequirements = parseSolverRequirements;

/**
 * Validate the semantic preconditions that a typed request still needs before
 * a model can inspect its domain. Constructors reject negative quantities, but
 * this function also protects the adapter when a caller crosses the type
 * boundary with a cast or decoded data.
 */
export function validateSolveRequest(
  request: SolveRequest,
): readonly InputViolation[] {
  const violations: InputViolation[] = [];

  if (!Number.isFinite(request.waterMass) || request.waterMass <= 0) {
    violations.push({
      field: "waterMass",
      message: "water mass must be finite and greater than zero",
    });
  }
  if (!Number.isFinite(request.liquidVolume) || request.liquidVolume <= 0) {
    violations.push({
      field: "liquidVolume",
      message: "liquid volume must be finite and greater than zero",
    });
  }
  if (!Number.isFinite(request.temperature)) {
    violations.push({
      field: "temperature",
      message: "temperature must be finite",
    });
  }

  for (const [index, solute] of request.solutes.entries()) {
    if (solute.soluteId.trim().length === 0) {
      violations.push({
        field: `solutes[${index}].soluteId`,
        message: "solute id must not be empty",
      });
    }
    if (!Number.isFinite(solute.amount) || solute.amount < 0) {
      violations.push({
        field: `solutes[${index}].amount`,
        message: "solute amount must be finite and non-negative",
      });
    }
    if (solute.mode === "fully-dissociated") {
      if ("ka" in solute) {
        violations.push({
          field: `solutes[${index}].mode`,
          message: "fully dissociated solutes cannot carry an equilibrium constant",
        });
      }
    } else if (solute.mode === "monoprotic-equilibrium") {
      if (!Number.isFinite(solute.ka.value) || solute.ka.value <= 0) {
        violations.push({
          field: `solutes[${index}].ka`,
          message: "thermodynamic constant must be finite and positive",
        });
      }
    } else {
      violations.push({
        field: `solutes[${index}].mode`,
        message: "solute mode is not supported",
      });
    }
  }

  for (const [index, indicator] of request.indicators.entries()) {
    if (indicator.indicatorId.trim().length === 0) {
      violations.push({
        field: `indicators[${index}].indicatorId`,
        message: "indicator id must not be empty",
      });
    }
    if (!Number.isFinite(indicator.kaIn.value) || indicator.kaIn.value <= 0) {
      violations.push({
        field: `indicators[${index}].kaIn`,
        message: "thermodynamic constant must be finite and positive",
      });
    }
  }

  return violations;
}

export type { SolveRequest, SolveRequestDto };
