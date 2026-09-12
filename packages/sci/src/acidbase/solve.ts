import {
  reducedIonicStrength,
  reducedMolality,
  type ReducedIonicStrength,
} from "@chemrealm/schema";
import { daviesActivities, type DaviesActivities } from "./activity.js";
import type { AcidBaseComponentTotals } from "./catalog.js";
import type { AcidBaseConstants } from "./model.js";
import {
  chargeResidualFromSpecies,
  ionicStrengthFromSpecies,
  type ReducedSpeciesMolalities,
} from "./species.js";

export interface ReducedSolveInput {
  readonly totals: AcidBaseComponentTotals;
  readonly constants: AcidBaseConstants;
}

export interface ReducedSolveSuccess {
  readonly species: ReducedSpeciesMolalities;
  readonly ionicStrength: ReducedIonicStrength;
  /** Charge residual in mol/kg after the explicit reduced-to-physical boundary. */
  readonly chargeResidual: number;
  readonly iterations: { readonly outer: number; readonly inner: number };
}

export type ReducedSolveFailure =
  | { readonly kind: "OUT_OF_DOMAIN"; readonly reason: string }
  | { readonly kind: "NOT_CONVERGED"; readonly residual: number; readonly iterations: number };

type Candidate = {
  readonly species: ReducedSpeciesMolalities;
  readonly ionicStrength: ReducedIonicStrength;
  readonly reducedChargeResidual: number;
  readonly innerIterations: number;
};

const HYDROGEN_LOWER = 1e-16;
const HYDROGEN_UPPER = 1;
const IONIC_STRENGTH_UPPER = 0.5;
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

function failNotConverged(residual: number, iterations: number): ReducedSolveFailure {
  return {
    kind: "NOT_CONVERGED",
    residual: Number.isFinite(residual) ? residual : 0,
    iterations,
  };
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
function speciesAt(
  hydrogen: number,
  ionicStrength: ReducedIonicStrength,
  input: ReducedSolveInput,
): { readonly species: ReducedSpeciesMolalities; readonly activities: DaviesActivities } {
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
  };
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
    reducedChargeResidual: chargeResidualFromSpecies(evaluated.species),
    innerIterations,
  };
}

function ionicStrengthResidual(
  hydrogen: number,
  ionicStrength: ReducedIonicStrength,
  input: ReducedSolveInput,
): number {
  const evaluated = speciesAt(hydrogen, ionicStrength, input);
  return ionicStrengthFromSpecies(evaluated.species).value - ionicStrength.value;
}

function solveInner(
  hydrogen: number,
  input: ReducedSolveInput,
): Candidate | ReducedSolveFailure {
  let lower = reducedIonicStrength(0);
  let upper = reducedIonicStrength(IONIC_STRENGTH_UPPER);
  let lowerResidual = ionicStrengthResidual(hydrogen, lower, input);
  let upperResidual = ionicStrengthResidual(hydrogen, upper, input);

  if (lowerResidual < 0 || upperResidual > 0) {
    return failNotConverged(upperResidual, 0);
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
      return failNotConverged(finalResidual, iteration);
    }
  }

  const finalValue = reducedIonicStrength(lower.value + 0.5 * (upper.value - lower.value));
  return failNotConverged(
    ionicStrengthResidual(hydrogen, finalValue, input),
    INNER_ITERATION_LIMIT,
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
      const candidateLower = Math.max(HYDROGEN_LOWER, idealRoot / span);
      const candidateUpper = Math.min(HYDROGEN_UPPER, idealRoot * span);
      const evaluatedLower = solveInner(candidateLower, input);
      const evaluatedUpper = solveInner(candidateUpper, input);
      if ("kind" in evaluatedLower || "kind" in evaluatedUpper) continue;
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

    if (!bracketFound || lowerCandidate === undefined || upperCandidate === undefined) {
      return failNotConverged(0, OUTER_BRACKET_SPANS.length);
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
        return failNotConverged(candidate.reducedChargeResidual, outerIterations);
      }
    }

    if (finalCandidate === undefined) return failNotConverged(0, outerIterations);
    if (Math.abs(finalCandidate.reducedChargeResidual) > OUTER_TOLERANCE) {
      return failNotConverged(finalCandidate.reducedChargeResidual, outerIterations);
    }

    const recomputedIonicStrength = ionicStrengthFromSpecies(finalCandidate.species);
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
    });
  } catch (error) {
    if (error instanceof RangeError) return failNotConverged(0, 0);
    throw error;
  }
}
