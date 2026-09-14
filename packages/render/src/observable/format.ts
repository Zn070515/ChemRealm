import {
  litresToMillilitres,
  type Litre,
  type Ph,
  type TeachingHydrogenIonExponent,
} from "@chemrealm/schema";

function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name}: expected a finite value`);
  }
  return value;
}

export function formatTaughtPh(value: TeachingHydrogenIonExponent): string {
  return `pH ${finite(value.value, "taught hydrogen exponent").toFixed(2)}`;
}

export function formatModelPh(value: Ph, activityModel: string): string {
  if (activityModel.trim().length === 0) {
    throw new RangeError("activity model label cannot be empty");
  }
  return `model pH (${activityModel}) ${finite(value.value, "model pH").toFixed(2)}`;
}

export function formatBuretteScaleReading(value: Litre): string {
  const millilitres = finite(
    litresToMillilitres(value),
    "burette scale reading",
  );
  return `${millilitres.toFixed(2)} mL`;
}

export function formatMolarConcentration(value: number): string {
  return `${Number(finite(value, "molar concentration").toPrecision(12))} mol/L`;
}
