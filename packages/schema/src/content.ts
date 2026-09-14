/**
 * Scenario content definitions (`GOAL.md` §11, `AGENTS.md` §10).
 *
 * A content file DECLARES a scenario. It does not implement chemistry.
 *
 *   BAD:  worlds/titration-001.ts contains a private acid-base solver.
 *   GOOD: world content declares state and requirements; the shared scientific
 *         adapter solves the chemistry.
 *
 * The distinction is enforced structurally here: nothing in this shape can
 * express an equilibrium calculation. There is a `modelRequirements` block,
 * which is a CONSTRAINT on which solver may be used — not a way to supply one.
 */

import { z } from "zod";

import { VERSION_MANIFEST } from "./generated/versions.js";
import { quantityOfDimension } from "./quantity.js";
import { DataProvenanceSchema } from "./scientific.js";
import {
  FrozenOpticalPathSnapshotSchema,
  OpticalProfileSnapshotSchema,
} from "./indicator-optics.js";
import { VolumeProfileDefinitionSchema } from "./volume-profile.js";

/** Authoring shape version; independent from the persisted world event version. */
export const SCENARIO_SCHEMA_VERSION = VERSION_MANIFEST.schema.scenario;

/**
 * A solute, on ONE named composition scale.
 *
 * The scale is in the FIELD NAME, not inferred from the unit. An earlier version
 * had a single field called `concentration` that accepted either mol/L or
 * mol/kg — which is anti-pattern 1 of `docs/science/quantity-ontology.md`:
 * "naming a variable `concentration` when it holds a molality". Both scales are
 * still supported; neither is anonymous. At the material level, v0 permits
 * multiple molarity solutes or one molality solute, but not a mixed basis; the
 * joint mixed-basis resolver is a Scientific Reality Core prerequisite.
 */
const MolaritySoluteDefinitionSchema = z.strictObject({
  soluteId: z.string().min(1),
  basis: z.literal("molarity"),
  /** `c`, mol per litre of SOLUTION. The reagent-label and volumetric convention. */
  amountConcentration: quantityOfDimension("molarity").extend({
    provenance: DataProvenanceSchema.optional(),
  }),
  /** Sourced. Feeds `waterMass`, so it is a scientific input. */
  molarMass: quantityOfDimension("molarMass").extend({
    provenance: DataProvenanceSchema.optional(),
  }),
});

const MolalitySoluteDefinitionSchema = z.strictObject({
  soluteId: z.string().min(1),
  basis: z.literal("molality"),
  /** `m`, mol per kilogram of WATER. */
  molality: quantityOfDimension("molality").extend({
    provenance: DataProvenanceSchema.optional(),
  }),
  molarMass: quantityOfDimension("molarMass").extend({
    provenance: DataProvenanceSchema.optional(),
  }),
});

export const SoluteDefinitionSchema = z.discriminatedUnion("basis", [
  MolaritySoluteDefinitionSchema,
  MolalitySoluteDefinitionSchema,
]);
export type SoluteDefinition = z.infer<typeof SoluteDefinitionSchema>;

/**
 * A material as the AUTHOR writes it: a composition on a named scale, plus
 * density. Source records may be attached while authoring; resolution into a
 * frozen inventory happens once, at genesis (`world.ts`), where missing source
 * data is rejected rather than invented.
 *
 * Density is required rather than optional because it is a scientific input,
 * not an implementation detail: it sets `waterMass`, hence molality, hence
 * activity, hence the model pH. A scenario without a declared density is a
 * validation error, never a default (`SPEC-0001` AC-S15).
 */
export const MaterialDefinitionSchema = z.strictObject({
  materialId: z.string().min(1),
  label: z.string().min(1),
  /** Aqueous solution or pure solvent; solids are out of scope for v0. */
  phase: z.literal("aqueous"),
  /**
   * v0 resolver boundary: multiple molarity solutes are supported, but a
   * material may contain at most one molality solute and may not mix bases.
   * The general mixed-basis formula belongs to the Scientific Reality Core and
   * must land before this contract is widened (SPEC-0001 genesis design).
   */
  solutes: z.union([
    z.array(MolaritySoluteDefinitionSchema),
    z.array(MolalitySoluteDefinitionSchema).max(1),
  ]),
  /**
   * Sourced. Feeds `waterMass` via the resolved inventory — and, when a solute
   * is declared on the molality scale, is what converts it to the snapshot's
   * molarity basis (`molalityToMolarity`).
   */
  density: quantityOfDimension("density").extend({
    provenance: DataProvenanceSchema.optional(),
  }),
});
export type MaterialDefinition = z.infer<typeof MaterialDefinitionSchema>;

export const VesselDefinitionSchema = z.strictObject({
  vesselId: z.string().min(1),
  kind: z.enum(["conicalFlask", "beaker", "burette", "volumetricFlask"]),
  capacity: quantityOfDimension("volume"),
  /**
   * The apparatus asset. ONE reference, not two.
   *
   * An earlier version used `volumeProfileRef` here while `world.ts` used
   * `geometryRef`, and the resolved snapshot carried BOTH — two names for one
   * thing, which is how a resolver ends up inventing a value for whichever one
   * the content failed to supply.
   *
   * The referenced asset publishes `V(h)` and its inverse. Without a profile a
   * vessel cannot carry a liquid-level readout at all — a conical flask drawn
   * to "look right" is not the same object as one whose interior volume is a
   * known function of height (`docs/visual/apparatus-standard.md`).
   */
  geometryRef: z.string().min(1),
  /** Serializable volume profile, resolved into genesis. */
  volumeProfile: VolumeProfileDefinitionSchema,
  /** Optional fixed optical path, resolved into genesis when an indicator is used. */
  opticalPath: FrozenOpticalPathSnapshotSchema.optional(),
  position: z.strictObject({ unit: z.literal("mm"), x: z.number(), y: z.number() }),
  initialContents: z.array(
    z.strictObject({
      materialId: z.string().min(1),
      volume: quantityOfDimension("volume"),
    }),
  ),
});
export type VesselDefinition = z.infer<typeof VesselDefinitionSchema>;

/**
 * What the scenario NEEDS. A constraint, not a record.
 *
 * If no available solver satisfies these, world creation FAILS with a stated
 * reason — it does not resolve to a solver the scenario did not ask for. An
 * earlier revision said "solverConfig wins if they disagree", which degrades a
 * requirement into a comment.
 */
export const ModelRequirementsSchema = z.strictObject({
  temperature: quantityOfDimension("temperature"),
  solvent: z.literal("water"),
  phase: z.literal("aqueous"),
  activityCorrected: z.boolean(),
  /** Closed species set. A scenario naming a species the solver lacks is refused. */
  species: z.array(z.string().min(1)).min(1),
});
export type ModelRequirements = z.infer<typeof ModelRequirementsSchema>;

/**
 * Authoring input for a scenario indicator. Genesis resolution canonicalizes
 * `kaIn` and attaches its DataProvenance before creating ScenarioSnapshot.
 */
export const IndicatorDefinitionSchema = z.strictObject({
  indicatorId: z.string().min(1),
  kaIn: z.strictObject({
    value: z.number().finite().positive(),
    unit: z.literal("1"),
    provenance: DataProvenanceSchema.optional(),
  }),
  /** Optional optical dose and reviewed profile, frozen into genesis. */
  optical: z.strictObject({
    initialVesselId: z.string().min(1),
    totalAmount: quantityOfDimension("amount"),
    opticalProfile: OpticalProfileSnapshotSchema,
    provenance: DataProvenanceSchema,
  }).optional(),
});
export type IndicatorDefinition = z.infer<typeof IndicatorDefinitionSchema>;

export const ScenarioSchema = z.strictObject({
  /**
   * The authoring SHAPE's version is distinct from the persisted world event
   * version and from `contentVersion`, which versions THIS
   * content: a content file can be revised without the format changing, and the
   * content. This shape version changes when the authoring contract changes.
   */
  schemaVersion: z.literal(SCENARIO_SCHEMA_VERSION),
  /** Bumped whenever the content changes; part of the content hash. */
  contentVersion: z.number().int().positive(),
  scenarioRef: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  materials: z.array(MaterialDefinitionSchema).min(1),
  vessels: z.array(VesselDefinitionSchema).min(1),
  apparatus: z.array(
    z.strictObject({
      kind: z.string().min(1),
      /**
       * DELIBERATELY OPEN — one of the few. An apparatus kind's state is
       * authored per kind ("a burette carries initial scale/container data"), and closing it
       * here would mean this file enumerating every apparatus the project will
       * ever have. The per-kind shape belongs to the apparatus asset contract
       * at M6. Named here rather than left to look like an oversight: the
       * strictness invariant (see `contracts.test.ts`) exempts exactly this
       * field, and the exemption is a written decision.
       */
      state: z.record(z.string(), z.unknown()),
    }),
  ),
  indicators: z.array(IndicatorDefinitionSchema),
  modelRequirements: ModelRequirementsSchema,
  representation: z
    .strictObject({
      /** Which inspection views the scenario opens by default. */
      defaultViews: z.array(z.enum(["macro", "micro", "symbolic"])),
    })
    .optional(),
  learningGoals: z.array(z.string()).optional(),
});
export type Scenario = z.infer<typeof ScenarioSchema>;
