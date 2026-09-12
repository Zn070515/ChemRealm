import type { SolveResult } from "./result.js";
import { molPerLitre, reducedMolality } from "@chemrealm/schema";
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
