import {
  reducedIonicStrength,
  type ReducedIonicStrength,
  type ReducedMolality,
} from "@chemrealm/schema";

export interface ReducedSpeciesMolalities {
  readonly hydrogen: ReducedMolality;
  readonly hydroxide: ReducedMolality;
  readonly neutralAcid: ReducedMolality;
  readonly conjugateBase: ReducedMolality;
  readonly sodium: ReducedMolality;
  readonly chloride: ReducedMolality;
}

const CHARGED_FIELDS = [
  "hydrogen",
  "hydroxide",
  "conjugateBase",
  "sodium",
  "chloride",
] as const satisfies readonly (keyof ReducedSpeciesMolalities)[];

function validateSpecies(species: ReducedSpeciesMolalities): void {
  for (const field of Object.keys(species) as (keyof ReducedSpeciesMolalities)[]) {
    const value = species[field].value;
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${field} reduced molality: expected a finite non-negative value`);
    }
  }
}

export function ionicStrengthFromSpecies(
  species: ReducedSpeciesMolalities,
): ReducedIonicStrength {
  validateSpecies(species);
  let chargedTotal = 0;
  for (const field of CHARGED_FIELDS) chargedTotal += species[field].value;
  return reducedIonicStrength(0.5 * chargedTotal);
}

export function chargeResidualFromSpecies(
  species: ReducedSpeciesMolalities,
): number {
  validateSpecies(species);
  return (
    species.hydrogen.value +
    species.sodium.value -
    species.hydroxide.value -
    species.conjugateBase.value -
    species.chloride.value
  );
}
