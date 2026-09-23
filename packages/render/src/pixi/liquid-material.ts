import { Filter, GlProgram } from "pixi.js";

export interface BeakerLiquidMaterialActor {
  readonly liquid: {
    readonly appearance:
      | {
          readonly status: "observed";
          readonly source: "observable-optical-observation" | "m6-visual-stress-fixture";
          readonly indicatorId: string;
          readonly tintSrgb: readonly [number, number, number];
          readonly tintStrength: number;
          readonly fixtureId?: "beaker-100ml-blue";
        }
      | {
          readonly status: "unavailable" | "ambiguous";
          readonly source: "observable-optical-observation";
          readonly reason: string;
        };
  };
}

export interface BeakerLiquidMaterialInput {
  readonly opticalStatus: "observed" | "unavailable" | "ambiguous";
  readonly tintSrgb: readonly [number, number, number];
  readonly tintStrength: number;
}

export type BeakerLiquidMaterialPass = "body" | "surface";

/**
 * Neutral is a representation token, not an indicator endpoint palette. It is
 * used only when Observable refuses or cannot provide an optical observation.
 */
const NEUTRAL_LIQUID_SRGB: readonly [number, number, number] = [0.78, 0.84, 0.85];

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError("liquid material value must be finite");
  return Math.max(0, Math.min(1, value));
}

function clampRgb(value: readonly number[]): readonly [number, number, number] {
  if (value.length !== 3) throw new RangeError("liquid material tint must have three channels");
  return [clampUnit(value[0]!), clampUnit(value[1]!), clampUnit(value[2]!)] as const;
}

/**
 * Crosses the Observable -> Pixi material boundary. No indicator identity is
 * forwarded because the renderer must not select a chemical palette.
 */
export function buildBeakerLiquidMaterialInput(
  actor: BeakerLiquidMaterialActor,
): BeakerLiquidMaterialInput {
  const appearance = actor.liquid.appearance;
  if (appearance.status !== "observed") {
    return Object.freeze({
      opticalStatus: appearance.status,
      tintSrgb: NEUTRAL_LIQUID_SRGB,
      tintStrength: 0,
    });
  }
  return Object.freeze({
    opticalStatus: "observed",
    tintSrgb: clampRgb(appearance.tintSrgb),
    tintStrength: clampUnit(appearance.tintStrength),
  });
}

/**
 * Pixi's standard filter vertex contract. The material is intentionally
 * WebGL-only for this first GPU vertical slice; the application already pins
 * Pixi to the stable WebGL backend.
 */
export const BEAKER_LIQUID_VERTEX_GLSL = `
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void)
{
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void)
{
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}
`;

/**
 * Visual-only liquid material. It shades the alpha mask produced by a Pixi
 * Graphics path; it does not calculate Beer–Lambert transmission, chemistry,
 * pH, species, or vessel volume.
 */
export const BEAKER_LIQUID_FRAGMENT_GLSL = `
in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uTintR;
uniform float uTintG;
uniform float uTintB;
uniform float uTintStrength;
uniform float uObserved;
uniform float uPass;
uniform float uWallBand;
uniform float uBottomBand;
uniform float uSurfaceBand;
uniform float uSurfaceRing;
uniform float uTransmission;

void main(void)
{
  vec4 mask = texture2D(uTexture, vTextureCoord);
  if (mask.a <= 0.001) discard;

  vec2 uv = clamp(vTextureCoord, 0.0, 1.0);
  vec3 tint = vec3(uTintR, uTintG, uTintB);
  vec3 neutral = vec3(0.78, 0.84, 0.85);
  vec3 medium = mix(neutral, tint, uObserved * uTintStrength);

  float sideDistance = min(uv.x, 1.0 - uv.x);
  float sideContact = 1.0 - smoothstep(0.0, max(uWallBand, 0.001), sideDistance);
  float bottomContact = smoothstep(1.0 - uBottomBand, 1.0, uv.y);
  float centreLight = 1.0 - smoothstep(0.0, 1.0, abs(uv.x * 2.0 - 1.0));
  float verticalTransmission = mix(1.08, 0.82, smoothstep(0.0, 1.0, uv.y));
  float depth = mix(0.74, 1.0, centreLight) * verticalTransmission;
  vec3 bodyColour = medium * depth;
  vec3 wallColour = mix(bodyColour, medium * 0.58, uObserved * 0.35 + 0.22);
  bodyColour = mix(bodyColour, wallColour, sideContact * 0.84);
  bodyColour = mix(bodyColour, bodyColour * vec3(0.64, 0.82, 1.05), bottomContact * 0.42);

  if (uPass > 0.5) {
    vec2 ellipseUv = (uv - 0.5) * 2.0;
    float ellipseRadius = length(ellipseUv);
    float surfaceRing = 1.0 - smoothstep(1.0 - max(uSurfaceRing, 0.01), 1.0, ellipseRadius);
    float surfaceCentre = 1.0 - smoothstep(0.0, 0.92, ellipseRadius);
    float surfaceResponse = clamp(0.16 + surfaceCentre * 0.50 + surfaceRing * 0.42, 0.0, 1.0);
    vec3 surfaceEdgeColour = mix(bodyColour, medium * 0.62, uObserved * 0.40 + 0.18);
    bodyColour = mix(bodyColour * 0.68, bodyColour * 1.16, surfaceResponse);
    bodyColour = mix(bodyColour, surfaceEdgeColour, surfaceRing * 0.82);
    gl_FragColor = vec4(bodyColour, mask.a * (0.16 + uTransmission * 0.30 + surfaceRing * 0.18));
    return;
  }

  float alpha = mask.a * (uObserved > 0.5 ? 0.46 : 0.12) * uTransmission;
  gl_FragColor = vec4(bodyColour, alpha);
}
`;

function uniformResources(input: BeakerLiquidMaterialInput, pass: BeakerLiquidMaterialPass) {
  return {
    materialUniforms: {
      uTintR: { value: input.tintSrgb[0], type: "f32" as const },
      uTintG: { value: input.tintSrgb[1], type: "f32" as const },
      uTintB: { value: input.tintSrgb[2], type: "f32" as const },
      uTintStrength: { value: input.tintStrength, type: "f32" as const },
      uObserved: { value: input.opticalStatus === "observed" ? 1 : 0, type: "f32" as const },
      uPass: { value: pass === "surface" ? 1 : 0, type: "f32" as const },
      uWallBand: { value: 0.20, type: "f32" as const },
      uBottomBand: { value: 0.24, type: "f32" as const },
      uSurfaceBand: { value: 0.30, type: "f32" as const },
      uSurfaceRing: { value: 0.18, type: "f32" as const },
      uTransmission: { value: 0.92, type: "f32" as const },
    },
  };
}

export function createBeakerLiquidMaterialFilter(
  input: BeakerLiquidMaterialInput,
  pass: BeakerLiquidMaterialPass,
): Filter {
  return new Filter({
    glProgram: GlProgram.from({
      vertex: BEAKER_LIQUID_VERTEX_GLSL,
      fragment: BEAKER_LIQUID_FRAGMENT_GLSL,
      name: "chemrealm-beaker-liquid-material",
    }),
    resources: uniformResources(input, pass),
    antialias: "inherit",
    resolution: "inherit",
  });
}
