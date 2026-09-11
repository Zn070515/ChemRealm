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

import { quantityOfDimension } from "./quantity.js";

/**
 * A solute, on ONE named composition scale.
 *
 * The scale is in the FIELD NAME, not inferred from the unit. An earlier version
 * had a single field called `concentration` that accepted either mol/L or
 * mol/kg — which is anti-pattern 1 of `docs/science/quantity-ontology.md`:
 * "naming a variable `concentration` when it holds a molality". Both scales are
 * still supported; neither is anonymous.
 */
export const SoluteDefinitionSchema = z.discriminatedUnion("basis", [
  z.strictObject({
    soluteId: z.string().min(1),
    basis: z.literal("molarity"),
    /** `c`, mol per litre of SOLUTION. The reagent-label and volumetric convention. */
    amountConcentration: quantityOfDimension("molarity"),
    /** Sourced. Feeds `waterMass`, so it is a scientific input. */
    molarMass: quantityOfDimension("molarMass"),
    /** Whether the solute is fully dissociated at these concentrations. */
    fullyDissociated: z.boolean(),
  }),
  z.strictObject({
    soluteId: z.string().min(1),
    basis: z.literal("molality"),
    /** `m`, mol per kilogram of WATER. */
    molality: quantityOfDimension("molality"),
    molarMass: quantityOfDimension("molarMass"),
    fullyDissociated: z.boolean(),
  }),
]);
export type SoluteDefinition = z.infer<typeof SoluteDefinitionSchema>;

/**
 * A material as the AUTHOR writes it: a composition on a named scale, plus
 * density, both sourced. Resolution into a frozen inventory happens once, at
 * genesis (`world.ts`).
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
  solutes: z.array(SoluteDefinitionSchema),
  /**
   * Sourced. Feeds `waterMass` via the resolved inventory — and, when a solute
   * is declared on the molality scale, is what converts it to the snapshot's
   * molarity basis (`molalityToMolarity`).
   */
  density: quantityOfDimension("density"),
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

export const ScenarioSchema = z.strictObject({
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
