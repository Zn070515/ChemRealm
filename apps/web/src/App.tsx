import {
  SCIENTIFIC_MODEL_HYDROGEN_ION_POLICY,
  TAUGHT_HYDROGEN_ION_POLICY,
  toRenderState,
  type IndicatorColour,
  type RenderNode,
} from "@chemrealm/render";
import { useEffect, useState, type ReactElement } from "react";

import {
  composeProductionTitration,
  type ProductionTitrationComposition,
} from "./composition.js";
import { accuracyEnvelopeProbeScenario } from "./production-scenario.js";

type PolicyId = "taught" | "scientific-model";

const productionCompositionPromises = new Map<
  "default" | "accuracy-probe",
  Promise<ProductionTitrationComposition>
>();

function loadProductionComposition(): Promise<ProductionTitrationComposition> {
  const isAccuracyProbe =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("fixture") === "accuracy-probe";
  const fixture = isAccuracyProbe ? "accuracy-probe" : "default";
  const existing = productionCompositionPromises.get(fixture);
  if (existing !== undefined) return existing;

  const promise = composeProductionTitration(
    isAccuracyProbe
      ? {
          scenario: accuracyEnvelopeProbeScenario,
          worldId: "m5-accuracy-envelope-probe-world",
        }
      : undefined,
  );
  productionCompositionPromises.set(fixture, promise);
  return promise;
}
function textFromNode(node: RenderNode | undefined): string {
  const text = node?.data.text;
  return typeof text === "string" ? text : "";
}

function numberFromNode(node: RenderNode | undefined, key: string): string {
  const value = node?.data[key];
  return typeof value === "number" ? String(value) : "";
}

function colourStyle(colour: IndicatorColour): string {
  return `rgba(${colour.red}, ${colour.green}, ${colour.blue}, ${colour.alpha})`;
}

function selectedPolicy(id: PolicyId) {
  return id === "taught"
    ? TAUGHT_HYDROGEN_ION_POLICY
    : SCIENTIFIC_MODEL_HYDROGEN_ION_POLICY;
}

/**
 * Minimal DOM adapter for the M5 composition evidence. It consumes only the
 * renderer-neutral scene and ObservableModel; chemistry and world mutation
 * stay in the composition/core packages.
 */
export function App({ schemaVersion }: { schemaVersion: number }): ReactElement {
  const [composition, setComposition] = useState<ProductionTitrationComposition>();
  const [failure, setFailure] = useState<string>();
  const [policyId, setPolicyId] = useState<PolicyId>("taught");

  useEffect(() => {
    let active = true;
    void loadProductionComposition().then(
      (value) => {
        if (active) setComposition(value);
      },
      (error: unknown) => {
        if (active) setFailure(error instanceof Error ? error.message : String(error));
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const scene = composition === undefined
    ? undefined
    : toRenderState(composition.observable, selectedPolicy(policyId));
  const pHNode = scene?.nodes.find((node) => node.id.endsWith("-ph-readout"));
  const levelNode = scene?.nodes.find((node) => node.id === "liquid-level");
  const buretteNode = scene?.nodes.find((node) => node.id === "burette-reading");
  const qualificationNode = scene?.nodes.find((node) => node.id === "accuracy-qualification");

  return (
    <main>
      <h1>ChemRealm</h1>
      <p>Schema version <code>{schemaVersion}</code>.</p>

      {composition === undefined && failure === undefined ? (
        <p data-testid="composition-status">Loading committed world…</p>
      ) : undefined}
      {failure !== undefined ? (
        <p data-testid="composition-error" role="alert">{failure}</p>
      ) : undefined}
      {composition !== undefined && scene !== undefined ? (
        <section aria-label="Committed world inspection">
          <h2 data-testid="composition-status">Committed world</h2>
          <dl>
            <div><dt>World ID</dt><dd data-testid="world-id">{composition.worldId}</dd></div>
            <div><dt>Committed sequence</dt><dd data-testid="world-sequence">{composition.frame.sequence}</dd></div>
            <div><dt>Source replay hash</dt><dd data-testid="world-state-hash">{composition.frame.sourceStateHash}</dd></div>
          </dl>

          <section aria-label="Hydrogen ion presentation">
            <h3>Hydrogen-ion readout</h3>
            <p data-testid="ph-readout" data-policy={policyId}>{textFromNode(pHNode)}</p>
            {policyId === "scientific-model" ? (
              <p data-testid="model-ph-convention">
                Model pH uses the IUPAC notional activity convention; activity model: {composition.observable.readouts.activityModel}.
              </p>
            ) : undefined}
            <button
              type="button"
              aria-pressed={policyId === "scientific-model"}
              onClick={() => setPolicyId((current) =>
                current === "taught" ? "scientific-model" : "taught")}
            >
              {policyId === "taught" ? "科学模型" : "教学 pH"}
            </button>
          </section>

          <section aria-label="Physical observables">
            <h3>Physical observables</h3>
            <p data-testid="liquid-level">Liquid level {numberFromNode(levelNode, "height")} mm</p>
            <p data-testid="burette-reading">{textFromNode(buretteNode)}</p>
            {qualificationNode === undefined ? undefined : (
              <p data-testid="accuracy-qualification">{textFromNode(qualificationNode)}</p>
            )}
            {composition.observable.indicators.map((indicator) => (
              <div key={indicator.indicatorId}>
                <span data-testid="indicator-id">{indicator.indicatorId}</span>
                <span
                  data-testid="indicator-swatch"
                  aria-label={`${indicator.indicatorId} empirical colour`}
                  style={{
                    display: "inline-block",
                    width: "1.5rem",
                    height: "1.5rem",
                    backgroundColor: colourStyle(indicator.color),
                  }}
                />
              </div>
            ))}
          </section>

          <section aria-label="Scientific inspection">
            <h3>Scientific inspection</h3>
            <ul data-testid="species-list">
              {composition.observable.species.map((species) => (
                <li key={species.symbol}>{species.symbol}: {species.amount}</li>
              ))}
            </ul>
            <div data-testid="symbolic-expression">
              Scientific Core: {composition.observable.symbolicLines[0]?.expression ?? ""}
            </div>
            <ol data-testid="curve">
              {composition.observable.curve.map((point) => (
                <li key={point.sourceStateHash} data-testid="curve-point">
                  <span data-testid="curve-sequence">{point.sequence}</span>
                  <span data-testid="curve-source">{point.sourceStateHash}</span>
                  <span data-testid="curve-delivered-volume">{point.deliveredTitrantVolume.toFixed(3)} L</span>
                  <span>{point.taughtHydrogenIonExponent.value.toFixed(2)}</span>
                </li>
              ))}
            </ol>
          </section>
        </section>
      ) : undefined}
    </main>
  );
}
