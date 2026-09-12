/**
 * Composition-level genesis boundary.
 *
 * The World Runtime remains a synchronous event fold and the Scientific Core
 * remains an asynchronous adapter boundary. This module is the place where a
 * scenario's requirements are resolved before the first world event exists;
 * solving a committed world is a later orchestration step.
 */

import {
  COMMAND_SCHEMA_VERSION,
  CURRENT_SCHEMA_VERSION,
  DataProvenanceSchema,
  ScenarioSchema,
  ScenarioSnapshotSchema,
  WorldCreatedSchema,
  kilogram,
  kilogramsPerLitre,
  kilogramsPerMol,
  kelvin,
  litre,
  mol,
  toCanonical,
  type Scenario,
  type ScenarioSnapshot,
  type WorldCreated,
} from "@chemrealm/schema";
import {
  parseSolverRequirements,
  type SolverRegistry,
  type SolverResolution,
} from "@chemrealm/sci";
import {
  createInitialState,
  appendEvent,
  createLog,
  emitCommand,
  reduce,
  scenarioSnapshotHash,
  type SerializedWorldCreated,
  type EventLog,
  type WorldState,
} from "@chemrealm/world";

export interface WorldCreationInput {
  readonly worldId: string;
  /** New worlds are created from authored content, never from a forged snapshot. */
  readonly scenario: unknown;
  readonly seed: number | null;
}

export type CompatibleSolverResolution = Extract<
  SolverResolution,
  { readonly status: "compatible" }
>;

export type WorldCreationResult =
  | {
      readonly accepted: true;
      readonly event: SerializedWorldCreated;
      readonly resolution: CompatibleSolverResolution;
    }
  | {
      readonly accepted: false;
      readonly status: "invalid" | "incompatible" | "unavailable";
      readonly reason: string;
    };

function rejected(
  resolution: Exclude<SolverResolution, CompatibleSolverResolution>,
): Extract<WorldCreationResult, { readonly accepted: false }> {
  return {
    accepted: false,
    status: resolution.status,
    reason: resolution.reason,
  };
}

function finitePositive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`SCENARIO_RESOLUTION_INVALID: ${label} must be finite and positive`);
  }
  return value;
}

/** Normalize conversion round-off so equivalent authoring units hash alike. */
function canonicalNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`SCENARIO_RESOLUTION_INVALID: ${label} must be finite`);
  }
  return Number(value.toPrecision(15));
}

function requiredProvenance(input: unknown, label: string) {
  const parsed = DataProvenanceSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(
      `SCENARIO_RESOLUTION_INVALID: ${label} must carry source-data provenance`,
    );
  }
  return parsed.data;
}

function requiredScenarioComponents(
  snapshot: ScenarioSnapshot,
): readonly string[] {
  return [...new Set(
    snapshot.materials.flatMap((material) =>
      material.composition.map((entry) => entry.soluteId),
    ),
  )].sort();
}

function resolveMaterial(material: Scenario["materials"][number]): ScenarioSnapshot["materials"][number] {
  const density = toCanonical(material.density);
  finitePositive(density.value, `material ${material.materialId} density`);
  const composition = material.solutes.map((solute) => {
    const molarMass = toCanonical(solute.molarMass);
    const molarMassProvenance = requiredProvenance(
      solute.molarMass.provenance,
      `material ${material.materialId} ${solute.soluteId} molar mass`,
    );
    finitePositive(
      molarMass.value,
      `material ${material.materialId} ${solute.soluteId} molar mass`,
    );
    const concentration =
      solute.basis === "molarity"
        ? toCanonical(solute.amountConcentration)
        : undefined;
    const sourceQuantity =
      solute.basis === "molarity" ? solute.amountConcentration : solute.molality;
    if (concentration !== undefined) {
      finitePositive(
        concentration.value,
        `material ${material.materialId} ${solute.soluteId} concentration`,
      );
    } else {
      finitePositive(
        toCanonical(sourceQuantity).value,
        `material ${material.materialId} ${solute.soluteId} molality`,
      );
    }
    return {
      soluteId: solute.soluteId,
      amountConcentration: concentration,
      molality: solute.basis === "molality" ? toCanonical(solute.molality) : undefined,
      molarMass,
      provenance: molarMassProvenance,
      concentrationProvenance:
        requiredProvenance(
          sourceQuantity.provenance,
          `material ${material.materialId} ${solute.soluteId} composition`,
        ),
    };
  });

  const soluteIds = composition.map((entry) => entry.soluteId);
  if (new Set(soluteIds).size !== soluteIds.length) {
    throw new Error(
      `SCENARIO_RESOLUTION_INVALID: material ${material.materialId} solute IDs must be unique`,
    );
  }
  const massBySolute = new Map<string, number>();
  let waterMassPerLitre: number;
  if (material.solutes.length === 0) {
    waterMassPerLitre = density.value;
  } else if (material.solutes[0]!.basis === "molarity") {
    let soluteMassPerLitre = 0;
    for (const entry of composition) {
      const concentration = entry.amountConcentration!;
      const mass = concentration.value * entry.molarMass.value;
      soluteMassPerLitre += mass;
      massBySolute.set(entry.soluteId, concentration.value);
    }
    waterMassPerLitre = density.value - soluteMassPerLitre;
  } else {
    const entry = composition[0]!;
    const molality = entry.molality!;
    waterMassPerLitre = density.value / (1 + molality.value * entry.molarMass.value);
    massBySolute.set(entry.soluteId, molality.value * waterMassPerLitre);
  }

  finitePositive(waterMassPerLitre, `material ${material.materialId} resolved water mass`);
  return {
    materialId: material.materialId,
    sourceDefinition: material.label,
    density: {
      value: canonicalNumber(kilogramsPerLitre(density.value), `material ${material.materialId} density`),
      unit: "kg/L",
      provenance: requiredProvenance(
        material.density.provenance,
        `material ${material.materialId} density`,
      ),
    },
    composition: composition.map((entry) => ({
      soluteId: entry.soluteId,
      amountConcentration: {
        value: canonicalNumber(
          entry.amountConcentration?.value ?? massBySolute.get(entry.soluteId)!,
          `material ${material.materialId} ${entry.soluteId} concentration`,
        ),
        unit: "mol/L" as const,
      },
      provenance: entry.concentrationProvenance,
    })),
    molarMasses: composition.map((entry) => ({
      soluteId: entry.soluteId,
      molarMass: {
        value: canonicalNumber(
          kilogramsPerMol(entry.molarMass.value),
          `material ${material.materialId} ${entry.soluteId} molar mass`,
        ),
        unit: "kg/mol" as const,
      },
      provenance: entry.provenance,
    })),
    resolvedInventoryPerLitre: {
      waterMass: {
        value: kilogram(
          canonicalNumber(
            waterMassPerLitre,
            `material ${material.materialId} resolved water mass`,
          ),
        ),
        unit: "kg" as const,
      },
      soluteAmounts: composition.map((entry) => ({
        soluteId: entry.soluteId,
        amount: {
          value: mol(
            canonicalNumber(
              massBySolute.get(entry.soluteId)!,
              `material ${material.materialId} ${entry.soluteId} amount`,
            ),
          ),
          unit: "mol" as const,
        },
      })),
    },
  };
}

/** Resolve authoring content exactly once into the self-contained genesis shape. */
export function resolveScenario(input: unknown): ScenarioSnapshot {
  const scenario = ScenarioSchema.parse(input);
  const materialIds = scenario.materials.map((material) => material.materialId);
  const vesselIds = scenario.vessels.map((vessel) => vessel.vesselId);
  const indicatorIds = scenario.indicators.map((indicator) => indicator.indicatorId);
  if (new Set(materialIds).size !== materialIds.length) {
    throw new Error("SCENARIO_RESOLUTION_INVALID: material IDs must be unique");
  }
  if (new Set(vesselIds).size !== vesselIds.length) {
    throw new Error("SCENARIO_RESOLUTION_INVALID: vessel IDs must be unique");
  }
  if (new Set(indicatorIds).size !== indicatorIds.length) {
    throw new Error("SCENARIO_RESOLUTION_INVALID: indicator IDs must be unique");
  }

  return ScenarioSnapshotSchema.parse({
    scenarioRef: scenario.scenarioRef,
    materials: scenario.materials.map(resolveMaterial),
    vessels: scenario.vessels.map((vessel) => ({
      vesselId: vessel.vesselId,
      kind: vessel.kind,
      capacity: { value: litre(toCanonical(vessel.capacity).value), unit: "L" },
      geometryRef: vessel.geometryRef,
      position: vessel.position,
    })),
    apparatusDefaults: scenario.apparatus.map((entry) => ({
      kind: entry.kind,
      state: { ...entry.state },
    })),
    indicators: scenario.indicators.map((indicator) => ({
      indicatorId: indicator.indicatorId,
      kaIn: { value: toCanonical(indicator.kaIn).value, unit: "1" },
      provenance: requiredProvenance(
        indicator.kaIn.provenance,
        `indicator ${indicator.indicatorId} Ka_in`,
      ),
    })),
    modelRequirements: {
      temperature: {
        value: kelvin(
          canonicalNumber(
            toCanonical(scenario.modelRequirements.temperature).value,
            "scenario model requirement temperature",
          ),
        ),
        unit: "K" as const,
      },
      species: [...scenario.modelRequirements.species],
      solvent: scenario.modelRequirements.solvent,
      phase: scenario.modelRequirements.phase,
      activityCorrected: scenario.modelRequirements.activityCorrected,
    },
  });
}

/** Resolve requirements before emitting the only legal genesis event. */
export function createWorld(
  registry: SolverRegistry,
  input: WorldCreationInput,
): WorldCreationResult {
  let snapshot: ScenarioSnapshot;
  try {
    snapshot = resolveScenario(input.scenario);
  } catch (error) {
    return {
      accepted: false,
      status: "invalid",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  const requirements = parseSolverRequirements(snapshot.modelRequirements);
  const resolution = registry.resolve(requirements, {
    requiredComponents: requiredScenarioComponents(snapshot),
  });
  if (resolution.status !== "compatible") return rejected(resolution);

  const event: WorldCreated = WorldCreatedSchema.parse({
    seq: 0,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    type: "WorldCreated",
    payload: {
      worldId: input.worldId,
      scenarioSnapshot: snapshot,
      contentHash: scenarioSnapshotHash(snapshot),
      solverConfig: resolution.solverConfig,
      seed: input.seed,
    },
  });

  // Exercise the same genesis validation the runtime applies to a loaded log.
  // This keeps the composition boundary from emitting an event it cannot fold.
  createInitialState(event);
  return { accepted: true, event, resolution };
}

export type ScenarioWorldCreationResult =
  | {
      readonly accepted: true;
      readonly event: SerializedWorldCreated;
      readonly events: EventLog;
      readonly state: WorldState;
      readonly resolution: CompatibleSolverResolution;
    }
  | {
      readonly accepted: false;
      readonly status: "incompatible" | "unavailable" | "invalid";
      readonly reason: string;
    };

/** Resolve authored initial contents into ordinary domain events after genesis. */
export function createWorldFromScenario(
  registry: SolverRegistry,
  input: Omit<WorldCreationInput, "scenario"> & { readonly scenario: unknown },
): ScenarioWorldCreationResult {
  let scenario: Scenario;
  try {
    scenario = ScenarioSchema.parse(input.scenario);
  } catch (error) {
    return {
      accepted: false,
      status: "invalid",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  let genesis: WorldCreationResult;
  try {
    genesis = createWorld(registry, {
      worldId: input.worldId,
      scenario,
      seed: input.seed,
    });
  } catch (error) {
    return {
      accepted: false,
      status: "invalid",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  if (!genesis.accepted) return genesis;

  let events = createLog(genesis.event);
  let state = createInitialState(genesis.event);
  for (const vessel of scenario.vessels) {
    for (const initial of vessel.initialContents) {
      const emission = emitCommand(state, {
        schemaVersion: COMMAND_SCHEMA_VERSION,
        type: "ChargeVessel",
        vesselId: vessel.vesselId,
        materialId: initial.materialId,
        volume: initial.volume,
      });
      if (!emission.accepted) {
        return { accepted: false, status: "invalid", reason: emission.detail };
      }
      events = appendEvent(events, emission.event);
      state = reduce(state, emission.event);
    }
  }
  return { accepted: true, event: genesis.event, events, state, resolution: genesis.resolution };
}
