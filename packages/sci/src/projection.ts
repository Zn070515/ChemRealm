import {
  litre,
  mol,
  molarityOf,
  taughtHydrogenIonExponent,
  type Kilogram,
  type Litre,
  type MolPerLitre,
  type ScientificState,
  type TeachingHydrogenIonExponent,
} from "@chemrealm/schema";
import { detLog10 } from "./deterministic-math.js";

export interface ScientificProjection {
  readonly hydrogenIonMolarity: MolPerLitre;
  readonly taughtHydrogenIonExponent: TeachingHydrogenIonExponent;
}

export interface ScientificProjectionInput {
  readonly waterMass: Kilogram;
  readonly liquidVolume: Litre;
}

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new RangeError(`${name}: expected an object`);
  }
  return value as Record<string, unknown>;
}

function positiveNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name}: expected a finite positive value`);
  }
  return value;
}

function findHydrogenSpecies(state: ScientificState): Record<string, unknown> {
  const stateRecord = asRecord(state, "scientific state");
  const species = stateRecord.species;
  if (!Array.isArray(species)) {
    throw new RangeError("scientific state species: expected an array");
  }

  const hydrogenSpecies = species.filter((candidate) => {
    if (typeof candidate !== "object" || candidate === null) return false;
    return (candidate as { symbol?: unknown }).symbol === "H+";
  });
  if (hydrogenSpecies.length !== 1) {
    throw new RangeError(
      `scientific state: expected exactly one H+ species, got ${hydrogenSpecies.length}`,
    );
  }
  return asRecord(hydrogenSpecies[0], "hydrogen species");
}

/**
 * Add quantities that need world volume without moving them into
 * ScientificState. The projection is pure: equilibrium, model pH, and the
 * source state are never recomputed or mutated here.
 */
export function projectScientificState(
  state: ScientificState,
  input: ScientificProjectionInput,
): ScientificProjection {
  const waterMass = positiveNumber(input?.waterMass, "projection water mass");
  const volumeValue = positiveNumber(input?.liquidVolume, "projection liquid volume");
  void waterMass;

  const hydrogen = findHydrogenSpecies(state);
  const amountValue = positiveNumber(hydrogen.amount, "H+ amount");
  const hydrogenAmount = mol(amountValue);
  const volume = litre(volumeValue);
  const hydrogenIonMolarity = molarityOf(hydrogenAmount, volume);
  const taughtValue = -detLog10(hydrogenIonMolarity);

  return Object.freeze({
    hydrogenIonMolarity,
    taughtHydrogenIonExponent: taughtHydrogenIonExponent(taughtValue),
  });
}
