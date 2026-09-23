import { VERSION_MANIFEST, type IndicatorOpticalObservation } from "@chemrealm/schema";
import { type ObservableModel } from "../observable/index.js";

export const BEAKER_SCENE_LAYERS = Object.freeze([
  "glass-back",
  "liquid-body",
  "liquid-surface",
  "state-effects",
  "glass-front",
  "graduation",
  "interaction",
] as const);

export type BeakerLiquidAppearance =
  | {
      readonly status: "observed";
      readonly source: "observable-optical-observation";
      readonly indicatorId: string;
      readonly tintSrgb: readonly [number, number, number];
      readonly tintStrength: number;
    }
  | {
      readonly status: "unavailable" | "ambiguous";
      readonly source: "observable-optical-observation";
      readonly reason: string;
    };

export interface BeakerSceneActor {
  readonly sceneKind: "apparatus-actor";
  readonly assetId: "beaker-250ml";
  readonly assetVersion: string;
  readonly sourceStateHash: string;
  readonly sequence: number;
  readonly runtimeLayers: typeof BEAKER_SCENE_LAYERS;
  readonly interactionPorts: readonly ["beaker.opening", "beaker.spout"];
  readonly geometry: {
    readonly kind: "authored-cavity-perspective-ellipse";
    readonly measurementUse: "forbidden";
    /** Provisional screen-space calibration; never a physical measurement. */
    readonly source: "visual-body-runtime-calibration";
    readonly surface: { readonly kind: "perspective-ellipse" };
  };
  readonly liquid: {
    readonly volumeL: number;
    readonly heightMm: number;
    readonly profileMaxHeightMm: number;
    readonly source: "observable-liquid-level";
    readonly appearance: BeakerLiquidAppearance;
  };
}

function opticalAppearance(
  observations: readonly IndicatorOpticalObservation[],
): BeakerLiquidAppearance {
  const admitted = observations.filter(
    (observation): observation is Extract<IndicatorOpticalObservation, { status: "OPTICAL_MODEL_OK" }> =>
      observation.status === "OPTICAL_MODEL_OK",
  );
  if (admitted.length === 0) {
    const first = observations[0];
    return Object.freeze({
      status: "unavailable",
      source: "observable-optical-observation",
      reason: first === undefined
        ? "no indicator optical observation was supplied"
        : first.status === "OPTICAL_MODEL_OK"
          ? "an admitted optical observation was not available for scene composition"
          : first.reason,
    });
  }
  if (admitted.length > 1) {
    return Object.freeze({
      status: "ambiguous",
      source: "observable-optical-observation",
      reason: "multiple admitted indicator observations cannot be collapsed into one liquid tint",
    });
  }
  const observation = admitted[0]!;
  return Object.freeze({
    status: "observed",
    source: "observable-optical-observation",
    indicatorId: observation.indicatorId,
    tintSrgb: Object.freeze([...observation.tintSrgb]) as readonly [number, number, number],
    tintStrength: observation.tintStrength,
  });
}

/**
 * Build a scene-level beaker actor from one ObservableModel.
 *
 * This is deliberately a representation contract, not a liquid solver. The
 * vessel identity comes from the asset contract, while this first vertical
 * slice uses a provisional screen-space visual calibration for the liquid
 * cavity. The height comes from the validated volume profile, and colour is
 * admitted only when Observable supplies a successful optical observation.
 */
export function buildBeakerSceneActor(model: ObservableModel): BeakerSceneActor {
  return Object.freeze({
    sceneKind: "apparatus-actor",
    assetId: "beaker-250ml",
    assetVersion: VERSION_MANIFEST.representation.apparatusAsset,
    sourceStateHash: model.sourceStateHash,
    sequence: model.sequence,
    runtimeLayers: BEAKER_SCENE_LAYERS,
    interactionPorts: ["beaker.opening", "beaker.spout"] as const,
    geometry: Object.freeze({
      kind: "authored-cavity-perspective-ellipse",
      measurementUse: "forbidden",
      source: "visual-body-runtime-calibration",
      surface: Object.freeze({ kind: "perspective-ellipse" }),
    }),
    liquid: Object.freeze({
      volumeL: model.liquidLevel.volume,
      heightMm: model.liquidLevel.height,
      profileMaxHeightMm: model.liquidLevel.profileMaxHeight,
      source: "observable-liquid-level",
      appearance: opticalAppearance(
        model.indicators.map((indicator) => indicator.opticalObservation),
      ),
    }),
  });
}
