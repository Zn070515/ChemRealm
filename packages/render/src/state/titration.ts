import { VERSION_MANIFEST } from "@chemrealm/schema";
import { validateApparatusAssetManifest } from "../assets/titration-bench.js";
import { toRenderState, type HydrogenIonPresentationPolicy, type RenderNode, type RenderState } from "./scene.js";
import { type ObservableModel } from "../observable/index.js";

function freezeDataValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(freezeDataValue));
  }
  if (typeof value === "object" && value !== null) {
    const copy: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) copy[key] = freezeDataValue(child);
    return Object.freeze(copy);
  }
  return value;
}

function freezeNode(node: RenderNode): RenderNode {
  return Object.freeze({
    ...node,
    data: freezeDataValue(node.data) as Readonly<Record<string, unknown>>,
  });
}

/**
 * Add the M6 apparatus realization to the renderer-neutral scene. This helper
 * only copies already-derived observable values; it does not solve chemistry
 * or resolve a world/content reference.
 */
export function toTitrationRenderState(
  model: ObservableModel,
  policy?: HydrogenIonPresentationPolicy,
): RenderState {
  const asset = validateApparatusAssetManifest();
  const base = toRenderState(model, policy);
  const apparatusNodes: RenderNode[] = [
    freezeNode({
      id: "titration-bench",
      kind: "group",
      zIndex: 1,
      data: {
        assetId: asset.assetId,
        assetVersion: asset.assetVersion,
        visualFamily: asset.visualFamily,
        coordinateUnit: asset.coordinateUnit,
        view: asset.view,
        dimensionsMm: asset.dimensionsMm,
        interactionRegions: asset.interactionRegions,
        accessibilityLabel: asset.accessibilityLabel,
      },
    }),
    freezeNode({
      id: "stand-apparatus",
      kind: "shape",
      zIndex: 2,
      data: {
        assetId: asset.assetId,
        partIds: ["stand.base", "stand.vertical", "stand.clamp"],
        positionMm: [0, 0],
      },
    }),
    freezeNode({
      id: "burette-apparatus",
      kind: "shape",
      zIndex: 4,
      data: {
        assetId: asset.assetId,
        partIds: ["burette.body", "burette.stopcock", "burette.tip"],
        positionMm: [0, 0],
        graduation: asset.graduation,
        semanticPorts: ["burette.outlet"],
      },
    }),
    freezeNode({
      id: "flask-apparatus",
      kind: "shape",
      zIndex: 3,
      data: {
        assetId: asset.assetId,
        partIds: ["flask.body", "flask.neck", "flask.base"],
        positionMm: [0, 0],
        fillHeightMm: model.liquidLevel.height,
        semanticPorts: ["flask.mouth"],
      },
    }),
    freezeNode({
      id: "beaker-apparatus",
      kind: "shape",
      zIndex: 2,
      data: {
        assetId: asset.assetId,
        partIds: ["beaker.body"],
        positionMm: [0, 0],
      },
    }),
    freezeNode({
      id: "apparatus-accessibility",
      kind: "text",
      zIndex: 40,
      data: {
        text: asset.accessibilityLabel,
        assetVersion: VERSION_MANIFEST.representation.apparatusAsset,
      },
    }),
  ];
  return Object.freeze({
    version: base.version,
    nodes: Object.freeze([...apparatusNodes, ...base.nodes]),
  });
}
