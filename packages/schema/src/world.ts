/**
 * World state contracts (`ADR-0002`, `SPEC-0001` §World/event design).
 *
 * Three properties here were each a review finding, and each looks like a
 * detail until it is not:
 *
 *  1. GENESIS IS SELF-CONTAINED. `ScenarioSnapshot` carries a RESOLVED
 *     inventory, not a reference to a content file. Otherwise replay would
 *     depend on a file that can change, and `content/` edits would silently
 *     alter old worlds.
 *
 *  2. CONTENTS LIVE IN EXACTLY ONE PLACE. `Vessel` is structure only and has
 *     no `contents` field; contents are under `canonical.byVessel`. The earlier
 *     revision carried both, which is the second-source-of-truth defect this
 *     project forbids everywhere else.
 *
 *  3. `liquidVolume` IS STATE, NOT DISPLAY. It sets the volume fraction moved
 *     on the NEXT transfer, so it shapes later composition. It is canonically
 *     persisted and enters `replayHash`.
 */

import { z } from "zod";

import { SerializedQuantitySchema } from "./quantity.js";
import { SolverConfigSchema } from "./scientific.js";

export const WorldIdSchema = z.string().min(1);
export const VesselIdSchema = z.string().min(1);
export const ApparatusIdSchema = z.string().min(1);
export const MaterialIdSchema = z.string().min(1);
export const HashSchema = z.string().min(1);

/**
 * A geometry coordinate pair.
 *
 * DELIBERATE DEVIATION from `ADR-0004` §3, which says every serialized
 * quantity is `{value, unit}`. A position is not one quantity — it is a pair of
 * coordinates that necessarily share a unit — and carrying the unit twice per
 * vessel would make content files unreadable while adding no information. The
 * unit is declared ONCE for the block, so no number here is unit-ambiguous,
 * which is the property the rule exists to protect.
 *
 * Length, never volume: see `docs/visual/apparatus-standard.md`.
 */
export const PositionSchema = z.object({
  unit: z.literal("mm"),
  x: z.number().finite(),
  y: z.number().finite(),
});
export type Position = z.infer<typeof PositionSchema>;

/**
 * One material, resolved at genesis.
 *
 * `resolvedInventoryPerLitre` is the important field. Deriving `waterMass`
 * needs `M(HCl)`, and if that came from a runtime periodic table the world
 * would depend on it. Freezing the resolved inventory means `MaterialCharged`
 * reduces to `contents = volume × inventory` with no lookup of any kind.
 */
export const MaterialSnapshotSchema = z.object({
  materialId: MaterialIdSchema,
  /** What the scenario author wrote, kept for inspection. */
  sourceDefinition: z.string(),
  density: SerializedQuantitySchema,
  composition: z.array(
    z.object({
      soluteId: z.string().min(1),
      molPerLitre: z.number().nonnegative(),
    }),
  ),
  molarMasses: z.array(
    z.object({
      soluteId: z.string().min(1),
      kilogramsPerMol: z.number().positive(),
    }),
  ),
  /** FROZEN at genesis. This is what `MaterialCharged` multiplies by volume. */
  resolvedInventoryPerLitre: z.object({
    waterMass: SerializedQuantitySchema,
    soluteAmounts: z.array(
      z.object({ soluteId: z.string().min(1), amount: SerializedQuantitySchema }),
    ),
  }),
});
export type MaterialSnapshot = z.infer<typeof MaterialSnapshotSchema>;

/**
 * The genesis snapshot. Self-contained: replaying a world never reads
 * `content/` (`SPEC-0001` AC-R12).
 *
 * It carries model REQUIREMENTS, never a resolved `solverConfig`. Those are
 * different things answering different questions, and storing both would
 * recreate the double-source-of-truth problem just removed from `Vessel`.
 */
export const ScenarioSnapshotSchema = z.object({
  scenarioRef: z.string().min(1),
  materials: z.array(MaterialSnapshotSchema),
  vessels: z.array(
    z.object({
      vesselId: VesselIdSchema,
      kind: z.string().min(1),
      capacity: SerializedQuantitySchema,
      geometryRef: z.string().min(1),
      /** Published V(h)/h(V) profile reference; see apparatus-standard.md. */
      volumeProfileRef: z.string().min(1),
      position: PositionSchema,
    }),
  ),
  apparatusDefaults: z.array(
    z.object({ kind: z.string().min(1), state: z.record(z.string(), z.unknown()) }),
  ),
  /** A constraint on what may be used, not a record of what was used. */
  modelRequirements: z.object({
    temperature: SerializedQuantitySchema,
    species: z.array(z.string()),
    solvent: z.string(),
    phase: z.string(),
    activityCorrected: z.boolean(),
  }),
});
export type ScenarioSnapshot = z.infer<typeof ScenarioSnapshotSchema>;

/** Per-vessel conserved and operational state. Three fields. Nothing else. */
export const CanonicalContentsSchema = z.object({
  waterMass: SerializedQuantitySchema,
  liquidVolume: SerializedQuantitySchema,
  materials: z.array(
    z.object({ materialId: MaterialIdSchema, amount: SerializedQuantitySchema }),
  ),
});
export type CanonicalContents = z.infer<typeof CanonicalContentsSchema>;

/**
 * STRUCTURE ONLY. No `contents` field, by design — see the file header.
 */
export const VesselSchema = z.object({
  id: VesselIdSchema,
  kind: z.string().min(1),
  capacity: SerializedQuantitySchema,
  geometryRef: z.string().min(1),
  position: PositionSchema,
});
export type Vessel = z.infer<typeof VesselSchema>;

export const ApparatusSchema = z.object({
  id: ApparatusIdSchema,
  kind: z.string().min(1),
  position: PositionSchema,
  /** A burette carries `initialVolume`; its READING is derived, never stored. */
  state: z.record(z.string(), z.unknown()),
});
export type Apparatus = z.infer<typeof ApparatusSchema>;

export const AttachmentSchema = z.object({
  childId: z.union([ApparatusIdSchema, VesselIdSchema]),
  parentId: z.union([ApparatusIdSchema, VesselIdSchema]),
  portId: z.string().min(1),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

export const LineageSchema = z.object({
  parentWorldId: WorldIdSchema.nullable(),
  forkSequence: z.number().int().nonnegative().nullable(),
  forkStateHash: HashSchema.nullable(),
});
export type Lineage = z.infer<typeof LineageSchema>;

export const CURRENT_SCHEMA_VERSION = 1;

/**
 * `sequence` is the present cursor and is NOT hashed. Wall-clock time appears
 * nowhere here: sequence is the sole ordering authority (`ADR-0002` §Time).
 */
export const WorldStateSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  worldId: WorldIdSchema,
  lineage: LineageSchema,
  sequence: z.number().int().nonnegative(),
  solverConfig: SolverConfigSchema,
  scenarioSnapshot: ScenarioSnapshotSchema,
  vessels: z.array(VesselSchema),
  apparatus: z.array(ApparatusSchema),
  attachments: z.array(AttachmentSchema),
  canonical: z.object({
    byVessel: z.record(VesselIdSchema, CanonicalContentsSchema),
  }),
});
export type WorldState = z.infer<typeof WorldStateSchema>;
