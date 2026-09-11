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

import { SerializedQuantitySchema } from "./quantity.js";

/**
 * A material as the AUTHOR writes it: molarity plus density, both sourced.
 * Resolution into a frozen inventory happens once, at genesis (`world.ts`).
 *
 * Density is required rather than optional because it is a scientific input,
 * not an implementation detail: it sets `waterMass`, hence molality, hence
 * activity, hence the model pH. A scenario without a declared density is a
 * validation error, never a default (`SPEC-0001` AC-S15).
 */
export const MaterialDefinitionSchema = z.object({
  materialId: z.string().min(1),
  label: z.string().min(1),
  /** Aqueous solution or pure solvent; solids are out of scope for v0. */
  phase: z.literal("aqueous"),
  solutes: z.array(
    z.object({
      soluteId: z.string().min(1),
      concentration: SerializedQuantitySchema,
      /** Sourced. Feeds `waterMass`, so it is a scientific input. */
      molarMass: SerializedQuantitySchema,
      /** Whether the solute is fully dissociated at these concentrations. */
      fullyDissociated: z.boolean(),
    }),
  ),
  /** Sourced. Feeds `waterMass` via the resolved inventory. */
  density: SerializedQuantitySchema,
});
export type MaterialDefinition = z.infer<typeof MaterialDefinitionSchema>;

export const VesselDefinitionSchema = z.object({
  vesselId: z.string().min(1),
  kind: z.enum(["conicalFlask", "beaker", "burette", "volumetricFlask"]),
  capacity: SerializedQuantitySchema,
  /**
   * Publishes `V(h)` and its inverse. Without a profile the vessel cannot carry
   * a liquid-level readout at all — a conical flask drawn to "look right" is
   * not the same object as one whose interior volume is a known function of
   * height (`docs/visual/apparatus-standard.md`).
   */
  volumeProfileRef: z.string().min(1),
  position: z.object({ unit: z.literal("mm"), x: z.number(), y: z.number() }),
  initialContents: z.array(
    z.object({
      materialId: z.string().min(1),
      volume: SerializedQuantitySchema,
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
export const ModelRequirementsSchema = z.object({
  temperature: SerializedQuantitySchema,
  solvent: z.literal("water"),
  phase: z.literal("aqueous"),
  activityCorrected: z.boolean(),
  /** Closed species set. A scenario naming a species the solver lacks is refused. */
  species: z.array(z.string().min(1)).min(1),
});
export type ModelRequirements = z.infer<typeof ModelRequirementsSchema>;

export const ScenarioSchema = z.object({
  /** Bumped whenever the content changes; part of the content hash. */
  contentVersion: z.number().int().positive(),
  scenarioRef: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  materials: z.array(MaterialDefinitionSchema).min(1),
  vessels: z.array(VesselDefinitionSchema).min(1),
  apparatus: z.array(
    z.object({
      kind: z.string().min(1),
      state: z.record(z.string(), z.unknown()),
    }),
  ),
  modelRequirements: ModelRequirementsSchema,
  representation: z
    .object({
      /** Which inspection views the scenario opens by default. */
      defaultViews: z.array(z.enum(["macro", "micro", "symbolic"])),
    })
    .optional(),
  learningGoals: z.array(z.string()).optional(),
});
export type Scenario = z.infer<typeof ScenarioSchema>;
