/** Empirical presentation colour, kept separate from chemical state. */
export interface IndicatorColour {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

export interface IndicatorPalette {
  readonly indicatorId: string;
  readonly acidForm: IndicatorColour;
  readonly baseForm: IndicatorColour;
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
export const INDICATOR_COLOUR_PALETTES = Object.freeze({
  phenolphthalein: Object.freeze({
    indicatorId: "phenolphthalein",
    acidForm: Object.freeze({ red: 245, green: 245, blue: 245, alpha: 1 }),
    baseForm: Object.freeze({ red: 235, green: 92, blue: 164, alpha: 1 }),
    provenance: Object.freeze({
      kind: "empirical-observable" as const,
      reference: "owner-approved-v0-indicator-reference-swatch",
      note: "Endpoint tokens are an empirical presentation approximation.",
    }),
  }),
  "methyl-orange": Object.freeze({
    indicatorId: "methyl-orange",
    acidForm: Object.freeze({ red: 210, green: 48, blue: 48, alpha: 1 }),
    baseForm: Object.freeze({ red: 248, green: 210, blue: 54, alpha: 1 }),
    provenance: Object.freeze({
      kind: "empirical-observable" as const,
      reference: "owner-approved-v0-indicator-reference-swatch",
      note: "Endpoint tokens are an empirical presentation approximation.",
    }),
  }),
});
