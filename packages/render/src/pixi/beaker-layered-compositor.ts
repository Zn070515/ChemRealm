import layerManifest from "../assets/beaker-visual-layer-manifest.json";

export const BEAKER_LAYER_ORDER = Object.freeze([
  "backBody",
  "liquidBody",
  "surface",
  "frontDetail",
  "graduations",
  "interaction",
] as const);

/**
 * The authored 1145×1374 body is placed into the fixed titration-bench
 * logical scene at this frame. This is composition layout, not a physical
 * dimension or a substitute for the visual calibration artifact.
 */
export const BEAKER_BODY_SPRITE_FRAME = Object.freeze({
  left: 760,
  top: 290,
  width: 250,
  height: 300,
});

export interface BeakerLayeredCompositionPlan {
  readonly assetId: "beaker-250ml";
  readonly measurementUse: "forbidden";
  readonly fillFraction: number;
  readonly opticalStatus: "observed" | "unavailable" | "ambiguous";
  readonly layerOrder: typeof BEAKER_LAYER_ORDER;
  readonly sourceManifestSha256: string;
  readonly calibrationSha256: string;
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError("beaker fill fraction must be finite");
  return Math.max(0, Math.min(1, value));
}

export function buildBeakerLayeredCompositionPlan(
  fillFraction: number,
  opticalStatus: BeakerLayeredCompositionPlan["opticalStatus"],
): BeakerLayeredCompositionPlan {
  if (layerManifest.assetId !== "beaker-250ml" || layerManifest.measurementUse !== "forbidden") {
    throw new Error("beaker layered manifest has an invalid asset boundary");
  }
  return Object.freeze({
    assetId: "beaker-250ml",
    measurementUse: "forbidden",
    fillFraction: clampUnit(fillFraction),
    opticalStatus,
    layerOrder: BEAKER_LAYER_ORDER,
    sourceManifestSha256: layerManifest.sourceManifestSha256,
    calibrationSha256: layerManifest.calibrationSha256,
  });
}

export function assertBeakerLayeredCompositionPlan(plan: BeakerLayeredCompositionPlan): void {
  if (plan.measurementUse !== "forbidden") {
    throw new Error("beaker visual composition cannot be measurement geometry");
  }
  if (plan.layerOrder.join(">") !== BEAKER_LAYER_ORDER.join(">")) {
    throw new Error("beaker layer order is not the declared composition order");
  }
}
