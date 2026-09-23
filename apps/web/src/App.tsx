import {
  SCIENTIFIC_MODEL_HYDROGEN_ION_POLICY,
  TAUGHT_HYDROGEN_ION_POLICY,
  toTitrationRenderState,
  type RenderNode,
} from "@chemrealm/render";
import { mountPixiExperiment } from "@chemrealm/render/pixi";
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";

import {
  composeNativeProductionTitration,
  composeProductionTitration,
  type ProductionTitrationComposition,
} from "./composition.js";
import { accuracyEnvelopeProbeScenario } from "./production-scenario.js";

type PolicyId = "taught" | "scientific-model";

const productionCompositionPromises = new Map<string, Promise<ProductionTitrationComposition>>();

function loadProductionComposition(): Promise<ProductionTitrationComposition> {
  const searchParams = typeof window === "undefined"
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search);
  const isAccuracyProbe = searchParams.get("fixture") === "accuracy-probe";
  const isNative = searchParams.get("backend") === "native";
  const fixture = isAccuracyProbe ? "accuracy-probe" : "default";
  const backend = isNative ? "native" : "legacy";
  const key = `${backend}:${fixture}`;
  const existing = productionCompositionPromises.get(key);
  if (existing !== undefined) return existing;

  const options = isAccuracyProbe
    ? {
        scenario: accuracyEnvelopeProbeScenario,
        worldId: "m5-accuracy-envelope-probe-world",
      }
    : {};
  const promise = isNative
    ? composeNativeProductionTitration(
        new URL("/native/chemrealm_sci_core.wasm", window.location.origin),
        options,
      )
    : composeProductionTitration(options);
  productionCompositionPromises.set(key, promise);
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

function srgbStyle(srgb: readonly number[]): string {
  return `rgb(${srgb.join(", ")})`;
}

function beakerActorFromScene(scene: { readonly nodes: readonly RenderNode[] } | undefined) {
  const node = scene?.nodes.find((candidate) => candidate.id === "beaker-apparatus");
  const value = node?.data.sceneActor;
  if (typeof value !== "object" || value === null) return undefined;
  return value as {
    readonly assetId?: unknown;
    readonly sourceStateHash?: unknown;
    readonly runtimeLayers?: unknown;
    readonly liquid?: { readonly appearance?: { readonly status?: unknown } };
  };
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
  const [rendererFailure, setRendererFailure] = useState<string>();
  const [rendererReady, setRendererReady] = useState(false);
  const [policyId, setPolicyId] = useState<PolicyId>("taught");
  const pixiHost = useRef<HTMLDivElement>(null);

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

  const scene = useMemo(
    () => composition === undefined
      ? undefined
      : toTitrationRenderState(composition.observable, selectedPolicy(policyId)),
    [composition, policyId],
  );

  useEffect(() => {
    if (scene === undefined || pixiHost.current === null) return;
    let active = true;
    let mount: Awaited<ReturnType<typeof mountPixiExperiment>> | undefined;
    setRendererFailure(undefined);
    setRendererReady(false);
    void mountPixiExperiment({ host: pixiHost.current, renderState: scene }).then(
      (value) => {
        if (!active) {
          value.destroy();
          return;
        }
        mount = value;
        setRendererReady(true);
      },
      (error: unknown) => {
        if (active) {
          setRendererFailure(error instanceof Error ? error.message : String(error));
        }
      },
    );
    return () => {
      active = false;
      mount?.destroy();
    };
  }, [scene]);
  const pHNode = scene?.nodes.find((node) => node.id.endsWith("-ph-readout"));
  const levelNode = scene?.nodes.find((node) => node.id === "liquid-level");
  const buretteNode = scene?.nodes.find((node) => node.id === "burette-reading");
  const qualificationNode = scene?.nodes.find((node) => node.id === "accuracy-qualification");
  const beakerActor = beakerActorFromScene(scene);
  const beakerLayers = Array.isArray(beakerActor?.runtimeLayers)
    ? beakerActor.runtimeLayers.join(", ")
    : "";

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
          <section aria-label="Titration apparatus visual" data-testid="m6-visual-surface">
            <div
              ref={pixiHost}
              className="pixi-host"
              data-testid="m6-pixi-host"
              role="img"
              aria-label="ChemRealm titration bench visual; essential readings are available below in the inspection panel"
            />
            <p data-testid="m6-renderer-status" role="status">
              {rendererFailure !== undefined
                ? `Apparatus visual unavailable: ${rendererFailure}`
                : rendererReady ? "Ready" : "Loading apparatus visual…"}
            </p>
          </section>
          <dl>
            <div><dt>World ID</dt><dd data-testid="world-id">{composition.worldId}</dd></div>
            <div><dt>Committed sequence</dt><dd data-testid="world-sequence">{composition.frame.sequence}</dd></div>
            <div><dt>Source replay hash</dt><dd data-testid="world-state-hash">{composition.frame.sourceStateHash}</dd></div>
            <div><dt>Scientific backend</dt><dd data-testid="backend-id">{composition.frame.scientificState.provenance.modelId}</dd></div>
            <div><dt>Scientific backend version</dt><dd data-testid="backend-version">{composition.frame.scientificState.provenance.modelVersion}</dd></div>
          </dl>

          <section
            data-testid="beaker-scene-actor"
            data-asset-id={typeof beakerActor?.assetId === "string" ? beakerActor.assetId : undefined}
            data-visual-status="prototype-rejected"
            aria-label="Beaker scene actor"
          >
            <span data-testid="beaker-scene-source">
              {typeof beakerActor?.sourceStateHash === "string" ? beakerActor.sourceStateHash : ""}
            </span>
            <span data-testid="beaker-scene-layers">{beakerLayers}</span>
            <span data-testid="beaker-liquid-appearance">
              {typeof beakerActor?.liquid?.appearance?.status === "string"
                ? beakerActor.liquid.appearance.status
                : "unavailable"}
            </span>
          </section>

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
              <div key={indicator.indicatorId} data-testid="indicator-observation">
                <span data-testid="indicator-id">{indicator.indicatorId}</span>
                <span data-testid="indicator-optical-status">
                  {indicator.opticalObservation.status}
                </span>
                {indicator.opticalContext.totalAmountMol === undefined ? undefined : (
                  <span data-testid="indicator-amount">
                    {String(indicator.opticalContext.totalAmountMol)} mol
                  </span>
                )}
                {indicator.opticalContext.concentrationMolPerLitreText === undefined ? undefined : (
                  <span data-testid="indicator-concentration">
                    {indicator.opticalContext.concentrationMolPerLitreText}
                  </span>
                )}
                {indicator.opticalContext.pathLengthMillimetres === undefined ? undefined : (
                  <span data-testid="indicator-path-length">
                    {String(indicator.opticalContext.pathLengthMillimetres)} mm
                  </span>
                )}
                {indicator.opticalContext.profileId === undefined ? undefined : (
                  <span data-testid="indicator-profile-id">
                    {indicator.opticalContext.profileId}
                  </span>
                )}
                {indicator.opticalContext.profileHash === undefined ? undefined : (
                  <span data-testid="indicator-profile-hash">
                    {indicator.opticalContext.profileHash}
                  </span>
                )}
                {indicator.opticalObservation.status === "OPTICAL_MODEL_OK" ? (
                  <>
                    <span data-testid="indicator-tint-strength">
                      {indicator.opticalObservation.tintStrength}
                    </span>
                    <span data-testid="indicator-transmittance-samples">
                      {indicator.opticalObservation.transmittanceSamples.length}
                    </span>
                    <span
                      data-testid="indicator-swatch"
                      aria-label={`${indicator.indicatorId} optical-model tint`}
                      data-optical-model="true"
                      data-profile-hash={indicator.opticalObservation.profileHash}
                      style={{
                        display: "inline-block",
                        width: "1.5rem",
                        height: "1.5rem",
                        backgroundColor: srgbStyle(indicator.opticalObservation.tintSrgb),
                      }}
                    />
                  </>
                ) : (
                  <p data-testid="indicator-optical-limitation">
                    {indicator.opticalObservation.reason}
                  </p>
                )}
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
