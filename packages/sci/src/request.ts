/** DTO/domain bridge for solver requirements and solve requests. */

import {
  ModelRequirementsSchema,
  ScenarioSnapshotSchema,
  kelvin,
  thermodynamicConstant,
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
 * Copy scenario-specific indicator constants from resolved genesis truth into
 * a solve request. This deliberately accepts the serialized snapshot rather
 * than an indicator catalog: replay must not consult mutable authored content.
 */
export function buildIndicatorInputsFromSnapshot(
  input: unknown,
): SolveRequest["indicators"] {
  const snapshot = ScenarioSnapshotSchema.parse(input);
  return snapshot.indicators.map((indicator) => ({
    indicatorId: indicator.indicatorId,
    kaIn: thermodynamicConstant(toCanonical(indicator.kaIn).value),
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveThermodynamicConstant(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value.value) &&
    value.value > 0
  );
}

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

  const candidate: unknown = request;
  if (!isRecord(candidate)) {
    return [
      {
        field: "request",
        message: "solve request must be an object",
      },
    ];
  }

  if (!isFiniteNumber(candidate.waterMass) || candidate.waterMass <= 0) {
    violations.push({
      field: "waterMass",
      message: "water mass must be finite and greater than zero",
    });
  }
  if (
    !isFiniteNumber(candidate.liquidVolume) ||
    candidate.liquidVolume <= 0
  ) {
    violations.push({
      field: "liquidVolume",
      message: "liquid volume must be finite and greater than zero",
    });
  }
  if (!isFiniteNumber(candidate.temperature) || candidate.temperature < 0) {
    violations.push({
      field: "temperature",
      message: "temperature must be finite and non-negative",
    });
  }

  if (!Array.isArray(candidate.solutes)) {
    violations.push({
      field: "solutes",
      message: "solutes must be an array",
    });
  } else {
    for (const [index, rawSolute] of candidate.solutes.entries()) {
      if (!isRecord(rawSolute)) {
        violations.push({
          field: `solutes[${index}]`,
          message: "solute must be an object",
        });
        continue;
      }

      const soluteId = rawSolute.soluteId;
      if (typeof soluteId !== "string" || soluteId.trim().length === 0) {
        violations.push({
          field: `solutes[${index}].soluteId`,
          message: "solute id must be a non-empty string",
        });
      }
      if (
        !isFiniteNumber(rawSolute.amount) ||
        rawSolute.amount < 0
      ) {
        violations.push({
          field: `solutes[${index}].amount`,
          message: "solute amount must be finite and non-negative",
        });
      }

      const mode = rawSolute.mode;
      if (mode === "fully-dissociated") {
        if ("ka" in rawSolute) {
          violations.push({
            field: `solutes[${index}].mode`,
            message: "fully dissociated solutes cannot carry an equilibrium constant",
          });
        }
      } else if (mode === "monoprotic-equilibrium") {
        if (!isPositiveThermodynamicConstant(rawSolute.ka)) {
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
  }

  if (!Array.isArray(candidate.indicators)) {
    violations.push({
      field: "indicators",
      message: "indicators must be an array",
    });
  } else {
    for (const [index, rawIndicator] of candidate.indicators.entries()) {
      if (!isRecord(rawIndicator)) {
        violations.push({
          field: `indicators[${index}]`,
          message: "indicator must be an object",
        });
        continue;
      }

      const indicatorId = rawIndicator.indicatorId;
      if (
        typeof indicatorId !== "string" ||
        indicatorId.trim().length === 0
      ) {
        violations.push({
          field: `indicators[${index}].indicatorId`,
          message: "indicator id must be a non-empty string",
        });
      }
      if (!isPositiveThermodynamicConstant(rawIndicator.kaIn)) {
        violations.push({
          field: `indicators[${index}].kaIn`,
          message: "thermodynamic constant must be finite and positive",
        });
      }
    }
  }

  return violations;
}

export type { SolveRequest, SolveRequestDto };
