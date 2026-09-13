import {
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

export function formatBuretteReading(value: Litre): string {
  return `${finite(value, "burette reading").toFixed(2)} L`;
}
