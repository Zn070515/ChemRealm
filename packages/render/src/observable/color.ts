import {
  INDICATOR_PALETTES,
  type IndicatorTint,
} from "./tokens.js";

export { INDICATOR_PALETTES } from "./tokens.js";
export type { IndicatorPalette, IndicatorTint } from "./tokens.js";

function finiteNonNegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name}: expected a finite non-negative value`);
  }
  return value;
}

function mix(start: number, end: number, fraction: number): number {
  return start + (end - start) * fraction;
}

function boundedStrength(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name}: expected a finite value in [0, 1]`);
  }
  return value;
}

/**
 * Map a scientific indicator protonation ratio to a qualitative presentation tint.
 *
 * The only numeric operation here is a bounded interpolation fraction. No
 * equilibrium constant, activity, or chemical component semantics are
 * inspected; the identity selects only a declared empirical palette.
 */
export function mapIndicatorRatioToTint(
  indicatorId: string,
  ratio: number,
): IndicatorTint {
  const palette = INDICATOR_PALETTES[
    indicatorId as keyof typeof INDICATOR_PALETTES
  ];
  if (palette === undefined) {
    throw new RangeError(`no empirical indicator palette: ${indicatorId}`);
  }
  const validRatio = finiteNonNegative(ratio, "indicator protonation ratio");
  const fraction = validRatio / (1 + validRatio);
  const acid = palette.acidForm;
  const base = palette.baseForm;

  return Object.freeze({
    srgb: Object.freeze([
      mix(acid.srgb[0], base.srgb[0], fraction),
      mix(acid.srgb[1], base.srgb[1], fraction),
      mix(acid.srgb[2], base.srgb[2], fraction),
    ]) as readonly [number, number, number],
    strength: boundedStrength(
      mix(acid.strength, base.strength, fraction),
      "indicator tint strength",
    ),
    interpolation: "qualitative-srgb" as const,
  });
}
