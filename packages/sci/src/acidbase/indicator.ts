import type {
  Activity,
  ActivityCoefficient,
  IndicatorChemicalObservation,
  Mol,
  ThermodynamicConstant,
} from "@chemrealm/schema";

export interface IndicatorInput {
  readonly indicatorId: string;
  readonly kaIn: ThermodynamicConstant;
  readonly totalAmount?: Mol;
}

/**
 * The v0 acid-base model exposes only the accepted monoprotic indicator
 * approximation. It must not reinterpret that ratio as a multi-form optical
 * chemistry result. A future model may return `CHEMICAL_FORMS_OK` here after
 * its forms, constants, domain, and references are independently accepted.
 */
export function chemicalFormObservation(
  indicator: IndicatorInput,
  modelId: string,
  modelVersion: string,
  sourceReplayHash: string,
): IndicatorChemicalObservation | undefined {
  if (indicator.totalAmount === undefined) return undefined;
  return {
    status: "CHEMICAL_FORMS_UNAVAILABLE",
    indicatorId: indicator.indicatorId,
    totalAmount: indicator.totalAmount,
    reason:
      "the v0 acid-base model does not resolve this indicator's multi-form chemical model",
    modelId,
    modelVersion,
    sourceReplayHash,
  };
}

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new RangeError(`${name}: expected an object`);
  }
  return value as Record<string, unknown>;
}

function positiveOpaqueValue(value: unknown, name: string): number {
  const record = asRecord(value, name);
  const numericValue = record.value;
  if (typeof numericValue !== "number" || !Number.isFinite(numericValue) || numericValue <= 0) {
    throw new RangeError(`${name}: expected a finite positive value`);
  }
  return numericValue;
}

/**
 * Return m(In⁻) / m(HIn) for the indicator's activity equilibrium.
 *
 * The neutral HIn activity coefficient is the accepted unity convention, so
 * the equation is `KaIn / (aH · gammaIn)`. This function deliberately remains
 * a continuous model calculation outside phenolphthalein's taught interval;
 * validity and approximation labelling belong to the scientific result, not a
 * hidden threshold branch in the equilibrium expression.
 */
export function protonationRatio(
  indicator: IndicatorInput,
  hydrogenActivity: Activity,
  indicatorAnionActivityCoefficient: ActivityCoefficient,
): number {
  const indicatorRecord = asRecord(indicator, "indicator");
  const indicatorId = indicatorRecord.indicatorId;
  if (typeof indicatorId !== "string" || indicatorId.length === 0) {
    throw new RangeError("indicator: expected a non-empty indicator id");
  }

  const kaIn = positiveOpaqueValue(indicatorRecord.kaIn, `${indicatorId} KaIn`);
  const hydrogen = positiveOpaqueValue(hydrogenActivity, "hydrogen activity");
  const anionGamma = positiveOpaqueValue(
    indicatorAnionActivityCoefficient,
    "indicator anion activity coefficient",
  );
  const ratio = kaIn / (hydrogen * anionGamma);
  if (!Number.isFinite(ratio) || ratio < 0) {
    throw new RangeError("indicator protonation ratio is not finite");
  }
  return ratio;
}
