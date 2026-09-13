import {
  INDICATOR_COLOUR_TOKENS,
  type IndicatorColour,
} from "./tokens.js";

export { INDICATOR_COLOUR_TOKENS } from "./tokens.js";
export type { IndicatorColour } from "./tokens.js";

function finiteNonNegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name}: expected a finite non-negative value`);
  }
  return value;
}

function mix(start: number, end: number, fraction: number): number {
  return start + (end - start) * fraction;
}

/**
 * Map a scientific indicator protonation ratio to an empirical colour.
 *
 * The only numeric operation here is a bounded interpolation fraction. No
 * equilibrium constant, activity, or component identity is inspected.
 */
export function mapIndicatorRatioToColor(ratio: number): IndicatorColour {
  const validRatio = finiteNonNegative(ratio, "indicator protonation ratio");
  const fraction = validRatio / (1 + validRatio);
  const acid = INDICATOR_COLOUR_TOKENS.acidForm;
  const base = INDICATOR_COLOUR_TOKENS.baseForm;

  return Object.freeze({
    red: mix(acid.red, base.red, fraction),
    green: mix(acid.green, base.green, fraction),
    blue: mix(acid.blue, base.blue, fraction),
    alpha: mix(acid.alpha, base.alpha, fraction),
  });
}
