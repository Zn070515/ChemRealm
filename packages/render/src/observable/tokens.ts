/**
 * A qualitative presentation tint, not a calibrated optical observation.
 * `strength` is a bounded presentation interpolation value; it is never
 * opacity, concentration, absorbance, or a Beer–Lambert result.
 */
export interface IndicatorTint {
  readonly srgb: readonly [number, number, number];
  readonly strength: number;
  readonly interpolation: "qualitative-srgb";
}

export interface IndicatorPaletteEndpoint {
  readonly srgb: readonly [number, number, number];
  readonly strength: number;
}

export interface IndicatorPalette {
  readonly indicatorId: string;
  readonly acidForm: IndicatorPaletteEndpoint;
  readonly baseForm: IndicatorPaletteEndpoint;
  readonly provenance: {
    readonly kind: "empirical-observable";
    readonly reference: string;
    readonly note: string;
  };
}

/**
 * Presentation catalogue, not an equilibrium catalogue. Each indicator has
 * its own observed endpoint convention; the ratio interpolation is shared.
 */
export const INDICATOR_PALETTES = Object.freeze({
  phenolphthalein: Object.freeze({
    indicatorId: "phenolphthalein",
    acidForm: Object.freeze({
      srgb: Object.freeze([245, 245, 245]) as readonly [number, number, number],
      strength: 0,
    }),
    baseForm: Object.freeze({
      srgb: Object.freeze([235, 92, 164]) as readonly [number, number, number],
      strength: 1,
    }),
    provenance: Object.freeze({
      kind: "empirical-observable" as const,
      reference: "indicator-palette/phenolphthalein",
      note: "Endpoint tokens are an empirical presentation approximation.",
    }),
  }),
  "methyl-orange": Object.freeze({
    indicatorId: "methyl-orange",
    acidForm: Object.freeze({
      srgb: Object.freeze([210, 48, 48]) as readonly [number, number, number],
      strength: 1,
    }),
    baseForm: Object.freeze({
      srgb: Object.freeze([248, 210, 54]) as readonly [number, number, number],
      strength: 1,
    }),
    provenance: Object.freeze({
      kind: "empirical-observable" as const,
      reference: "indicator-palette/methyl-orange",
      note: "Endpoint tokens are an empirical presentation approximation.",
    }),
  }),
});
