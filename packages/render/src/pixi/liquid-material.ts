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

/** The material must sample the already-rendered pixels behind its mask. */
export const BEAKER_LIQUID_FILTER_BLEND_REQUIRED = true;

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
 * Graphics path and samples the already-rendered pixels behind that mask. The
 * back-buffer sample preserves authored glass response while the bounded
 * material adds a visual medium response. It does not calculate Beer–Lambert
 * transmission, chemistry, pH, species, or vessel volume.
 */
export const BEAKER_LIQUID_FRAGMENT_GLSL = `
in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform sampler2D uBackTexture;
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
  vec4 behind = texture2D(uBackTexture, uv);
  vec3 behindColour = behind.rgb;
  float behindLuma = dot(behindColour, vec3(0.2126, 0.7152, 0.0722));

  float sideDistance = min(uv.x, 1.0 - uv.x);
  float sideContact = 1.0 - smoothstep(0.0, max(uWallBand, 0.001), sideDistance);
  float bottomContact = smoothstep(1.0 - uBottomBand, 1.0, uv.y);
  float horizontalDistance = abs(uv.x * 2.0 - 1.0);
  float centreLight = 1.0 - smoothstep(0.08, 1.0, horizontalDistance);
  float sideTransmission = smoothstep(0.56, 1.0, horizontalDistance);
  float verticalTransmission = mix(1.08, 0.86, smoothstep(0.0, 1.0, uv.y));
  float depth = mix(0.70, 1.0, centreLight) * verticalTransmission;
  // Use the rendered body as the visual carrier instead of discarding it and
  // painting a flat colour card. Bright authored rim/wall response remains
  // visible through the state layer while the admitted tint supplies the
  // medium's broad colour. This is a presentation approximation, not optical
  // or chemical computation.
  vec3 transmittedBody = mix(medium, medium * (0.78 + behindLuma * 0.34), 0.58);
  vec3 authoredHighlight = max(behindColour - vec3(0.64), vec3(0.0)) * 0.92;
  vec3 centralBody = transmittedBody * depth;
  float lowerOpticalPath = smoothstep(0.70, 1.0, uv.y);
  centralBody = mix(centralBody, medium * vec3(0.70, 0.82, 1.16), lowerOpticalPath * 0.24);
  vec3 sideBody = medium * vec3(0.12, 0.28, 1.28) * (0.78 + behindLuma * 0.14);
  vec3 bodyColour = mix(centralBody, sideBody, sideTransmission * 0.96);
  // The target has a broad, quiet centre and denser blue at the optical path
  // near the walls and thick base. These are bounded presentation cues, not
  // Beer-Lambert or chemistry calculations.
  bodyColour = mix(bodyColour, bodyColour * vec3(0.60, 0.78, 1.14), bottomContact * 0.42);
  vec3 wallColour = mix(bodyColour, medium * 0.42 + authoredHighlight * 1.12, uObserved * 0.38 + 0.24);
  bodyColour = mix(bodyColour, wallColour, sideContact * 0.90);
  bodyColour += authoredHighlight * (0.50 + centreLight * 0.24);
  float broadCentreHighlight = exp(-pow((uv.x - 0.48) / 0.34, 2.0));
  float lowerPath = smoothstep(0.58, 1.0, uv.y);
  vec3 centreColour = vec3(0.68, 0.86, 1.0) + authoredHighlight * 0.46;
  vec3 lowerColour = medium * vec3(0.52, 0.74, 1.12) + authoredHighlight * 0.54;
  bodyColour = mix(bodyColour, centreColour, broadCentreHighlight * 0.18);
  bodyColour = mix(bodyColour, lowerColour, lowerPath * 0.26);
  vec3 glassCarrier = behindColour * vec3(0.58, 0.82, 1.16);
  bodyColour = mix(bodyColour, glassCarrier, 0.08 + sideTransmission * 0.12);

  if (uPass > 0.5) {
    vec2 ellipseUv = (uv - 0.5) * 2.0;
    float ellipseRadius = length(ellipseUv);
    float surfaceRing = 1.0 - smoothstep(1.0 - max(uSurfaceRing, 0.01), 1.0, ellipseRadius);
    float surfaceCentre = 1.0 - smoothstep(0.0, 0.92, ellipseRadius);
    float surfaceRim = smoothstep(0.72, 0.98, ellipseRadius);
    float rearEdge = 1.0 - smoothstep(0.0, 0.38, uv.y);
    float frontEdge = smoothstep(0.62, 1.0, uv.y);
    float surfaceResponse = clamp(0.18 + surfaceCentre * 0.44 + surfaceRing * 0.42, 0.0, 1.0);
    vec3 surfaceEdgeColour = mix(bodyColour, medium * 0.62, uObserved * 0.34 + 0.12);
    vec3 surfaceHighlight = mix(vec3(0.88, 0.94, 1.0), medium * 1.32, 0.34)
      + authoredHighlight * (1.18 + rearEdge * 0.12);
    vec3 frontSurface = medium * vec3(0.70, 0.88, 1.10) + authoredHighlight * 0.60;
    vec3 deepSurfaceRim = medium * vec3(0.18, 0.38, 1.28) + authoredHighlight * 0.70;
    bodyColour = mix(bodyColour * 0.84, surfaceHighlight, surfaceResponse * 0.86);
    bodyColour = mix(bodyColour, surfaceEdgeColour, surfaceRing * 0.76);
    bodyColour = mix(bodyColour, deepSurfaceRim, surfaceRim * 0.48);
    bodyColour = mix(bodyColour, frontSurface, frontEdge * 0.32);
    gl_FragColor = vec4(bodyColour, mask.a * (0.30 + uTransmission * 0.36 + surfaceRing * 0.18));
    return;
  }

  float alpha = mask.a * (uObserved > 0.5 ? 0.86 : 0.12) * uTransmission;
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
      uWallBand: { value: 0.24, type: "f32" as const },
      uBottomBand: { value: 0.30, type: "f32" as const },
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
    blendRequired: BEAKER_LIQUID_FILTER_BLEND_REQUIRED,
    antialias: "inherit",
    resolution: "inherit",
  });
}
