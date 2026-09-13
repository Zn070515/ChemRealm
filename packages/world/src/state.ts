/**
 * World Runtime state boundary.
 *
 * The schema package owns serialized shapes. This package owns the in-memory
 * state used by reducers: every operational quantity is constructed as a
 * branded canonical value before arithmetic can touch it. Serialization is an
 * explicit boundary in both directions, so a reducer cannot accidentally use
 * `.value` from a wire quantity and forget its unit.
 */

import {
  ApparatusSchema,
  CURRENT_SCHEMA_VERSION,
  DomainEventSchema,
  ScenarioSnapshotSchema,
  WorldCreatedSchema,
  WorldStateSchema as SerializedWorldStateSchema,
  migrateWorld,
  kilogram,
  kilogramsPerLitre,
  kilogramsPerMol,
  kelvin,
  litre,
  millimetre,
  mol,
  molPerLitre,
  thermodynamicConstant,
  toCanonical,
  type Apparatus,
  type DataProvenanceDto,
  type DomainEvent,
  type MaterialSnapshot as SerializedMaterialSnapshot,
  type ScenarioSnapshot as SerializedScenarioSnapshot,
  type VolumeProfileSnapshot as SerializedVolumeProfileSnapshot,
  type VolumeProfileMigrationResolver,
  type SolverConfigDto,
  type WorldCreated as SchemaWorldCreated,
  type WorldState as SchemaWorldState,
} from "@chemrealm/schema";

import { hashCanonical, quantize } from "./hash.js";

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export type SerializedWorldCreated = SchemaWorldCreated;
export type SerializedWorldState = SchemaWorldState;

/** Content-address the self-contained genesis snapshot, including its units. */
export function scenarioSnapshotHash(snapshot: SerializedScenarioSnapshot): string {
  return `sha256:${hashCanonical(snapshot)}`;
}

/** Content-address the profile payload without allowing self-reference. */
export function volumeProfileHash(profile: SerializedVolumeProfileSnapshot): string {
  const { profileHash: _profileHash, ...payload } = profile;
  return "sha256:" + hashCanonical(payload);
}

export type RuntimeDataProvenance = DataProvenanceDto;

export interface RuntimeMaterialSnapshot {
  readonly materialId: string;
  readonly sourceDefinition: string;
  readonly density: {
    readonly value: ReturnType<typeof kilogramsPerLitre>;
    readonly provenance: RuntimeDataProvenance;
  };
  readonly composition: readonly {
    readonly soluteId: string;
    readonly amountConcentration: ReturnType<typeof molPerLitre>;
    readonly provenance: RuntimeDataProvenance;
  }[];
  readonly molarMasses: readonly {
    readonly soluteId: string;
    readonly molarMass: ReturnType<typeof kilogramsPerMol>;
    readonly provenance: RuntimeDataProvenance;
  }[];
  readonly resolvedInventoryPerLitre: {
    readonly waterMass: ReturnType<typeof kilogram>;
    readonly soluteAmounts: readonly {
      readonly soluteId: string;
      readonly amount: ReturnType<typeof mol>;
    }[];
  };
}

export interface RuntimeVesselDefinition {
  readonly vesselId: string;
  readonly kind: string;
  readonly capacity: ReturnType<typeof litre>;
  readonly geometryRef: string;
  readonly volumeProfile: SerializedVolumeProfileSnapshot;
  readonly position: {
    readonly unit: "mm";
    readonly x: ReturnType<typeof millimetre>;
    readonly y: ReturnType<typeof millimetre>;
  };
}

export interface RuntimeScenarioSnapshot {
  readonly scenarioRef: string;
  readonly materials: readonly RuntimeMaterialSnapshot[];
  readonly vessels: readonly RuntimeVesselDefinition[];
  readonly apparatusDefaults: readonly {
    readonly kind: string;
    readonly state: Record<string, unknown>;
  }[];
  readonly indicators: readonly {
    readonly indicatorId: string;
    readonly kaIn: ReturnType<typeof thermodynamicConstant>;
    readonly provenance: RuntimeDataProvenance;
  }[];
  readonly modelRequirements: {
    readonly temperature: ReturnType<typeof kelvin>;
    readonly species: readonly string[];
    readonly solvent: "water";
    readonly phase: "aqueous";
    readonly activityCorrected: boolean;
  };
}

export interface RuntimeVessel {
  readonly id: string;
  readonly kind: string;
  readonly capacity: ReturnType<typeof litre>;
  readonly geometryRef: string;
  readonly position: RuntimeVesselDefinition["position"];
}

export interface RuntimeApparatus {
  readonly id: string;
  readonly kind: string;
  readonly position: RuntimeVesselDefinition["position"];
  readonly state: Record<string, unknown>;
}

export interface RuntimeAttachment {
  readonly childId: string;
  readonly parentId: string;
  readonly portId: string;
}

export interface RuntimeComponentAmount {
  readonly componentId: string;
  readonly amount: ReturnType<typeof mol>;
}

export interface RuntimeCanonicalContents {
  readonly waterMass: ReturnType<typeof kilogram>;
  readonly liquidVolume: ReturnType<typeof litre>;
  readonly componentAmounts: readonly RuntimeComponentAmount[];
}

export interface WorldState {
  readonly schemaVersion: number;
  readonly worldId: string;
  readonly lineage: {
    readonly parentWorldId: string | null;
    readonly forkSequence: number | null;
    readonly forkStateHash: string | null;
  };
  readonly sequence: number;
  readonly solverConfig: SolverConfigDto;
  readonly scenarioSnapshot: RuntimeScenarioSnapshot;
  readonly vessels: readonly RuntimeVessel[];
  readonly apparatus: readonly RuntimeApparatus[];
  readonly attachments: readonly RuntimeAttachment[];
  readonly canonical: {
    readonly byVessel: Readonly<Record<string, RuntimeCanonicalContents>>;
  };
}

function cloneDataProvenance(value: DataProvenanceDto): RuntimeDataProvenance {
  const result: Record<string, unknown> = {
    source: value.source,
    reference: value.reference,
    category: value.category,
  };
  for (const key of ["edition", "version", "uncertainty", "lastVerified"] as const) {
    const optionalValue = value[key];
    if (optionalValue !== undefined) result[key] = optionalValue;
  }
  if (value.temperature !== undefined) result.temperature = { ...value.temperature };
  if (value.pressure !== undefined) result.pressure = { ...value.pressure };
  return result as RuntimeDataProvenance;
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`DUPLICATE_ID: ${label} identifiers must be unique`);
  }
}

const MATERIAL_BALANCE_RELATIVE_TOLERANCE = 1e-12;

function validateMaterialSnapshotSemantics(
  material: RuntimeMaterialSnapshot,
): void {
  const compositionIds = material.composition.map((entry) => entry.soluteId);
  const molarMassIds = material.molarMasses.map((entry) => entry.soluteId);
  const amountIds = material.resolvedInventoryPerLitre.soluteAmounts.map(
    (entry) => entry.soluteId,
  );
  assertUnique(compositionIds, `material ${material.materialId} composition`);
  assertUnique(molarMassIds, `material ${material.materialId} molar mass`);
  assertUnique(amountIds, `material ${material.materialId} inventory`);

  const sorted = (values: readonly string[]) => [...values].sort(compareIds);
  if (
    JSON.stringify(sorted(compositionIds)) !== JSON.stringify(sorted(molarMassIds)) ||
    JSON.stringify(sorted(compositionIds)) !== JSON.stringify(sorted(amountIds))
  ) {
    throw new Error(
      `MATERIAL_INVENTORY_MISMATCH: material ${material.materialId} must carry the same solute identities in composition, molar masses, and resolved inventory`,
    );
  }

  if (!(material.density.value > 0) || !Number.isFinite(material.density.value)) {
    throw new Error(`MATERIAL_INVENTORY_MISMATCH: material ${material.materialId} density must be finite and positive`);
  }
  if (
    !(material.resolvedInventoryPerLitre.waterMass > 0) ||
    !Number.isFinite(material.resolvedInventoryPerLitre.waterMass)
  ) {
    throw new Error(`MATERIAL_INVENTORY_MISMATCH: material ${material.materialId} water mass must be finite and positive`);
  }

  const molarMassById = new Map(
    material.molarMasses.map((entry) => [entry.soluteId, entry.molarMass]),
  );
  const concentrationById = new Map(
    material.composition.map((entry) => [entry.soluteId, entry.amountConcentration]),
  );
  let soluteMass = 0;
  for (const inventory of material.resolvedInventoryPerLitre.soluteAmounts) {
    if (!(inventory.amount > 0) || !Number.isFinite(inventory.amount)) {
      throw new Error(
        `MATERIAL_INVENTORY_MISMATCH: material ${material.materialId} solute ${inventory.soluteId} amount must be finite and positive`,
      );
    }
    const molarMass = molarMassById.get(inventory.soluteId);
    const concentration = concentrationById.get(inventory.soluteId);
    if (
      molarMass === undefined ||
      concentration === undefined ||
      !(molarMass > 0) ||
      !Number.isFinite(molarMass) ||
      !(concentration > 0) ||
      !Number.isFinite(concentration) ||
      Math.abs(inventory.amount - concentration) >
        MATERIAL_BALANCE_RELATIVE_TOLERANCE * Math.max(Math.abs(concentration), Number.EPSILON)
    ) {
      throw new Error(
        `MATERIAL_INVENTORY_MISMATCH: material ${material.materialId} resolved amount for ${inventory.soluteId} does not match its concentration`,
      );
    }
    soluteMass += inventory.amount * molarMass;
  }

  const expectedDensity = material.resolvedInventoryPerLitre.waterMass + soluteMass;
  const scale = Math.max(Math.abs(material.density.value), Math.abs(expectedDensity), Number.EPSILON);
  if (Math.abs(expectedDensity - material.density.value) > MATERIAL_BALANCE_RELATIVE_TOLERANCE * scale) {
    throw new Error(
      `MATERIAL_INVENTORY_MISMATCH: material ${material.materialId} density does not equal water mass plus resolved solute mass`,
    );
  }
}

function parseMaterialSnapshot(dto: SerializedMaterialSnapshot): RuntimeMaterialSnapshot {
  const density = toCanonical(dto.density);
  const material = {
    materialId: dto.materialId,
    sourceDefinition: dto.sourceDefinition,
    density: {
      value: kilogramsPerLitre(density.value),
      provenance: cloneDataProvenance(dto.density.provenance),
    },
    composition: dto.composition.map((entry) => ({
      soluteId: entry.soluteId,
      amountConcentration: molPerLitre(toCanonical(entry.amountConcentration).value),
      provenance: cloneDataProvenance(entry.provenance),
    })),
    molarMasses: dto.molarMasses.map((entry) => ({
      soluteId: entry.soluteId,
      molarMass: kilogramsPerMol(toCanonical(entry.molarMass).value),
      provenance: cloneDataProvenance(entry.provenance),
    })),
    resolvedInventoryPerLitre: {
      waterMass: kilogram(toCanonical(dto.resolvedInventoryPerLitre.waterMass).value),
      soluteAmounts: dto.resolvedInventoryPerLitre.soluteAmounts.map((entry) => ({
        soluteId: entry.soluteId,
        amount: mol(toCanonical(entry.amount).value),
      })),
    },
  };
  validateMaterialSnapshotSemantics(material);
  return material;
}

function parseScenarioSnapshot(dto: SerializedScenarioSnapshot): RuntimeScenarioSnapshot {
  const parsed = ScenarioSnapshotSchema.parse(dto);
  assertUnique(parsed.materials.map((material) => material.materialId), "material");
  assertUnique(parsed.vessels.map((vessel) => vessel.vesselId), "vessel");
  assertUnique(parsed.indicators.map((indicator) => indicator.indicatorId), "indicator");
  return {
    scenarioRef: parsed.scenarioRef,
    materials: parsed.materials.map(parseMaterialSnapshot),
    vessels: parsed.vessels.map((vessel) => {
      if (volumeProfileHash(vessel.volumeProfile) !== vessel.volumeProfile.profileHash) {
        throw new Error(
          "VOLUME_PROFILE_HASH_MISMATCH: vessel " +
            vessel.vesselId +
            " profile checksum does not match its payload",
        );
      }
      if (vessel.volumeProfile.maxVolume.value !== toCanonical(vessel.capacity).value) {
        throw new Error(
          `VOLUME_PROFILE_CAPACITY_MISMATCH: vessel ${vessel.vesselId} profile maximum must equal capacity`,
        );
      }
      return {
        vesselId: vessel.vesselId,
        kind: vessel.kind,
        capacity: litre(toCanonical(vessel.capacity).value),
        geometryRef: vessel.geometryRef,
        volumeProfile: vessel.volumeProfile,
        position: {
          unit: "mm" as const,
          x: millimetre(vessel.position.x),
          y: millimetre(vessel.position.y),
        },
      };
    }),
    apparatusDefaults: parsed.apparatusDefaults.map((entry) => ({
      kind: entry.kind,
      state: { ...entry.state },
    })),
    indicators: parsed.indicators.map((indicator) => ({
      indicatorId: indicator.indicatorId,
      kaIn: thermodynamicConstant(toCanonical(indicator.kaIn).value),
      provenance: cloneDataProvenance(indicator.provenance),
    })),
    modelRequirements: {
      temperature: kelvin(toCanonical(parsed.modelRequirements.temperature).value),
      species: [...parsed.modelRequirements.species],
      solvent: parsed.modelRequirements.solvent,
      phase: parsed.modelRequirements.phase,
      activityCorrected: parsed.modelRequirements.activityCorrected,
    },
  };
}

function parseVessel(vessel: SchemaWorldState["vessels"][number]): RuntimeVessel {
  return {
    id: vessel.id,
    kind: vessel.kind,
    capacity: litre(toCanonical(vessel.capacity).value),
    geometryRef: vessel.geometryRef,
    position: {
      unit: "mm",
      x: millimetre(vessel.position.x),
      y: millimetre(vessel.position.y),
    },
  };
}

function parseApparatus(apparatus: Apparatus): RuntimeApparatus {
  const parsed = ApparatusSchema.parse(apparatus);
  return {
    id: parsed.id,
    kind: parsed.kind,
    position: {
      unit: "mm",
      x: millimetre(parsed.position.x),
      y: millimetre(parsed.position.y),
    },
    state: { ...parsed.state },
  };
}

function parseContents(
  contents: SchemaWorldState["canonical"]["byVessel"][string],
  quantizeContents: boolean,
): RuntimeCanonicalContents {
  const canonicalValue = (value: Parameters<typeof toCanonical>[0]): number => {
    const canonical = toCanonical(value).value;
    return quantizeContents ? quantize(canonical) : canonical;
  };
  return {
    waterMass: kilogram(canonicalValue(contents.waterMass)),
    liquidVolume: litre(canonicalValue(contents.liquidVolume)),
    componentAmounts: contents.componentAmounts
      .map((entry) => ({
        componentId: entry.componentId,
        amount: mol(canonicalValue(entry.amount)),
      }))
      .sort((a, b) => compareIds(a.componentId, b.componentId)),
  };
}

function parseWorldStateUnchecked(dto: SchemaWorldState, quantizeContents: boolean): WorldState {
  assertUnique(dto.vessels.map((vessel) => vessel.id), "vessel");
  assertUnique(dto.apparatus.map((apparatus) => apparatus.id), "apparatus");
  const vesselIds = new Set(dto.vessels.map((vessel) => vessel.id));
  const contentIds = Object.keys(dto.canonical.byVessel);
  if (contentIds.length !== vesselIds.size || contentIds.some((id) => !vesselIds.has(id))) {
    throw new Error("STATE_SHAPE_MISMATCH: canonical contents must have exactly one entry per vessel");
  }
  const byVessel: Record<string, RuntimeCanonicalContents> = {};
  for (const [vesselId, contents] of Object.entries(dto.canonical.byVessel)) {
    byVessel[vesselId] = parseContents(contents, quantizeContents);
  }
  return deepFreeze({
    schemaVersion: dto.schemaVersion,
    worldId: dto.worldId,
    lineage: { ...dto.lineage },
    sequence: dto.sequence,
    solverConfig: { id: dto.solverConfig.id, version: dto.solverConfig.version, parameters: { ...dto.solverConfig.parameters } },
    scenarioSnapshot: parseScenarioSnapshot(dto.scenarioSnapshot),
    vessels: dto.vessels.map(parseVessel),
    apparatus: dto.apparatus.map(parseApparatus),
    attachments: dto.attachments.map((attachment) => ({ ...attachment })),
    canonical: { byVessel },
  });
}

/** Parse a serialized state, canonicalizing every operational quantity. */
export function parseWorldState(input: unknown): WorldState {
  return parseWorldStateUnchecked(SerializedWorldStateSchema.parse(input), true);
}

/**
 * Parse a snapshot checkpoint without rewriting paired transfer results.
 *
 * A transfer quantizes one shared delta and applies it to both vessels. The
 * resulting subtraction/addition can therefore retain a few IEEE-754 guard
 * digits even though its replay identity is quantized by `stateHash`. A
 * snapshot is an acceleration cache of that exact fold result; independently
 * rounding its contents on load would make replay-with-snapshot produce a
 * different in-memory state from replay-from-log. Schema validation and hash
 * validation still run at this boundary, but the arithmetic representation is
 * preserved.
 */
export function parseWorldStateForSnapshot(input: unknown): WorldState {
  return parseWorldStateUnchecked(SerializedWorldStateSchema.parse(input), false);
}

/** Build the typed empty world at the only legal genesis event boundary. */
export function createInitialState(input: unknown): WorldState {
  const event = WorldCreatedSchema.parse(input);
  if (event.seq !== 0) {
    throw new RangeError(`WorldCreated must have seq 0, got ${event.seq}`);
  }
  if (event.payload.contentHash !== scenarioSnapshotHash(event.payload.scenarioSnapshot)) {
    throw new Error("CONTENT_HASH_MISMATCH: WorldCreated snapshot checksum does not match its contents");
  }
  const snapshot = parseScenarioSnapshot(event.payload.scenarioSnapshot);
  const byVessel: Record<string, RuntimeCanonicalContents> = {};
  for (const vessel of snapshot.vessels) {
    byVessel[vessel.vesselId] = {
      waterMass: kilogram(0),
      liquidVolume: litre(0),
      componentAmounts: [],
    };
  }
  return deepFreeze({
    schemaVersion: event.schemaVersion,
    worldId: event.payload.worldId,
    lineage: { parentWorldId: null, forkSequence: null, forkStateHash: null },
    sequence: 0,
    solverConfig: {
      id: event.payload.solverConfig.id,
      version: event.payload.solverConfig.version,
      parameters: { ...event.payload.solverConfig.parameters },
    },
    scenarioSnapshot: snapshot,
    vessels: snapshot.vessels.map((vessel) => ({
      id: vessel.vesselId,
      kind: vessel.kind,
      capacity: vessel.capacity,
      geometryRef: vessel.geometryRef,
      position: vessel.position,
    })),
    apparatus: [],
    attachments: [],
    canonical: { byVessel },
  });
}

/**
 * Migrate a persisted genesis event before the current event schema parses it.
 * Structural schema migration can change the snapshot bytes; the content
 * checksum is a derived field owned by World Runtime and must be rebuilt at
 * this boundary rather than copied from the legacy record.
 */
export function migrateWorldCreated(
  input: unknown,
  options: { readonly resolveVolumeProfile?: VolumeProfileMigrationResolver } = {},
): SerializedWorldCreated {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("WorldCreated migration requires an object record");
  }
  const result = migrateWorld(
    input as Record<string, unknown>,
    CURRENT_SCHEMA_VERSION,
    options,
  );
  if (result.status !== "OK") {
    throw new Error(`WorldCreated migration failed: ${result.status}`);
  }
  const event = WorldCreatedSchema.parse(result.record);
  if (result.applied.length === 0) return event;
  return WorldCreatedSchema.parse({
    ...event,
    payload: {
      ...event.payload,
      contentHash: scenarioSnapshotHash(event.payload.scenarioSnapshot),
    },
  });
}

function serializeDataProvenance(value: RuntimeDataProvenance): DataProvenanceDto {
  const result: Record<string, unknown> = {
    source: value.source,
    reference: value.reference,
    category: value.category,
  };
  for (const key of ["edition", "version", "uncertainty", "lastVerified"] as const) {
    const optionalValue = value[key];
    if (optionalValue !== undefined) result[key] = optionalValue;
  }
  if (value.temperature !== undefined) result.temperature = { ...value.temperature };
  if (value.pressure !== undefined) result.pressure = { ...value.pressure };
  return result as DataProvenanceDto;
}

function serializeMaterialSnapshot(material: RuntimeMaterialSnapshot): SerializedMaterialSnapshot {
  return {
    materialId: material.materialId,
    sourceDefinition: material.sourceDefinition,
    density: {
      value: material.density.value,
      unit: "kg/L",
      provenance: serializeDataProvenance(material.density.provenance),
    },
    composition: material.composition.map((entry) => ({
      soluteId: entry.soluteId,
      amountConcentration: { value: entry.amountConcentration, unit: "mol/L" },
      provenance: serializeDataProvenance(entry.provenance),
    })),
    molarMasses: material.molarMasses.map((entry) => ({
      soluteId: entry.soluteId,
      molarMass: { value: entry.molarMass, unit: "kg/mol" },
      provenance: serializeDataProvenance(entry.provenance),
    })),
    resolvedInventoryPerLitre: {
      waterMass: { value: material.resolvedInventoryPerLitre.waterMass, unit: "kg" },
      soluteAmounts: material.resolvedInventoryPerLitre.soluteAmounts.map((entry) => ({
        soluteId: entry.soluteId,
        amount: { value: entry.amount, unit: "mol" },
      })),
    },
  };
}

function serializeScenarioSnapshot(snapshot: RuntimeScenarioSnapshot): SerializedScenarioSnapshot {
  return {
    scenarioRef: snapshot.scenarioRef,
    materials: snapshot.materials.map(serializeMaterialSnapshot),
    vessels: snapshot.vessels.map((vessel) => ({
      vesselId: vessel.vesselId,
      kind: vessel.kind,
      capacity: { value: vessel.capacity, unit: "L" },
      geometryRef: vessel.geometryRef,
      volumeProfile: vessel.volumeProfile,
      position: { unit: "mm", x: vessel.position.x, y: vessel.position.y },
    })),
    apparatusDefaults: snapshot.apparatusDefaults.map((entry) => ({
      kind: entry.kind,
      state: { ...entry.state },
    })),
    indicators: snapshot.indicators.map((indicator) => ({
      indicatorId: indicator.indicatorId,
      kaIn: { value: indicator.kaIn.value, unit: "1" },
      provenance: serializeDataProvenance(indicator.provenance),
    })),
    modelRequirements: {
      temperature: { value: snapshot.modelRequirements.temperature, unit: "K" },
      species: [...snapshot.modelRequirements.species],
      solvent: snapshot.modelRequirements.solvent,
      phase: snapshot.modelRequirements.phase,
      activityCorrected: snapshot.modelRequirements.activityCorrected,
    },
  };
}

/** Serialize typed state through the schema owned by `@chemrealm/schema`. */
export function serializeWorldState(state: WorldState): SerializedWorldState {
  const dto = {
    schemaVersion: state.schemaVersion,
    worldId: state.worldId,
    lineage: { ...state.lineage },
    sequence: state.sequence,
    solverConfig: {
      id: state.solverConfig.id,
      version: state.solverConfig.version,
      parameters: { ...state.solverConfig.parameters },
    },
    scenarioSnapshot: serializeScenarioSnapshot(state.scenarioSnapshot),
    vessels: state.vessels.map((vessel) => ({
      id: vessel.id,
      kind: vessel.kind,
      capacity: { value: vessel.capacity, unit: "L" },
      geometryRef: vessel.geometryRef,
      position: { unit: "mm", x: vessel.position.x, y: vessel.position.y },
    })),
    apparatus: state.apparatus.map((apparatus) => ({
      id: apparatus.id,
      kind: apparatus.kind,
      position: { unit: "mm", x: apparatus.position.x, y: apparatus.position.y },
      state: { ...apparatus.state },
    })),
    attachments: state.attachments.map((attachment) => ({ ...attachment })),
    canonical: {
      byVessel: Object.fromEntries(
        Object.entries(state.canonical.byVessel).map(([vesselId, contents]) => [
          vesselId,
          {
            waterMass: { value: contents.waterMass, unit: "kg" },
            liquidVolume: { value: contents.liquidVolume, unit: "L" },
            componentAmounts: [...contents.componentAmounts]
              .sort((a, b) => compareIds(a.componentId, b.componentId))
              .map((entry) => ({
                componentId: entry.componentId,
                amount: { value: entry.amount, unit: "mol" },
              })),
          },
        ]),
      ),
    },
  };
  return SerializedWorldStateSchema.parse(dto);
}

/**
 * Deep-freeze state at each reducer boundary. A child branch therefore cannot
 * mutate an ancestor through a shared nested object, even in development.
 */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}

/**
 * Project the state used for replay identity explicitly.
 *
 * Solver parameters, genesis inputs, provenance, and world structure are
 * exact identity data. Only the independent conserved runtime quantities are
 * quantized at their state boundary; derived science is not stored here.
 */
export type ReplayIdentityProjection = Omit<SerializedWorldState, "sequence">;

export function replayIdentityProjection(state: WorldState): ReplayIdentityProjection {
  const serialized = serializeWorldState(state);
  return {
    schemaVersion: serialized.schemaVersion,
    worldId: serialized.worldId,
    lineage: serialized.lineage,
    solverConfig: serialized.solverConfig,
    scenarioSnapshot: serialized.scenarioSnapshot,
    vessels: serialized.vessels,
    apparatus: serialized.apparatus,
    attachments: serialized.attachments,
    canonical: {
      byVessel: Object.fromEntries(
        Object.entries(serialized.canonical.byVessel).map(([vesselId, contents]) => [
          vesselId,
          {
            waterMass: { value: quantize(contents.waterMass.value), unit: "kg" },
            liquidVolume: { value: quantize(contents.liquidVolume.value), unit: "L" },
            componentAmounts: contents.componentAmounts.map((entry) => ({
              componentId: entry.componentId,
              amount: { value: quantize(entry.amount.value), unit: "mol" },
            })),
          },
        ]),
      ),
    },
  };
}

/** Hash replay identity; the present sequence cursor is a view and excluded. */
export function stateHash(state: WorldState): string {
  return hashCanonical(replayIdentityProjection(state));
}

/** Kept as a named alias because replay diagnostics call this a replay hash. */
export const replayHash = stateHash;

/** Ensure a value advertised as an event is the schema's actual event shape. */
export function parseDomainEvent(input: unknown): DomainEvent {
  return DomainEventSchema.parse(input);
}
