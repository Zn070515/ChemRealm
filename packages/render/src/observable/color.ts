import {
  INDICATOR_COLOUR_PALETTES,
  type IndicatorColour,
} from "./tokens.js";

export { INDICATOR_COLOUR_PALETTES } from "./tokens.js";
export type { IndicatorColour, IndicatorPalette } from "./tokens.js";

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
 * equilibrium constant, activity, or chemical component semantics are
 * inspected; the identity selects only a declared empirical palette.
 */
export function mapIndicatorRatioToColor(
  indicatorId: string,
  ratio: number,
): IndicatorColour {
  const palette = INDICATOR_COLOUR_PALETTES[
    indicatorId as keyof typeof INDICATOR_COLOUR_PALETTES
  ];
  if (palette === undefined) {
    throw new RangeError(`no empirical indicator palette: ${indicatorId}`);
  }
  const validRatio = finiteNonNegative(ratio, "indicator protonation ratio");
  const fraction = validRatio / (1 + validRatio);
  const acid = palette.acidForm;
  const base = palette.baseForm;

  return Object.freeze({
    red: mix(acid.red, base.red, fraction),
    green: mix(acid.green, base.green, fraction),
    blue: mix(acid.blue, base.blue, fraction),
    alpha: mix(acid.alpha, base.alpha, fraction),
  });
}
