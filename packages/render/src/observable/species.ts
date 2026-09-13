import {
  activity,
  activityCoefficient,
  molPerKilogram,
  reducedMolality,
  type ScientificState,
  type SpeciesState,
} from "@chemrealm/schema";

export type SpeciesRow = SpeciesState;

/** Re-present the state-owned species values without computing chemistry. */
export function speciesRows(state: ScientificState): readonly SpeciesRow[] {
  const symbols = new Set<string>();
  const rows = state.species.map((species) => {
    if (species.symbol.trim().length === 0 || symbols.has(species.symbol)) {
      throw new RangeError(`duplicate or empty species symbol: ${species.symbol}`);
    }
    symbols.add(species.symbol);
    return Object.freeze({
      ...species,
      reducedMolality: Object.freeze(reducedMolality(species.reducedMolality.value)),
      molality: molPerKilogram(species.molality),
      activityCoefficient: Object.freeze(
        activityCoefficient(species.activityCoefficient.value),
      ),
      activity: Object.freeze(activity(species.activity.value)),
    });
  });
  return Object.freeze(rows);
}
