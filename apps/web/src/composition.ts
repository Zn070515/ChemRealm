import {
  COMMAND_SCHEMA_VERSION,
  kilogram,
  kelvin,
  litre,
  mol,
  thermodynamicConstant,
  type SolveRequest,
} from "@chemrealm/schema";
import {
  ACID_BASE_COMPONENT_CATALOG,
  DEFAULT_ACID_BASE_CONSTANTS,
  SolverRegistry,
  createAcidBaseAdapter,
  createScientificExpressions,
  projectScientificFrame,
  type ScientificFrame,
  type SolverAdapter,
} from "@chemrealm/sci";
import {
  buildObservableModel,
  toRenderState,
  type BuretteInput,
  type ObservableModel,
  type RenderState,
} from "@chemrealm/render";
import {
  appendEvent,
  createInitialState,
  createLog,
  emitCommand,
  reduce,
  replay,
  stateHash,
  type EventLog,
  type WorldState,
} from "@chemrealm/world";

import { createWorldFromScenario } from "./world-creation.js";
import { productionTitrationScenario } from "./production-scenario.js";

const TARGET_VESSEL_ID = "titration-flask";
const SOURCE_VESSEL_ID = "titrant-burette";
const DELIVERY_VOLUMES = [0.01, 0.01, 0.005] as const;

export interface ProductionTitrationComposition {
  readonly worldId: string;
  readonly eventLog: EventLog;
  readonly state: WorldState;
  readonly frame: ScientificFrame;
  readonly observable: ObservableModel;
  readonly renderState: RenderState;
}

function targetContents(state: WorldState) {
  const contents = state.canonical.byVessel[TARGET_VESSEL_ID];
  if (contents === undefined) throw new Error("production composition: target contents are missing");
  return contents;
}

function targetProfile(state: WorldState) {
  const vessel = state.scenarioSnapshot.vessels.find(
    (candidate) => candidate.vesselId === TARGET_VESSEL_ID,
  );
  if (vessel === undefined) throw new Error("production composition: target profile is missing");
  return vessel.volumeProfile;
}

function solveRequestFromState(state: WorldState): SolveRequest {
  const contents = targetContents(state);
  const solutes = contents.componentAmounts.map((component) => {
    const entry = ACID_BASE_COMPONENT_CATALOG.get(component.componentId as never);
    if (entry === undefined) {
      throw new Error(`production composition: unsupported component ${component.componentId}`);
    }
    if (entry.mode === "monoprotic-equilibrium") {
      return {
        soluteId: component.componentId,
        amount: mol(component.amount),
        mode: entry.mode,
        ka: thermodynamicConstant(DEFAULT_ACID_BASE_CONSTANTS.Ka_HOAc.value),
      };
    }
    return {
      soluteId: component.componentId,
      amount: mol(component.amount),
      mode: entry.mode,
    };
  });

  return {
    waterMass: kilogram(contents.waterMass),
    liquidVolume: litre(contents.liquidVolume),
    temperature: kelvin(state.scenarioSnapshot.modelRequirements.temperature),
    solutes,
    indicators: state.scenarioSnapshot.indicators.map((indicator) => ({
      indicatorId: indicator.indicatorId,
      kaIn: thermodynamicConstant(indicator.kaIn.value),
    })),
  };
}

function exactAdapterForState(
  registry: SolverRegistry,
  state: WorldState,
): SolverAdapter {
  const lookup = registry.lookup(state.solverConfig.id, state.solverConfig.version);
  if (lookup.status !== "found") {
    throw new Error(`production composition: ${lookup.reason}`);
  }
  return lookup.adapter;
}

function statesAtCommittedTargetPrefixes(eventLog: EventLog): readonly WorldState[] {
  const states: WorldState[] = [];
  for (let length = 1; length <= eventLog.length; length += 1) {
    const prefix = eventLog.slice(0, length);
    const state = replay(prefix).state;
    const contents = state.canonical.byVessel[TARGET_VESSEL_ID];
    if (contents !== undefined && contents.liquidVolume > 0) {
      states.push(state);
    }
  }
  return states;
}

async function frameForState(
  state: WorldState,
  adapter: SolverAdapter,
): Promise<ScientificFrame> {
  const result = await adapter.solve(solveRequestFromState(state));
  if (result.status !== "OK") {
    throw new Error(`production composition: solver refused sequence ${state.sequence}: ${result.status}`);
  }
  const profile = targetProfile(state);
  return projectScientificFrame(result.state, {
    sourceStateHash: stateHash(state),
    sequence: state.sequence,
    liquidVolume: litre(targetContents(state).liquidVolume),
    volumeProfileHash: profile.profileHash,
  });
}

function buretteInput(
  finalState: WorldState,
  eventLog: EventLog,
): BuretteInput {
  const sourceContents = finalState.canonical.byVessel[SOURCE_VESSEL_ID];
  if (sourceContents === undefined) {
    throw new Error("production composition: source contents are missing");
  }
  const initialCharge = eventLog.find(
    (event) => event.type === "MaterialCharged" && event.payload.vesselId === SOURCE_VESSEL_ID,
  );
  if (initialCharge?.type !== "MaterialCharged") {
    throw new Error("production composition: source initial volume is missing");
  }
  const deliveredVolumes = eventLog
    .filter((event) => event.type === "TransferCommitted")
    .map((event) => litre(event.payload.volume.value));
  return {
    sourceStateHash: stateHash(finalState),
    sequence: finalState.sequence,
    initialScaleReading: litre(0),
    initialContainedVolume: litre(initialCharge.payload.volume.value),
    deliveredVolumes,
  };
}

/**
 * Production composition boundary for the deterministic M5 inspection surface.
 * Every downstream value is derived from the committed event log and the
 * exact adapter selected by the persisted genesis solver identity.
 */
export async function composeProductionTitration(): Promise<ProductionTitrationComposition> {
  const registry = new SolverRegistry([createAcidBaseAdapter()]);
  const worldId = "m5-production-world";
  const created = createWorldFromScenario(registry, {
    worldId,
    scenario: productionTitrationScenario,
    seed: null,
  });
  if (!created.accepted) throw new Error(`production composition: ${created.reason}`);

  let eventLog = createLog(created.event);
  let state = createInitialState(created.event);
  for (const event of created.events.slice(1)) {
    eventLog = appendEvent(eventLog, event);
    state = reduce(state, event);
  }
  for (const volume of DELIVERY_VOLUMES) {
    const emission = emitCommand(state, {
      schemaVersion: COMMAND_SCHEMA_VERSION,
      type: "DeliverTitrant",
      fromVesselId: SOURCE_VESSEL_ID,
      toVesselId: TARGET_VESSEL_ID,
      volume: { value: volume, unit: "L" },
    });
    if (!emission.accepted) {
      throw new Error(`production composition: delivery rejected: ${emission.detail}`);
    }
    eventLog = appendEvent(eventLog, emission.event);
    state = reduce(state, emission.event);
  }
  const replayed = replay(eventLog);
  state = replayed.state;
  const adapter = exactAdapterForState(registry, state);
  const prefixStates = statesAtCommittedTargetPrefixes(eventLog);
  const frames: ScientificFrame[] = [];
  for (const prefixState of prefixStates) {
    frames.push(await frameForState(prefixState, adapter));
  }
  const finalFrame = frames[frames.length - 1];
  if (finalFrame === undefined) throw new Error("production composition: no target frame was produced");

  const curveFrames = frames.map((frame) => ({
    sourceStateHash: frame.sourceStateHash,
    sequence: frame.sequence,
    modelId: frame.scientificState.provenance.modelId,
    modelVersion: frame.scientificState.provenance.modelVersion,
    volume: frame.physical.liquidVolume,
    taughtHydrogenIonExponent: frame.projection.taughtHydrogenIonExponent,
    modelPh: frame.scientificState.modelPh,
  }));
  const observable = buildObservableModel({
    frame: finalFrame,
    volumeProfileSnapshot: targetProfile(state),
    burette: buretteInput(state, eventLog),
    curveFrames,
    symbolicLines: createScientificExpressions(finalFrame),
  });
  return Object.freeze({
    worldId,
    eventLog,
    state,
    frame: finalFrame,
    observable,
    renderState: toRenderState(observable),
  });
}
