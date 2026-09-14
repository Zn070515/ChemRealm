import {
  activity,
  reducedIonicStrength,
  reducedMolality,
  type ReducedIonicStrength,
  type ReducedMolality,
  type SolveFailureCode,
} from "@chemrealm/schema";
import {
  daviesActivities,
  DaviesDomainError,
  type DaviesActivities,
} from "./activity.js";
import type { AcidBaseComponentTotals } from "./catalog.js";
import {
  ACID_BASE_MAX_IONIC_STRENGTH,
  type AcidBaseConstants,
} from "./model.js";
import {
  chargeResidualFromSpecies,
  ionicStrengthFromSpecies,
  type ReducedSpeciesMolalities,
} from "./species.js";
import {
  calculateDiproticIndicatorForms,
  type DiproticIndicatorConstants,
  type DiproticIndicatorReducedForms,
} from "./multiform.js";

export interface ReducedDiproticIndicatorInput {
  readonly totalMolality: ReducedMolality;
  readonly constants: DiproticIndicatorConstants;
}

export interface ReducedSolveInput {
  readonly totals: AcidBaseComponentTotals;
  readonly constants: AcidBaseConstants;
  /** Optional ordinary three-form indicator coupled into charge and I. */
  readonly indicator?: ReducedDiproticIndicatorInput;
}

export interface ReducedSolveSuccess {
  readonly species: ReducedSpeciesMolalities;
  readonly ionicStrength: ReducedIonicStrength;
  /** Charge residual in mol/kg after the explicit reduced-to-physical boundary. */
  readonly chargeResidual: number;
  readonly iterations: { readonly outer: number; readonly inner: number };
  readonly indicatorForms?: DiproticIndicatorReducedForms;
}

export type ReducedSolveFailure =
  | { readonly kind: "OUT_OF_DOMAIN"; readonly reason: string }
  | {
      readonly kind: "NOT_CONVERGED";
      readonly code: SolveFailureCode;
      readonly reason: string;
      readonly residual?: number;
      readonly iterations: number;
    };

type Candidate = {
  readonly species: ReducedSpeciesMolalities;
  readonly ionicStrength: ReducedIonicStrength;
  readonly reducedChargeResidual: number;
  readonly innerIterations: number;
  readonly indicatorForms?: DiproticIndicatorReducedForms;
};

type DomainEdge = {
  readonly hydrogen: number;
  readonly candidate: Candidate;
};

const HYDROGEN_LOWER = 1e-16;
const HYDROGEN_UPPER = 1;
const IONIC_STRENGTH_UPPER = ACID_BASE_MAX_IONIC_STRENGTH;
const INNER_TOLERANCE = 1e-15;
const OUTER_TOLERANCE = 1e-15;
const INNER_ITERATION_LIMIT = 100;
const OUTER_ITERATION_LIMIT = 200;
const OUTER_BRACKET_SPANS = [3, 10, 100, 1000] as const;

function failOutOfDomain(reason: string): ReducedSolveFailure {
  return {
    kind: "OUT_OF_DOMAIN",
    reason,
  };
}

function failNotConverged(
  code: SolveFailureCode,
  reason: string,
  iterations: number,
  residual?: number,
): ReducedSolveFailure {
  const failure = {
    kind: "NOT_CONVERGED",
    code,
    reason,
    iterations,
  } as const;
  return residual !== undefined && Number.isFinite(residual)
    ? { ...failure, residual }
    : failure;
}

function validateReducedValue(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name}: expected a finite non-negative reduced value`);
  }
}

function validateInput(input: ReducedSolveInput): void {
  validateReducedValue(
    input.totals.strongAcidChlorideMolality.value,
    "strong acid/chloride total",
  );
  validateReducedValue(
    input.totals.strongBaseSodiumMolality.value,
    "strong base/sodium total",
  );
  validateReducedValue(
    input.totals.totalAcidFamilyMolality.value,
    "acid-family total",
  );
  if (!Number.isFinite(input.constants.Kw.value) || input.constants.Kw.value <= 0) {
    throw new RangeError("Kw must be finite and positive");
  }
  if (!Number.isFinite(input.constants.Ka_HOAc.value) || input.constants.Ka_HOAc.value <= 0) {
    throw new RangeError("HOAc Ka must be finite and positive");
  }
  if (
    !Number.isFinite(input.constants.waterActivity.value) ||
    input.constants.waterActivity.value <= 0
  ) {
    throw new RangeError("water activity must be finite and positive");
  }
}

/**
 * Concentration-only root used solely as an outer bracket seed.
 *
 * This is not a scientific result and is never returned. It deliberately
 * omits activity coefficients so the production bracket cannot be mistaken
 * for a Henderson–Hasselbalch or post-hoc activity calculation.
 */
function idealHydrogenRoot(input: ReducedSolveInput): number {
  const totals = input.totals;
  const kw = input.constants.Kw.value;
  const ka = input.constants.Ka_HOAc.value;
  const acidFamily = totals.totalAcidFamilyMolality.value;
  const sodium = totals.strongBaseSodiumMolality.value;
  const chloride = totals.strongAcidChlorideMolality.value;
  const residual = (hydrogen: number): number =>
    sodium + hydrogen - kw / hydrogen - acidFamily * ka / (ka + hydrogen) - chloride;

  let lower = HYDROGEN_LOWER;
  let upper = HYDROGEN_UPPER;
  const lowerResidual = residual(lower);
  const upperResidual = residual(upper);
  if (lowerResidual >= 0 || upperResidual <= 0) {
    throw new RangeError("ideal hydrogen root is outside the bracket domain");
  }

  for (let iteration = 0; iteration < OUTER_ITERATION_LIMIT; iteration += 1) {
    const midpoint = lower + 0.5 * (upper - lower);
    const collapsed = midpoint === lower || midpoint === upper;
    if (residual(midpoint) < 0) lower = midpoint;
    else upper = midpoint;
    if (collapsed) break;
  }
  return lower + 0.5 * (upper - lower);
}

/**
 * Evaluate all species for a fixed pair `(m̂_H, Î)`.
 *
 * Every value in this function is reduced and dimensionless. The thermodynamic
 * constants are dimensionless; therefore `m̂_OH = Kw_c / m̂_H` and
 * `m̂_A/m̂_HA = Ka_c / m̂_H` are legal ratios. Physical molality is formed only
 * after the solver returns, by multiplying a reduced value by m°.
 */
type SpeciesEvaluation = {
  readonly species: ReducedSpeciesMolalities;
  readonly activities: DaviesActivities;
  readonly indicatorForms?: DiproticIndicatorReducedForms;
};

function speciesAt(
  hydrogen: number,
  ionicStrength: ReducedIonicStrength,
  input: ReducedSolveInput,
): SpeciesEvaluation {
  if (!Number.isFinite(hydrogen) || hydrogen <= 0) {
    throw new RangeError("reduced hydrogen molality must be finite and positive");
  }

  const activities = daviesActivities(ionicStrength, input.constants);
  const hydrogenGamma = activities.hydrogen.value;
  const hydroxideGamma = activities.hydroxide.value;
  const anionGamma = activities.monovalentAnion.value;
  const neutralGamma = activities.neutralAcid.value;
  const kwConditional =
    input.constants.Kw.value / (hydrogenGamma * hydroxideGamma);
  const kaConditional =
    input.constants.Ka_HOAc.value * neutralGamma / (hydrogenGamma * anionGamma);
  const hydroxide = reducedMolality(kwConditional / hydrogen);
  const acidFamily = input.totals.totalAcidFamilyMolality;
  const dissociatedAcid = reducedMolality(
    acidFamily.value * kaConditional / (kaConditional + hydrogen),
  );
  const neutralAcid = reducedMolality(acidFamily.value - dissociatedAcid.value);
  const conjugateBase = dissociatedAcid;
  const indicatorForms = input.indicator === undefined
    ? undefined
    : calculateDiproticIndicatorForms(input.indicator.totalMolality, {
        constants: input.indicator.constants,
        hydrogenActivity: activity(hydrogenGamma * hydrogen),
        monovalentAnionActivityCoefficient: activities.monovalentAnion,
        divalentAnionActivityCoefficient: activities.divalentAnion,
      });

  return {
    species: Object.freeze({
      hydrogen: reducedMolality(hydrogen),
      hydroxide,
      neutralAcid,
      conjugateBase,
      sodium: input.totals.strongBaseSodiumMolality,
      chloride: input.totals.strongAcidChlorideMolality,
    }),
    activities,
    ...(indicatorForms === undefined ? {} : { indicatorForms }),
  };
}

function ionicStrengthFromEvaluation(
  evaluated: Pick<SpeciesEvaluation, "species" | "indicatorForms">,
): ReducedIonicStrength {
  const base = ionicStrengthFromSpecies(evaluated.species).value;
  const indicator = evaluated.indicatorForms;
  if (indicator === undefined) return reducedIonicStrength(base);
  return reducedIonicStrength(
    base +
      0.5 *
        (indicator.intermediateMonoanionMolality.value +
          4 * indicator.quinoidBaseMolality.value),
  );
}

function chargeResidualFromEvaluation(
  evaluated: Pick<SpeciesEvaluation, "species" | "indicatorForms">,
): number {
  const base = chargeResidualFromSpecies(evaluated.species);
  const indicator = evaluated.indicatorForms;
  if (indicator === undefined) return base;
  return base -
    indicator.intermediateMonoanionMolality.value -
    2 * indicator.quinoidBaseMolality.value;
}

function candidateAt(
  hydrogen: number,
  ionicStrength: ReducedIonicStrength,
  input: ReducedSolveInput,
  innerIterations: number,
): Candidate {
  const evaluated = speciesAt(hydrogen, ionicStrength, input);
  return {
    species: evaluated.species,
    ionicStrength,
    reducedChargeResidual: chargeResidualFromEvaluation(evaluated),
    innerIterations,
    ...(evaluated.indicatorForms === undefined
      ? {}
      : { indicatorForms: evaluated.indicatorForms }),
  };
}

/**
 * Expose the scientific outer residual for acceptance sweeps only.
 *
 * This is deliberately a reduced, diagnostic boundary rather than a second
 * solver API: callers must provide the model-owned reduced analytical totals,
 * and a failure is returned when the legal Davies fixed point cannot be
 * evaluated. The production adapter remains the only public solve boundary.
 */
export function evaluateOuterResidualAtHydrogen(
  input: ReducedSolveInput,
  hydrogen: number,
): number | ReducedSolveFailure {
  try {
    validateInput(input);
    const candidate = solveInner(hydrogen, input);
    if ("kind" in candidate) return candidate;
    return candidate.reducedChargeResidual;
  } catch (error) {
    if (error instanceof DaviesDomainError) return failOutOfDomain(error.message);
    if (error instanceof RangeError) {
      return failNotConverged("INVALID_NUMERIC_ARGUMENT", error.message, 0);
    }
    throw error;
  }
}

function ionicStrengthResidual(
  hydrogen: number,
  ionicStrength: ReducedIonicStrength,
  input: ReducedSolveInput,
): number {
  const evaluated = speciesAt(hydrogen, ionicStrength, input);
  return ionicStrengthFromEvaluation(evaluated).value - ionicStrength.value;
}

function solveInner(
  hydrogen: number,
  input: ReducedSolveInput,
): Candidate | ReducedSolveFailure {
  let lower = reducedIonicStrength(0);
  let upper = reducedIonicStrength(IONIC_STRENGTH_UPPER);
  let lowerResidual = ionicStrengthResidual(hydrogen, lower, input);
  let upperResidual = ionicStrengthResidual(hydrogen, upper, input);

  if (lowerResidual < 0) {
    return failNotConverged(
      "INNER_BRACKET_NOT_FOUND",
      "inner ionic-strength fixed-point bracket could not be established",
      0,
      upperResidual,
    );
  }
  if (upperResidual > INNER_TOLERANCE) {
    return failOutOfDomain(
      `ionic-strength fixed point exceeds the v0 limit of ${IONIC_STRENGTH_UPPER} mol/kg`,
    );
  }
  if (Math.abs(lowerResidual) <= INNER_TOLERANCE) {
    return candidateAt(hydrogen, lower, input, 0);
  }
  if (Math.abs(upperResidual) <= INNER_TOLERANCE) {
    return candidateAt(hydrogen, upper, input, 0);
  }

  for (let iteration = 1; iteration <= INNER_ITERATION_LIMIT; iteration += 1) {
    const midpointValue = lower.value + 0.5 * (upper.value - lower.value);
    const midpoint = reducedIonicStrength(midpointValue);
    const midpointResidual = ionicStrengthResidual(hydrogen, midpoint, input);
    if (Math.abs(midpointResidual) <= INNER_TOLERANCE) {
      return candidateAt(hydrogen, midpoint, input, iteration);
    }

    const collapsed = midpointValue === lower.value || midpointValue === upper.value;
    if (midpointResidual > 0) {
      lower = midpoint;
      lowerResidual = midpointResidual;
    } else {
      upper = midpoint;
      upperResidual = midpointResidual;
    }
    if (collapsed) {
      const finalValue = reducedIonicStrength(lower.value + 0.5 * (upper.value - lower.value));
      const finalResidual = ionicStrengthResidual(hydrogen, finalValue, input);
      if (Math.abs(finalResidual) <= INNER_TOLERANCE) {
        return candidateAt(hydrogen, finalValue, input, iteration);
      }
      return failNotConverged(
        "INNER_ITERATION_LIMIT",
        "inner ionic-strength solve reached a floating-point interval without meeting tolerance",
        iteration,
        finalResidual,
      );
    }
  }

  const finalValue = reducedIonicStrength(lower.value + 0.5 * (upper.value - lower.value));
  return failNotConverged(
    "INNER_ITERATION_LIMIT",
    "inner ionic-strength solve reached its iteration limit",
    INNER_ITERATION_LIMIT,
    ionicStrengthResidual(hydrogen, finalValue, input),
  );
}

/**
 * Find the last valid inner solution before an out-of-domain endpoint. The
 * search itself only calls solveInner(), whose entire fixed-point bracket is
 * inside the Davies domain. The returned candidate is therefore valid for the
 * outer solve; the endpoint is used only to establish which side of the
 * charge-balance root the domain boundary occupies.
 */
function locateValidDomainEdge(
  outsideHydrogen: number,
  insideHydrogen: number,
  insideCandidate: Candidate,
  input: ReducedSolveInput,
): DomainEdge | ReducedSolveFailure {
  let outside = outsideHydrogen;
  let inside = insideHydrogen;
  let candidate = insideCandidate;
  for (let iteration = 0; iteration < OUTER_ITERATION_LIMIT; iteration += 1) {
    const midpoint = outside + 0.5 * (inside - outside);
    if (midpoint === outside || midpoint === inside) {
      return { hydrogen: inside, candidate };
    }
    const evaluated = solveInner(midpoint, input);
    if ("kind" in evaluated) {
      if (evaluated.kind === "OUT_OF_DOMAIN") {
        outside = midpoint;
        continue;
      }
      return evaluated;
    }
    inside = midpoint;
    candidate = evaluated;
  }
  return { hydrogen: inside, candidate };
}

function boundaryCandidate(
  hydrogen: number,
  input: ReducedSolveInput,
): Candidate {
  return candidateAt(
    hydrogen,
    reducedIonicStrength(IONIC_STRENGTH_UPPER),
    input,
    0,
  );
}

function domainBoundaryRefusal(): ReducedSolveFailure {
  return failOutOfDomain(
    `converged ionic strength is outside the v0 limit of ${IONIC_STRENGTH_UPPER} mol/kg`,
  );
}

/** Solve the v0 system entirely in reduced molality and reduced ionic strength. */
export function solveReduced(
  input: ReducedSolveInput,
): ReducedSolveSuccess | ReducedSolveFailure {
  try {
    validateInput(input);

    if (!Object.is(input.constants.waterActivity.value, 1)) {
      return failOutOfDomain(
        "v0 acid-base model requires the unit water-activity convention",
      );
    }

    const idealRoot = idealHydrogenRoot(input);
    let lower = HYDROGEN_LOWER;
    let upper = HYDROGEN_UPPER;
    let lowerCandidate: Candidate | undefined;
    let upperCandidate: Candidate | undefined;
    let bracketFound = false;

    for (const span of OUTER_BRACKET_SPANS) {
      const candidateLowerSeeds = [
        Math.max(HYDROGEN_LOWER, idealRoot / span),
        Math.max(HYDROGEN_LOWER, idealRoot * 0.5),
      ];
      // Keep every fixed-point evaluation inside the Davies validity domain.
      // When an endpoint crosses that domain, the boundary residual below is
      // used only to classify whether the charge root is reachable inside it.
      const candidateUpper = Math.min(
        HYDROGEN_UPPER,
        IONIC_STRENGTH_UPPER,
        idealRoot * span,
      );
      for (const candidateLower of candidateLowerSeeds) {
        const evaluatedLower = solveInner(candidateLower, input);
        const evaluatedUpper = solveInner(candidateUpper, input);

        if (
          "kind" in evaluatedLower &&
          evaluatedLower.kind === "OUT_OF_DOMAIN" &&
          "kind" in evaluatedUpper &&
          evaluatedUpper.kind === "OUT_OF_DOMAIN"
        ) {
          // Both ends of the concentration-only search interval already
          // require an ionic-strength fixed point outside the Davies domain.
          // Do not widen the interval to prove this with extrapolated
          // activities; the explicit analytical/domain gate owns this refusal.
          return domainBoundaryRefusal();
        }

        if ("kind" in evaluatedLower) {
          if (evaluatedLower.kind !== "OUT_OF_DOMAIN") continue;
          const boundary = boundaryCandidate(candidateLower, input);
          if (boundary.reducedChargeResidual >= -OUTER_TOLERANCE) {
            return domainBoundaryRefusal();
          }
          if (
            ! ("kind" in evaluatedUpper) &&
            evaluatedUpper.reducedChargeResidual > OUTER_TOLERANCE
          ) {
            const edge = locateValidDomainEdge(
              candidateLower,
              candidateUpper,
              evaluatedUpper,
              input,
            );
            if (!("kind" in edge) && edge.candidate.reducedChargeResidual < 0) {
              lower = edge.hydrogen;
              upper = candidateUpper;
              lowerCandidate = edge.candidate;
              upperCandidate = evaluatedUpper;
              bracketFound = true;
              break;
            }
            if (!("kind" in edge)) return domainBoundaryRefusal();
          }
          continue;
        }

        if ("kind" in evaluatedUpper) {
          if (evaluatedUpper.kind !== "OUT_OF_DOMAIN") continue;
          const boundary = boundaryCandidate(candidateUpper, input);
          if (boundary.reducedChargeResidual <= OUTER_TOLERANCE) {
            return domainBoundaryRefusal();
          }
          const edge = locateValidDomainEdge(
            candidateUpper,
            candidateLower,
            evaluatedLower,
            input,
          );
          if (!("kind" in edge) && edge.candidate.reducedChargeResidual > 0) {
            lower = candidateLower;
            upper = edge.hydrogen;
            lowerCandidate = evaluatedLower;
            upperCandidate = edge.candidate;
            bracketFound = true;
            break;
          }
          if (!("kind" in edge)) return domainBoundaryRefusal();
          continue;
        }

        if (
          evaluatedLower.reducedChargeResidual < 0 &&
          evaluatedUpper.reducedChargeResidual > 0
        ) {
          lower = candidateLower;
          upper = candidateUpper;
          lowerCandidate = evaluatedLower;
          upperCandidate = evaluatedUpper;
          bracketFound = true;
          break;
        }
      }
      if (bracketFound) break;
    }

    if (!bracketFound || lowerCandidate === undefined || upperCandidate === undefined) {
      return failNotConverged(
        "OUTER_BRACKET_NOT_FOUND",
        "outer charge-balance bracket could not be established within the valid ionic-strength envelope",
        OUTER_BRACKET_SPANS.length,
      );
    }

    let finalCandidate: Candidate | undefined;
    let outerIterations = 0;

    for (outerIterations = 1; outerIterations <= OUTER_ITERATION_LIMIT; outerIterations += 1) {
      const midpoint = lower + 0.5 * (upper - lower);
      const candidate = solveInner(midpoint, input);
      if ("kind" in candidate) return candidate;
      finalCandidate = candidate;

      if (Math.abs(candidate.reducedChargeResidual) <= OUTER_TOLERANCE) break;
      const collapsed = midpoint === lower || midpoint === upper;
      if (candidate.reducedChargeResidual < 0) lower = midpoint;
      else upper = midpoint;

      if (collapsed) {
        return failNotConverged(
          "OUTER_ITERATION_LIMIT",
          "outer charge-balance interval collapsed before meeting tolerance",
          outerIterations,
          candidate.reducedChargeResidual,
        );
      }
    }

    if (finalCandidate === undefined) {
      return failNotConverged(
        "OUTER_BRACKET_NOT_FOUND",
        "outer charge-balance solve produced no candidate",
        outerIterations,
      );
    }
    if (Math.abs(finalCandidate.reducedChargeResidual) > OUTER_TOLERANCE) {
      return failNotConverged(
        "OUTER_ITERATION_LIMIT",
        "outer charge-balance solve reached its iteration limit",
        outerIterations,
        finalCandidate.reducedChargeResidual,
      );
    }

    const recomputedIonicStrength = ionicStrengthFromEvaluation(finalCandidate);
    if (recomputedIonicStrength.value > IONIC_STRENGTH_UPPER + INNER_TOLERANCE) {
      return failOutOfDomain(
        `converged ionic strength ${recomputedIonicStrength.value} mol/kg ` +
        `exceeds the v0 limit of ${IONIC_STRENGTH_UPPER} mol/kg`,
      );
    }

    return Object.freeze({
      species: finalCandidate.species,
      ionicStrength: recomputedIonicStrength,
      chargeResidual:
        finalCandidate.reducedChargeResidual * input.constants.standardMolality,
      iterations: Object.freeze({
        outer: outerIterations,
        inner: finalCandidate.innerIterations,
      }),
      ...(finalCandidate.indicatorForms === undefined
        ? {}
        : { indicatorForms: finalCandidate.indicatorForms }),
    });
  } catch (error) {
    if (error instanceof DaviesDomainError) {
      return failOutOfDomain(error.message);
    }
    if (error instanceof RangeError) {
      return failNotConverged(
        "INVALID_NUMERIC_ARGUMENT",
        error.message,
        0,
      );
    }
    throw error;
  }
}

/** Solve the accepted ordinary three-form indicator network as a coupled system. */
export function solveReducedWithDiproticIndicator(
  input: ReducedSolveInput & { readonly indicator: ReducedDiproticIndicatorInput },
): ReturnType<typeof solveReduced> {
  return solveReduced(input);
}
