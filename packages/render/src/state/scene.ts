import { type IndicatorOpticalObservation } from "@chemrealm/schema";
import { formatBuretteScaleReading } from "../observable/format.js";
import { type ObservableModel, type ObservableReadouts } from "../observable/index.js";

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

export type HydrogenIonPresentationPolicy =
  | {
      readonly id: "taught";
      readonly readoutId: "taught-ph-readout";
      readonly readoutKey: "taughtPh";
    }
  | {
      readonly id: "scientific-model";
      readonly readoutId: "model-ph-readout";
      readonly readoutKey: "modelPh";
    };

export const TAUGHT_HYDROGEN_ION_POLICY: HydrogenIonPresentationPolicy = Object.freeze({
  id: "taught",
  readoutId: "taught-ph-readout",
  readoutKey: "taughtPh",
});

export const SCIENTIFIC_MODEL_HYDROGEN_ION_POLICY: HydrogenIonPresentationPolicy = Object.freeze({
  id: "scientific-model",
  readoutId: "model-ph-readout",
  readoutKey: "modelPh",
});

function frozenData(data: Record<string, unknown>): Readonly<Record<string, unknown>> {
  return Object.freeze(data);
}

function indicatorShape(
  id: string,
  observation: IndicatorOpticalObservation,
  zIndex: number,
): RenderNode {
  const data: Record<string, unknown> = {
    indicatorId: observation.indicatorId,
    opticalStatus: observation.status,
    sourceReplayHash: observation.sourceReplayHash,
  };
  if (observation.status === "OPTICAL_MODEL_OK") {
    data.tint = Object.freeze({
      srgb: Object.freeze([...observation.tintSrgb]),
      strength: observation.tintStrength,
    });
    data.profileId = observation.profileId;
    data.profileHash = observation.profileHash;
  } else {
    data.tint = undefined;
    data.opticalReason = observation.reason;
    data.missingOrOutOfRange = Object.freeze([...observation.missingOrOutOfRange]);
  }
  return Object.freeze({
    id,
    kind: "shape" as const,
    zIndex,
    data: frozenData(data),
  });
}

function hydrogenIonReadout(
  readouts: ObservableReadouts,
  policy: HydrogenIonPresentationPolicy,
): RenderNode {
  return Object.freeze({
    id: policy.readoutId,
    kind: "text" as const,
    zIndex: 20,
    data: frozenData({ text: readouts[policy.readoutKey] }),
  });
}

/** Convert observable data to generic scene nodes; no chemistry is inspected. */
export function toRenderState(
  model: ObservableModel,
  policy: HydrogenIonPresentationPolicy = TAUGHT_HYDROGEN_ION_POLICY,
): RenderState {
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
    hydrogenIonReadout(model.readouts, policy),
  ];

  if (model.burette !== undefined) {
    nodes.push(
      Object.freeze({
        id: "burette-reading",
        kind: "text",
        zIndex: 20,
        data: frozenData({
          text: formatBuretteScaleReading(model.burette.currentScaleReading),
        }),
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
    nodes.push(indicatorShape(`indicator-${index}`, indicator.opticalObservation, 15));
  });

  return Object.freeze({ version: model.version, nodes: Object.freeze(nodes) });
}
