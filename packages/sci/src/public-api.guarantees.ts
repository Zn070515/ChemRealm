import type { SolveResult } from "./result.js";
import {
  molPerLitre,
  reducedMolality,
  taughtHydrogenIonExponent,
  type ScientificState,
} from "@chemrealm/schema";
import { ionicStrengthFromSpecies } from "./acidbase/species.js";

export function noBareScientificShortcut(result: SolveResult): void {
  if (result.status === "OK") {
    // @ts-expect-error — scientific results expose state, never a bare pH field.
    const barePh: number = result.ph;
    void barePh;
  }
}

export function noMolarityInReducedSpeciesAlgebra(): void {
  ionicStrengthFromSpecies({
    // @ts-expect-error — reduced species algebra cannot accept a molarity.
    hydrogen: molPerLitre(1),
    hydroxide: reducedMolality(0),
    neutralAcid: reducedMolality(0),
    conjugateBase: reducedMolality(0),
    sodium: reducedMolality(0),
    chloride: reducedMolality(0),
  });
}

export function noPhTeachingSwap(state: ScientificState): void {
  const taught = taughtHydrogenIonExponent(1);

  // @ts-expect-error — activity-based model pH and taught −lg c(H⁺) are distinct.
  const modelPh: typeof state.modelPh = taught;
  // @ts-expect-error — taught −lg c(H⁺) and model pH are distinct.
  const taughtAgain: typeof taught = state.modelPh;
  void modelPh;
  void taughtAgain;
}
