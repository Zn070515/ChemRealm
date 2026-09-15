/**
 * Renderer-only material tokens for the first ChemRealm apparatus family.
 *
 * These are not chemical results. Indicator colour is read from the
 * renderer-neutral optical observation node when that node carries an
 * admitted tint; refusal states deliberately fall back to a neutral liquid
 * material rather than inventing an endpoint colour.
 */
export const TITRATION_RENDER_TOKENS = Object.freeze({
  background: 0xe9eef2,
  surface: 0xf7f9fb,
  bench: 0xd8c5ae,
  benchEdge: 0xb19677,
  metal: 0x4f5b66,
  metalHighlight: 0xaab7c2,
  glass: 0xdcecf1,
  glassEdge: 0x6e8997,
  liquidNeutral: 0x7aa6ad,
  text: 0x26333c,
  tick: 0x35444d,
  white: 0xffffff,
});

export const TITRATION_LOGICAL_SIZE = Object.freeze({
  width: 1200,
  height: 760,
});
