/** Pure event reducer for the World Runtime (`ADR-0002`). */

import {
  DomainEventSchema,
  CURRENT_SCHEMA_VERSION,
  kilogram,
  litre,
  millimetre,
  mol,
  toCanonical,
  type DomainEvent,
  type TransferCommitted,
} from "@chemrealm/schema";

import { quantize } from "./hash.js";
import {
  createInitialState,
  deepFreeze,
  stateHash,
  type RuntimeCanonicalContents,
  type RuntimeComponentAmount,
  type RuntimeVessel,
  type WorldState,
} from "./state.js";

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export type SolverHook = (state: WorldState) => unknown;

export interface ReduceOptions {
  /** M2 injects this seam; M4 can supply the real scientific adapter. */
  readonly solve?: SolverHook;
  /** Test-only equivalent grouping used to exercise the hash quantization boundary. */
  readonly arithmeticPath?: "standard" | "perturbed";
}

export class WorldRuntimeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "WorldRuntimeError";
    this.code = code;
  }
}

function fail(code: string, message: string): never {
  throw new WorldRuntimeError(code, message);
}

function canonicalVolume(value: TransferCommitted["payload"]["volume"]): number {
  return quantize(litre(toCanonical(value).value));
}

function findVessel(state: WorldState, vesselId: string): RuntimeVessel {
  const vessel = state.vessels.find((candidate) => candidate.id === vesselId);
  return vessel ?? fail("VESSEL_NOT_FOUND", `unknown vessel ${vesselId}`);
}

function contentsOf(state: WorldState, vesselId: string): RuntimeCanonicalContents {
  return (
    state.canonical.byVessel[vesselId] ??
    fail("CONTENTS_NOT_FOUND", `no canonical contents for vessel ${vesselId}`)
  );
}

function materialOf(state: WorldState, materialId: string) {
  const material = state.scenarioSnapshot.materials.find(
    (candidate) => candidate.materialId === materialId,
  );
  return material ?? fail("MATERIAL_NOT_FOUND", `unknown material ${materialId}`);
}

function replaceContents(
  state: WorldState,
  updates: Readonly<Record<string, RuntimeCanonicalContents>>,
): WorldState {
  return deepFreeze({
    ...state,
    sequence: state.sequence + 1,
    canonical: {
      byVessel: { ...state.canonical.byVessel, ...updates },
    },
  });
}

function withSequence(state: WorldState, fields: Partial<WorldState>): WorldState {
  return deepFreeze({ ...state, ...fields, sequence: state.sequence + 1 });
}

function addComponentAmounts(
  current: readonly RuntimeComponentAmount[],
  additions: readonly RuntimeComponentAmount[],
  factor: number,
): readonly RuntimeComponentAmount[] {
  const totals = new Map<string, number>();
  for (const entry of current) totals.set(entry.componentId, entry.amount);
  for (const entry of additions) {
    totals.set(entry.componentId, (totals.get(entry.componentId) ?? 0) + entry.amount * factor);
  }
  return [...totals]
    .map(([componentId, amount]) => ({ componentId, amount: mol(amount) }))
    .sort((a, b) => compareIds(a.componentId, b.componentId));
}

function chargeMaterial(
  state: WorldState,
  event: Extract<DomainEvent, { type: "MaterialCharged" }>,
): WorldState {
  const vessel = findVessel(state, event.payload.vesselId);
  const current = contentsOf(state, vessel.id);
  const material = materialOf(state, event.payload.materialId);
  const volume = canonicalVolume(event.payload.volume);
  if (volume <= 0) fail("INVALID_QUANTITY", "charged volume must be greater than zero");
  if (current.liquidVolume + volume > vessel.capacity) {
    fail("CAPACITY_EXCEEDED", `charging ${vessel.id} would exceed its capacity`);
  }

  const inventory = material.resolvedInventoryPerLitre;
  const additions = inventory.soluteAmounts.map((entry) => ({
    componentId: entry.soluteId,
    amount: entry.amount,
  }));
  return replaceContents(state, {
    [vessel.id]: {
      waterMass: kilogram(current.waterMass + inventory.waterMass * volume),
      liquidVolume: litre(current.liquidVolume + volume),
      componentAmounts: addComponentAmounts(current.componentAmounts, additions, volume),
    },
  });
}

function transfer(
  state: WorldState,
  event: TransferCommitted,
  arithmeticPath: ReduceOptions["arithmeticPath"] = "standard",
): WorldState {
  if (event.payload.fromVesselId === event.payload.toVesselId) {
    fail("INVALID_TRANSFER", "source and target vessels must differ");
  }
  const sourceVessel = findVessel(state, event.payload.fromVesselId);
  const targetVessel = findVessel(state, event.payload.toVesselId);
  const source = contentsOf(state, sourceVessel.id);
  const target = contentsOf(state, targetVessel.id);
  const volume = canonicalVolume(event.payload.volume);
  if (volume <= 0) fail("INVALID_QUANTITY", "transfer volume must be greater than zero");
  if (source.liquidVolume <= 0 || volume > source.liquidVolume) {
    fail("INSUFFICIENT_VOLUME", `transfer exceeds source volume in ${sourceVessel.id}`);
  }
  if (target.liquidVolume + volume > targetVessel.capacity) {
    fail("CAPACITY_EXCEEDED", `transfer would exceed target capacity in ${targetVessel.id}`);
  }

  // Read the complete source snapshot before writing either vessel. This is
  // the invariant that prevents the target from receiving a second, already
  // decremented source value.
  const fraction = volume / source.liquidVolume;
  const deltaWater = quantize(
    arithmeticPath === "perturbed"
      ? (source.waterMass / source.liquidVolume) * volume
      : source.waterMass * fraction,
  );
  const sourceByComponent = new Map(
    source.componentAmounts.map((entry) => [entry.componentId, entry.amount] as const),
  );
  const targetByComponent = new Map(
    target.componentAmounts.map((entry) => [entry.componentId, entry.amount] as const),
  );
  const componentIds = new Set([...sourceByComponent.keys(), ...targetByComponent.keys()]);
  const sourceComponents: RuntimeComponentAmount[] = [];
  const targetComponents: RuntimeComponentAmount[] = [];
  for (const componentId of componentIds) {
    const sourceAmount = sourceByComponent.get(componentId) ?? 0;
    const targetAmount = targetByComponent.get(componentId) ?? 0;
    const delta = quantize(
      arithmeticPath === "perturbed"
        ? (sourceAmount / source.liquidVolume) * volume
        : sourceAmount * fraction,
    );
    sourceComponents.push({ componentId, amount: mol(sourceAmount - delta) });
    targetComponents.push({ componentId, amount: mol(targetAmount + delta) });
  }

  return replaceContents(state, {
    [sourceVessel.id]: {
      waterMass: kilogram(source.waterMass - deltaWater),
      liquidVolume: litre(source.liquidVolume - volume),
      componentAmounts: sourceComponents.sort((a, b) => compareIds(a.componentId, b.componentId)),
    },
    [targetVessel.id]: {
      waterMass: kilogram(target.waterMass + deltaWater),
      liquidVolume: litre(target.liquidVolume + volume),
      componentAmounts: targetComponents.sort((a, b) => compareIds(a.componentId, b.componentId)),
    },
  });
}

function placeApparatus(
  state: WorldState,
  event: Extract<DomainEvent, { type: "ApparatusPlaced" }>,
): WorldState {
  if (state.apparatus.some((apparatus) => apparatus.id === event.payload.apparatusId)) {
    fail("DUPLICATE_ID", `apparatus ${event.payload.apparatusId} already exists`);
  }
  return withSequence(state, {
    apparatus: [
      ...state.apparatus,
      {
        id: event.payload.apparatusId,
        kind: event.payload.kind,
        position: {
          unit: "mm",
          x: millimetre(event.payload.position.x),
          y: millimetre(event.payload.position.y),
        },
        state: {},
      },
    ],
  });
}

function attachApparatus(
  state: WorldState,
  event: Extract<DomainEvent, { type: "ApparatusAttached" }>,
): WorldState {
  const hasNode = (id: string) =>
    state.vessels.some((vessel) => vessel.id === id) ||
    state.apparatus.some((apparatus) => apparatus.id === id);
  if (!hasNode(event.payload.childId)) fail("NODE_NOT_FOUND", `unknown child ${event.payload.childId}`);
  if (!hasNode(event.payload.parentId)) fail("NODE_NOT_FOUND", `unknown parent ${event.payload.parentId}`);
  if (event.payload.childId === event.payload.parentId) fail("INVALID_ATTACHMENT", "a node cannot attach to itself");
  return withSequence(state, {
    attachments: [...state.attachments, { ...event.payload }],
  });
}

function branchWorld(
  state: WorldState,
  event: Extract<DomainEvent, { type: "WorldBranched" }>,
): WorldState {
  if (event.payload.parentWorldId !== state.worldId) {
    fail("BRANCH_PARENT_MISMATCH", "branch event parent does not match current world");
  }
  if (event.payload.forkSequence !== state.sequence) {
    fail("BRANCH_SEQUENCE_MISMATCH", "branch event does not identify the current fork point");
  }
  const expectedHash = stateHash(state);
  if (event.payload.forkStateHash !== expectedHash) {
    fail("BRANCH_HASH_MISMATCH", "branch event fork hash does not match parent state");
  }
  return withSequence(state, {
    worldId: event.payload.childWorldId,
    lineage: {
      parentWorldId: event.payload.parentWorldId,
      forkSequence: event.payload.forkSequence,
      forkStateHash: event.payload.forkStateHash,
    },
  });
}

/** Apply one validated domain event without mutating the input state. */
export function reduce(
  state: WorldState | undefined,
  input: unknown,
  options: ReduceOptions = {},
): WorldState {
  const event = DomainEventSchema.parse(input);
  if (state === undefined) {
    if (event.type !== "WorldCreated") {
      fail("GENESIS_REQUIRED", "the first event must be WorldCreated");
    }
    return createInitialState(event);
  }
  if (event.type === "WorldCreated") {
    fail("DUPLICATE_GENESIS", "WorldCreated cannot be reduced after genesis");
  }
  if (event.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    fail("SCHEMA_VERSION_MISMATCH", `unsupported event schema ${event.schemaVersion}`);
  }
  if (event.seq !== state.sequence + 1) {
    fail(
      "SEQUENCE_MISMATCH",
      `expected event seq ${state.sequence + 1}, got ${event.seq}`,
    );
  }

  const next = (() => {
    switch (event.type) {
      case "ApparatusPlaced":
        return placeApparatus(state, event);
      case "ApparatusAttached":
        return attachApparatus(state, event);
      case "MaterialCharged":
        return chargeMaterial(state, event);
      case "TransferCommitted":
        return transfer(state, event, options.arithmeticPath);
      case "WorldBranched":
        return branchWorld(state, event);
    }
  })();

  if (event.type === "TransferCommitted" && options.solve !== undefined) {
    options.solve(next);
  }
  return next;
}
