import type {
  Activity,
  ActivityCoefficient,
  ThermodynamicConstant,
} from "@chemrealm/schema";

export interface IndicatorInput {
  readonly indicatorId: string;
  readonly kaIn: ThermodynamicConstant;
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
