/**
 * Empirical presentation tokens. These are not chemical facts and do not
 * select a colour from a component identifier; the observable receives a
 * Scientific Core ratio and interpolates between these declared endpoints.
 */
export interface IndicatorColour {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

export const INDICATOR_COLOUR_TOKENS = Object.freeze({
  acidForm: Object.freeze({ red: 245, green: 245, blue: 245, alpha: 1 }),
  baseForm: Object.freeze({ red: 235, green: 92, blue: 164, alpha: 1 }),
});
