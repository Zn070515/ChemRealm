import {
  COMMAND_SCHEMA_VERSION,
  litre,
  type Scenario,
} from "@chemrealm/schema";
import {
  SolverRegistry,
  buildAcidBaseSolveRequest,
  createAcidBaseAdapter,
  createScientificExpressions,
  projectScientificFrame,
  type ScientificFrame,
  type SolverAdapter,
} from "@chemrealm/sci";
import {
  buildObservableModel,
  deriveBuretteState,
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

export interface ProductionTitrationOptions {
  readonly scenario?: Scenario;
  readonly worldId?: string;
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

function solveRequestFromState(state: WorldState) {
  const contents = targetContents(state);
  return buildAcidBaseSolveRequest({
    waterMass: contents.waterMass,
    liquidVolume: litre(contents.liquidVolume),
    temperature: state.scenarioSnapshot.modelRequirements.temperature,
    componentAmounts: contents.componentAmounts,
    indicators: state.scenarioSnapshot.indicators,
  });
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

type TransferCommittedEvent = Extract<
  EventLog[number],
  { type: "TransferCommitted" }
>;

/** Only the committed source→target titrant facts define the curve x-axis. */
export function selectCommittedTitrantTransfers(
  eventLog: EventLog,
): readonly TransferCommittedEvent[] {
  return eventLog.filter(
    (event): event is TransferCommittedEvent =>
      event.type === "TransferCommitted" &&
      event.payload.fromVesselId === SOURCE_VESSEL_ID &&
      event.payload.toVesselId === TARGET_VESSEL_ID,
  );
}

interface TitrationPrefixState {
  readonly state: WorldState;
  readonly deliveredTitrantVolume: ReturnType<typeof litre>;
}

export function statesAtCommittedTargetPrefixes(
  eventLog: EventLog,
): readonly TitrationPrefixState[] {
  const relevant = selectCommittedTitrantTransfers(eventLog);
  if (relevant.length === 0) {
    throw new Error("production composition: no committed titrant transfers found");
  }
  const firstIndex = eventLog.findIndex((event) => event === relevant[0]);
  if (firstIndex < 1) {
    throw new Error("production composition: titrant transfer precedes genesis");
  }

  const initialState = replay(eventLog.slice(0, firstIndex)).state;
  const initialContents = initialState.canonical.byVessel[TARGET_VESSEL_ID];
  if (initialContents === undefined || initialContents.liquidVolume <= 0) {
    throw new Error("production composition: target initial state is missing");
  }

  const states: TitrationPrefixState[] = [{
    state: initialState,
    deliveredTitrantVolume: litre(0),
  }];
  let delivered = 0;
  for (const event of relevant) {
    const eventIndex = eventLog.findIndex((candidate) => candidate === event);
    if (eventIndex < 0) throw new Error("production composition: transfer index is missing");
    delivered += event.payload.volume.value;
    states.push({
      state: replay(eventLog.slice(0, eventIndex + 1)).state,
      deliveredTitrantVolume: litre(delivered),
    });
  }
  return Object.freeze(states);
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
  const initialCharges = eventLog.filter(
    (event) => event.type === "MaterialCharged" && event.payload.vesselId === SOURCE_VESSEL_ID,
  );
  if (initialCharges.length !== 1 || initialCharges[0]?.type !== "MaterialCharged") {
    throw new Error("production composition: source must have exactly one initial charge");
  }
  const deliveredVolumes = selectCommittedTitrantTransfers(eventLog)
    .map((event) => litre(event.payload.volume.value));
  const input: BuretteInput = {
    sourceStateHash: stateHash(finalState),
    sequence: finalState.sequence,
    initialScaleReading: litre(0),
    initialContainedVolume: litre(initialCharges[0].payload.volume.value),
    deliveredVolumes,
  };
  const derived = deriveBuretteState(input);
  const discrepancy = Math.abs(derived.containedVolume - sourceContents.liquidVolume);
  const comparisonBound = Number.EPSILON *
    Math.max(1, Math.abs(derived.containedVolume), Math.abs(sourceContents.liquidVolume)) * 32;
  if (discrepancy > comparisonBound) {
    throw new Error("production composition: burette derivation disagrees with world source volume");
  }
  return input;
}

/**
 * Production composition boundary for the deterministic M5 inspection surface.
 * Every downstream value is derived from the committed event log and the
 * exact adapter selected by the persisted genesis solver identity.
 */
export async function composeProductionTitration(
  options: ProductionTitrationOptions = {},
): Promise<ProductionTitrationComposition> {
  const registry = new SolverRegistry([createAcidBaseAdapter()]);
  const scenario = options.scenario ?? productionTitrationScenario;
  const worldId = options.worldId ?? (
    scenario === productionTitrationScenario
      ? "m5-production-world"
      : `${scenario.scenarioRef}-world`
  );
  const created = createWorldFromScenario(registry, {
    worldId,
    scenario,
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
  for (const prefix of prefixStates) {
    frames.push(await frameForState(prefix.state, adapter));
  }
  const finalFrame = frames[frames.length - 1];
  if (finalFrame === undefined) throw new Error("production composition: no target frame was produced");

  const curveFrames = frames.map((frame, index) => ({
    sourceStateHash: frame.sourceStateHash,
    sequence: frame.sequence,
    modelId: frame.scientificState.provenance.modelId,
    modelVersion: frame.scientificState.provenance.modelVersion,
    deliveredTitrantVolume: prefixStates[index]!.deliveredTitrantVolume,
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
