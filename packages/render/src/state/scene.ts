import { type IndicatorColour } from "../observable/color.js";
import { type ObservableModel } from "../observable/index.js";

export type RenderNodeKind = "group" | "shape" | "text";

export interface RenderNode {
  readonly id: string;
  readonly kind: RenderNodeKind;
  readonly zIndex: number;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface RenderState {
  readonly version: number;
  readonly nodes: readonly RenderNode[];
}

function frozenData(data: Record<string, unknown>): Readonly<Record<string, unknown>> {
  return Object.freeze(data);
}

function indicatorShape(id: string, color: IndicatorColour, zIndex: number): RenderNode {
  return Object.freeze({
    id,
    kind: "shape" as const,
    zIndex,
    data: frozenData({ color }),
  });
}

/** Convert observable data to generic scene nodes; no chemistry is inspected. */
export function toRenderState(model: ObservableModel): RenderState {
  const nodes: RenderNode[] = [
    Object.freeze({
      id: "observable-root",
      kind: "group",
      zIndex: 0,
      data: frozenData({ observableVersion: model.version }),
    }),
    Object.freeze({
      id: "liquid-level",
      kind: "shape",
      zIndex: 10,
      data: frozenData({ height: model.liquidLevel.height }),
    }),
    Object.freeze({
      id: "taught-ph-readout",
      kind: "text",
      zIndex: 20,
      data: frozenData({ text: model.readouts.taughtPh }),
    }),
    Object.freeze({
      id: "model-ph-readout",
      kind: "text",
      zIndex: 20,
      data: frozenData({ text: model.readouts.modelPh }),
    }),
  ];

  if (model.buretteReading !== undefined) {
    nodes.push(
      Object.freeze({
        id: "burette-reading",
        kind: "text",
        zIndex: 20,
        data: frozenData({ text: `${model.buretteReading.toFixed(2)} L` }),
      }),
    );
  }

  if (!model.readouts.withinProposedAccuracyEnvelope) {
    nodes.push(
      Object.freeze({
        id: "accuracy-qualification",
        kind: "text",
        zIndex: 30,
        data: frozenData({ text: "outside proposed accuracy envelope" }),
      }),
    );
  }

  model.indicators.forEach((indicator, index) => {
    nodes.push(indicatorShape(`indicator-${index}`, indicator.color, 15));
  });

  return Object.freeze({ version: model.version, nodes: Object.freeze(nodes) });
}
