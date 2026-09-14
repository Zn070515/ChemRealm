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

import { VERSION_MANIFEST } from "./generated/versions.js";
import { canonicalQuantityOfDimension, quantityOfDimension } from "./quantity.js";
import { DataProvenanceSchema, SolverConfigSchema } from "./scientific.js";
import { VolumeProfileSnapshotSchema } from "./volume-profile.js";
import {
  FrozenOpticalPathSnapshotSchema,
  OpticalProfileSnapshotSchema,
} from "./indicator-optics.js";

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
export const PositionSchema = z.strictObject({
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
 * Composition and molar mass remain tagged canonical quantities, and each
 * source datum carries its own provenance, separate from solver provenance.
 */
export const MaterialSnapshotSchema = z.strictObject({
  materialId: MaterialIdSchema,
  /** What the scenario author wrote, kept for inspection. */
  sourceDefinition: z.string(),
  /** Resolved snapshots are normalized to kg/L before persistence. */
  density: canonicalQuantityOfDimension("density").extend({
    provenance: DataProvenanceSchema,
  }),
  composition: z.array(
    z.strictObject({
      soluteId: z.string().min(1),
      /** Canonical resolved composition, mol per litre of solution. */
      amountConcentration: canonicalQuantityOfDimension("molarity"),
      provenance: DataProvenanceSchema,
    }),
  ),
  molarMasses: z.array(
    z.strictObject({
      soluteId: z.string().min(1),
      /** Canonical molar mass. */
      molarMass: canonicalQuantityOfDimension("molarMass"),
      provenance: DataProvenanceSchema,
    }),
  ),
  /**
   * FROZEN at genesis. This is what `MaterialCharged` multiplies by volume.
   *
   * RECIPE LEVEL, deliberately: this says what the material SUPPLIES. What the
   * world then CONSERVES is a component inventory keyed by `componentId`
   * (`CanonicalContents`), and the mapping from here to there is the genesis
   * resolver's job. v0 maps one-for-one; see the note on `CanonicalContents`.
   */
  resolvedInventoryPerLitre: z.strictObject({
    waterMass: canonicalQuantityOfDimension("mass"),
    soluteAmounts: z.array(
      z.strictObject({
        soluteId: z.string().min(1),
        amount: canonicalQuantityOfDimension("amount"),
      }),
    ),
  }),
});
export type MaterialSnapshot = z.infer<typeof MaterialSnapshotSchema>;

/**
 * A scenario-specific scientific input resolved at genesis.
 *
 * Indicator constants are not part of the global solver identity: the same
 * solver can be used with different indicators. They are nevertheless part of
 * the scenario's replayable truth, so the resolved canonical value and its
 * source-data provenance travel with the snapshot rather than being looked up
 * from mutable content when a request is built later.
 */
export const IndicatorSnapshotSchema = z.strictObject({
  indicatorId: z.string().min(1),
  kaIn: z.strictObject({
    value: z.number().finite().positive(),
    unit: z.literal("1"),
  }),
  provenance: DataProvenanceSchema,
});
export type IndicatorSnapshot = z.infer<typeof IndicatorSnapshotSchema>;

/** A complete, content-addressed optical input frozen by WorldCreated. */
export const FrozenIndicatorOpticalInputSchema = z.strictObject({
  indicatorId: z.string().min(1),
  initialVesselId: VesselIdSchema,
  totalAmount: canonicalQuantityOfDimension("amount"),
  opticalProfile: OpticalProfileSnapshotSchema,
  provenance: DataProvenanceSchema,
}).superRefine((input, context) => {
  if (input.opticalProfile.indicatorId !== input.indicatorId) {
    context.addIssue({
      code: "custom",
      path: ["opticalProfile", "indicatorId"],
      message: "optical profile indicator ID must match its frozen input",
    });
  }
  if (input.totalAmount.value < 0) {
    context.addIssue({
      code: "custom",
      path: ["totalAmount", "value"],
      message: "indicator dose cannot be negative",
    });
  }
});
export type FrozenIndicatorOpticalInput = z.infer<
  typeof FrozenIndicatorOpticalInputSchema
>;

/**
 * The genesis snapshot. Self-contained: replaying a world never reads
 * `content/` (`SPEC-0001` AC-R12).
 *
 * It carries model REQUIREMENTS, never a resolved `solverConfig`. Those are
 * different things answering different questions, and storing both would
 * recreate the double-source-of-truth problem just removed from `Vessel`.
 */
export const ScenarioSnapshotSchema = z.strictObject({
  scenarioRef: z.string().min(1),
  materials: z.array(MaterialSnapshotSchema),
  vessels: z.array(
    z.strictObject({
      vesselId: VesselIdSchema,
      kind: z.string().min(1),
      capacity: quantityOfDimension("volume"),
      /** The asset, which publishes V(h)/h(V). One reference, not two —
       *  see the note in `content.ts`. */
      /** The asset reference, retained for content and visual lookup. */
      geometryRef: z.string().min(1),
      /** Frozen, serializable geometry used to derive liquid height on replay. */
      volumeProfile: VolumeProfileSnapshotSchema,
      /** Optional fixed optical path; absent means optical observation is unavailable. */
      opticalPath: FrozenOpticalPathSnapshotSchema.optional(),
      position: PositionSchema,
    }),
  ),
  apparatusDefaults: z.array(
    z.strictObject({ kind: z.string().min(1), state: z.record(z.string(), z.unknown()) }),
  ),
  /** Resolved, canonical, per-datum scientific inputs frozen at genesis. */
  indicators: z.array(IndicatorSnapshotSchema),
  /** Optional optical inputs. Empty for legacy worlds without an optical dose. */
  indicatorOpticalInputs: z.array(FrozenIndicatorOpticalInputSchema).optional(),
  /** A constraint on what may be used, not a record of what was used. */
  modelRequirements: z.strictObject({
    /** Resolved snapshots freeze the requirement in canonical Kelvin. */
    temperature: canonicalQuantityOfDimension("temperature"),
    species: z.array(z.string().min(1)).min(1),
    solvent: z.literal("water"),
    phase: z.literal("aqueous"),
    activityCorrected: z.boolean(),
  }),
});
export type ScenarioSnapshot = z.infer<typeof ScenarioSnapshotSchema>;

/**
 * One conserved chemical component in a vessel.
 *
 * A COMPONENT, not a material and not a species. See the note on
 * `CanonicalContentsSchema`.
 */
export const ComponentAmountSchema = z.strictObject({
  componentId: z.string().min(1),
  amount: quantityOfDimension("amount"),
});
export type ComponentAmount = z.infer<typeof ComponentAmountSchema>;

/** Conserved indicator dose, distinct from model-derived chemical forms. */
export const IndicatorAmountSchema = z.strictObject({
  indicatorId: z.string().min(1),
  amount: quantityOfDimension("amount"),
});
export type IndicatorAmount = z.infer<typeof IndicatorAmountSchema>;

/**
 * Per-vessel conserved and operational state. Independent water, volume,
 * component, and indicator inventories. Nothing else.
 *
 * THE CONSERVED QUANTITY IS A COMPONENT, NOT A MATERIAL (M1 contract
 * remediation item 1, owner-approved 2026-09-11; this corrects an accepted
 * `SPEC-0001` sketch, which is recorded in that document).
 *
 * An earlier version stored `materials: [{ materialId, amount }]`. A material is
 * a reagent RECIPE — "0.100 M HCl, density …, composition …" — and no such
 * thing is conserved:
 *
 *   - Two materials that supply the same solute are indistinguishable once
 *     mixed, yet the old shape kept two separate "material amounts" for them.
 *   - A material holding two solutes (a buffer of CH₃COOH + CH₃COONa) has no
 *     meaningful `n(buffer-material)` to store at all.
 *
 * What transfers, conserves, and enters the state hash is the amount of each
 * chemical component. Material identity is a genesis-time fact and stops at
 * this boundary.
 *
 * FOUR LEVELS, kept distinct on purpose:
 *
 *   MaterialDefinition   authored reagent recipe            (content.ts)
 *   MaterialSnapshot     resolved genesis recipe            (below)
 *   componentAmounts     conserved world truth              (here)
 *   indicatorAmounts     conserved optical dose             (here)
 *   SpeciesState         equilibrium-derived instant        (scientific.ts)
 *
 * For v0 the genesis resolution maps a material's solutes to components
 * one-for-one, because in this slice each solute IS the component it supplies
 * (`HCl` as a defined component, exactly as PHREEQC treats it). When a later
 * slice needs total-Na or total-acetate, the component list is defined at the
 * component level — the FORMAT does not change.
 */
export const CanonicalContentsSchema = z.strictObject({
  waterMass: quantityOfDimension("mass"),
  liquidVolume: quantityOfDimension("volume"),
  componentAmounts: z.array(ComponentAmountSchema),
  indicatorAmounts: z.array(IndicatorAmountSchema).optional(),
});
export type CanonicalContents = z.infer<typeof CanonicalContentsSchema>;

/**
 * STRUCTURE ONLY. No `contents` field, by design — see the file header.
 */
export const VesselSchema = z.strictObject({
  id: VesselIdSchema,
  kind: z.string().min(1),
  capacity: quantityOfDimension("volume"),
  geometryRef: z.string().min(1),
  position: PositionSchema,
});
export type Vessel = z.infer<typeof VesselSchema>;

export const ApparatusSchema = z.strictObject({
  id: ApparatusIdSchema,
  kind: z.string().min(1),
  position: PositionSchema,
  /** A burette carries authored initial scale/container data; readings are derived, never stored. */
  state: z.record(z.string(), z.unknown()),
});
export type Apparatus = z.infer<typeof ApparatusSchema>;

export const AttachmentSchema = z.strictObject({
  childId: z.union([ApparatusIdSchema, VesselIdSchema]),
  parentId: z.union([ApparatusIdSchema, VesselIdSchema]),
  portId: z.string().min(1),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

export const LineageSchema = z.strictObject({
  parentWorldId: WorldIdSchema.nullable(),
  forkSequence: z.number().int().nonnegative().nullable(),
  forkStateHash: HashSchema.nullable(),
});
export type Lineage = z.infer<typeof LineageSchema>;

/** Current persisted World/Event/State schema version. */
export const CURRENT_SCHEMA_VERSION = VERSION_MANIFEST.schema.world;

/**
 * `sequence` is the present cursor and is NOT hashed. Wall-clock time appears
 * nowhere here: sequence is the sole ordering authority (`ADR-0002` §Time).
 */
export const WorldStateSchema = z.strictObject({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  worldId: WorldIdSchema,
  lineage: LineageSchema,
  sequence: z.number().int().nonnegative(),
  solverConfig: SolverConfigSchema,
  scenarioSnapshot: ScenarioSnapshotSchema,
  vessels: z.array(VesselSchema),
  apparatus: z.array(ApparatusSchema),
  attachments: z.array(AttachmentSchema),
  canonical: z.strictObject({
    byVessel: z.record(VesselIdSchema, CanonicalContentsSchema),
  }),
});
export type WorldState = z.infer<typeof WorldStateSchema>;
