/**
 * The `{ value, unit }` tuple: how every scientific quantity crosses a
 * serialization boundary (`ADR-0004` §3).
 *
 * Two rules, both load-bearing:
 *
 *   1. A serialized quantity ALWAYS carries its unit. A bare number is never a
 *      quantity, and a missing unit is a validation error rather than a default
 *      — a default would silently mean "whatever the reader assumed".
 *   2. An UNKNOWN unit is rejected. Accepting it and hoping would put the
 *      conversion question off until later, which is when it becomes a
 *      factor-of-1000 bug nobody can find.
 *
 * Conversions to canonical units happen HERE and nowhere else. No `* 1000` and
 * no inline factor appears anywhere else in the repository.
 */

import { z } from "zod";

/**
 * Every unit the project recognises, with the factor that converts it to the
 * canonical unit of its dimension. Consequences of a missing entry are loud
 * (rejection), never silent (a wrong number).
 *
 * Canonical units follow `ADR-0004`: mol, kg, L, mm, mol/kg, mol/L, K, kPa, s,
 * kg/mol, kg/L.
 */
export const UNIT_TABLE = {
  // amount
  mol: { dimension: "amount", toCanonical: 1 },
  mmol: { dimension: "amount", toCanonical: 1e-3 },
  // mass
  kg: { dimension: "mass", toCanonical: 1 },
  g: { dimension: "mass", toCanonical: 1e-3 },
  mg: { dimension: "mass", toCanonical: 1e-6 },
  // volume
  L: { dimension: "volume", toCanonical: 1 },
  mL: { dimension: "volume", toCanonical: 1e-3 },
  uL: { dimension: "volume", toCanonical: 1e-6 },
  // length — geometry is a LENGTH, never a volume (`apparatus-standard.md`)
  mm: { dimension: "length", toCanonical: 1 },
  cm: { dimension: "length", toCanonical: 10 },
  m: { dimension: "length", toCanonical: 1000 },
  // concentration
  "mol/kg": { dimension: "molality", toCanonical: 1 },
  "mol/L": { dimension: "molarity", toCanonical: 1 },
  "mmol/L": { dimension: "molarity", toCanonical: 1e-3 },
  // temperature — handled by offset, not a factor; see `toCanonicalQuantity`
  K: { dimension: "temperature", toCanonical: 1 },
  degC: { dimension: "temperature", toCanonical: 1 },
  // pressure
  kPa: { dimension: "pressure", toCanonical: 1 },
  Pa: { dimension: "pressure", toCanonical: 1e-3 },
  atm: { dimension: "pressure", toCanonical: 101.325 },
  // time
  s: { dimension: "time", toCanonical: 1 },
  min: { dimension: "time", toCanonical: 60 },
  // molar mass / density — sourced scenario inputs, not invented models
  "kg/mol": { dimension: "molarMass", toCanonical: 1 },
  "g/mol": { dimension: "molarMass", toCanonical: 1e-3 },
  "kg/L": { dimension: "density", toCanonical: 1 },
  "g/mL": { dimension: "density", toCanonical: 1 },
} as const;

export type UnitSymbol = keyof typeof UNIT_TABLE;
const UNIT_SYMBOLS = Object.keys(UNIT_TABLE) as UnitSymbol[];

export type Dimension = (typeof UNIT_TABLE)[UnitSymbol]["dimension"];

/** The canonical unit of each dimension. */
export const CANONICAL_UNIT: Record<Dimension, UnitSymbol> = {
  amount: "mol",
  mass: "kg",
  volume: "L",
  length: "mm",
  molality: "mol/kg",
  molarity: "mol/L",
  temperature: "K",
  pressure: "kPa",
  time: "s",
  molarMass: "kg/mol",
  density: "kg/L",
};

export const QuantitySchema = z.object({
  value: z.number().finite(),
  /**
   * `z.enum` of the registered symbols, NOT `.refine()`.
   *
   * The refinement version enforced the unit table at runtime but emitted
   * `"unit": { "type": "string", "minLength": 1 }` — zod's JSON Schema emission
   * does not encode refinements. The Python side validating against that
   * artifact therefore accepted `{"value": 1, "unit": "furlong"}`, which the
   * runtime rejects, so `ADR-0001` rule 1's "one source of truth" held only for
   * the contracts that happened to use `enum`. An enum is the form that
   * survives the language boundary.
   */
  unit: z.enum(UNIT_SYMBOLS as [UnitSymbol, ...UnitSymbol[]]),
});

export type Quantity = z.infer<typeof QuantitySchema>;
export type SerializedQuantity = { value: number; unit: UnitSymbol };

/** The same schema under the name most call sites use. */
export const SerializedQuantitySchema = QuantitySchema;

/** Parse a serialized quantity, rejecting anything not in `UNIT_TABLE`. */
export function parseQuantity(input: unknown): SerializedQuantity {
  return QuantitySchema.parse(input) as SerializedQuantity;
}

export function isUnitSymbol(value: string): value is UnitSymbol {
  return (UNIT_SYMBOLS as string[]).includes(value);
}

export function dimensionOf(unit: UnitSymbol): Dimension {
  return UNIT_TABLE[unit].dimension;
}

/** Every unit of one dimension, as the non-empty tuple `z.enum` wants. */
export function unitsOfDimension(dimension: Dimension): [UnitSymbol, ...UnitSymbol[]] {
  const units = UNIT_SYMBOLS.filter((u) => UNIT_TABLE[u].dimension === dimension);
  if (units.length === 0) {
    throw new Error(`quantity: no units registered for dimension ${dimension}`);
  }
  return units as [UnitSymbol, ...UnitSymbol[]];
}

/**
 * A `{value, unit}` pair CONSTRAINED to one or more dimensions.
 *
 * WHY THIS EXISTS. `QuantitySchema` alone accepts any recognised unit. That
 * makes it accept `{value: 25, unit: "mL"}` in a field called `temperature` and
 * `{value: 5, unit: "mol"}` in a field called `capacity` — verified, not
 * hypothesised. Both were accepted, and the emitted JSON Schema inherited the
 * hole, so the Python side would have accepted them too.
 *
 * Being explicit about units does not prevent dimension confusion; only
 * checking the dimension does. This is the function that checks it, and every
 * field whose dimension is known must use it.
 */
export function quantityOfDimension(
  ...dimensions: [Dimension, ...Dimension[]]
) {
  const units = dimensions.flatMap((d) => unitsOfDimension(d));
  return z.object({
    value: z.number().finite(),
    unit: z.enum(units as unknown as [UnitSymbol, ...UnitSymbol[]]),
  });
}


/**
 * Convert a serialized quantity to its canonical unit.
 *
 * Throws on a dimension mismatch rather than converting: a value declared in
 * `mol/L` cannot become `mol/kg` without a solution density, and quietly
 * treating them as interchangeable is the defect three review rounds hunted.
 */
export function toCanonical(quantity: SerializedQuantity): SerializedQuantity {
  const { dimension, toCanonical: factor } = UNIT_TABLE[quantity.unit];
  const target = CANONICAL_UNIT[dimension];
  if (quantity.unit === target) return quantity;
  if (dimension === "temperature") {
    // Two temperature units, one an offset scale. Not a factor.
    return quantity.unit === "degC"
      ? { value: quantity.value + 273.15, unit: "K" }
      : quantity;
  }
  return { value: quantity.value * factor, unit: target };
}

/** Assert two quantities share a dimension before any arithmetic. */
export function assertSameDimension(
  a: SerializedQuantity,
  b: SerializedQuantity,
): Dimension {
  const da = dimensionOf(a.unit);
  const db = dimensionOf(b.unit);
  if (da !== db) {
    throw new TypeError(
      `quantity: cannot combine ${a.unit} (${da}) with ${b.unit} (${db})`,
    );
  }
  return da;
}
