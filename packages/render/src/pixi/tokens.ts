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
  surfaceInset: 0xe6eef0,
  bench: 0xd8c5ae,
  benchEdge: 0xb19677,
  benchHighlight: 0xf0dfc4,
  metal: 0x4f5b66,
  metalDark: 0x26343b,
  metalMid: 0x748891,
  metalHighlight: 0xaab7c2,
  glass: 0xdcecf1,
  glassEdge: 0x6e8997,
  glassShadow: 0x72969d,
  glassHighlight: 0xffffff,
  liquidNeutral: 0x7aa6ad,
  liquidShadow: 0x416e76,
  text: 0x26333c,
  textMuted: 0x5e747b,
  tick: 0x35444d,
  white: 0xffffff,
  annotation: 0x45646b,
});

export const TITRATION_LOGICAL_SIZE = Object.freeze({
  width: 1200,
  height: 760,
});
