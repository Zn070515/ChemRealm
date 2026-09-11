import { describe, expect, it } from "vitest";

import {
  CANONICAL_UNIT,
  UNIT_TABLE,
  assertSameDimension,
  dimensionOf,
  isUnitSymbol,
  parseQuantity,
  toCanonical,
  type SerializedQuantity,
  type UnitSymbol,
} from "./quantity.js";
import {
  STANDARD_MOLALITY,
  amountFromMolarity,
  activity,
  celsius,
  differencePh,
  fromCelsius,
  ionicStrengthMolal,
  ionicStrengthMolar,
  litre,
  molarityOf,
  molarityToMolality,
  molalityToMolarity,
  molPerKilogram,
  kilogramsPerLitre,
  kilogramsPerMol,
  molPerLitre,
  mol,
  moleFraction,
  multiplyActivity,
  ph,
  physicalMolality,
  ratioActivity,
  reduceIonicStrength,
  reduceMolality,
  reducedMolality,
  sumAmounts,
  sumMoleFractions,
  sumVolumes,
  type MolPerKilogram,
  type ReducedMolality,
} from "./units.js";

describe("constructors reject values no physical quantity can take", () => {
  it("rejects a negative volume", () => {
    expect(() => litre(-0.05)).toThrow(RangeError);
  });

  it("rejects NaN and Infinity", () => {
    expect(() => molPerKilogram(Number.NaN)).toThrow(RangeError);
    expect(() => mol(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => reducedMolality(Number.NEGATIVE_INFINITY)).toThrow(RangeError);
  });

  it("rejects a mole fraction outside [0, 1]", () => {
    expect(() => moleFraction(1.2)).toThrow(RangeError);
    expect(() => moleFraction(-0.1)).toThrow(RangeError);
  });

  it("accepts zero for quantities where zero is physical", () => {
    expect(mol(0)).toBe(0);
    expect(litre(0)).toBe(0);
  });

  it("rejects a negative activity", () => {
    // γ·m̂ cannot produce a negative from valid inputs, so a negative here means
    // a bug upstream rather than a value to carry forward.
    expect(() => activity(-1)).toThrow(RangeError);
  });
});

describe("named operators on opaque quantities", () => {
  it("multiplies activities but provides no addition", () => {
    expect(multiplyActivity(activity(2), activity(3)).value).toBe(6);
  });

  it("computes the activity ratio an equilibrium constant needs", () => {
    expect(ratioActivity(activity(1), activity(4))).toBe(0.25);
  });

  it("refuses a ratio with a zero denominator rather than returning Infinity", () => {
    expect(() => ratioActivity(activity(1), activity(0))).toThrow(RangeError);
  });

  it("defines a pH DIFFERENCE", () => {
    // A ΔpH is meaningful. An average is not, which is why `averagePh` does not
    // exist — see units.guarantees.ts for the compile-time half of this.
    expect(differencePh(ph(7), ph(4))).toBe(3);
  });

  it("checks that mole fractions sum to 1", () => {
    expect(sumMoleFractions([moleFraction(0.25), moleFraction(0.75)]).value).toBeCloseTo(1);
    expect(() => sumMoleFractions([moleFraction(0.25), moleFraction(0.5)])).toThrow(
      RangeError,
    );
  });
});

describe("branded operators return branded values", () => {
  it("sums amounts and volumes", () => {
    expect(sumAmounts(mol(1), mol(2))).toBe(3);
    expect(sumVolumes(litre(0.5), litre(0.25))).toBeCloseTo(0.75);
  });
});

describe("serialized quantities always carry a unit", () => {
  it("rejects a bare number", () => {
    expect(() => parseQuantity(0.05)).toThrow();
  });

  it("rejects a missing unit rather than defaulting one", () => {
    expect(() => parseQuantity({ value: 0.05 })).toThrow();
  });

  it("rejects an empty unit string", () => {
    expect(() => parseQuantity({ value: 0.05, unit: "" })).toThrow();
  });

  it("rejects an unknown unit rather than guessing", () => {
    // The whole point of the table: an unrecognised unit is a loud failure, not
    // a conversion deferred until it becomes a factor-of-1000 bug.
    expect(() => parseQuantity({ value: 1, unit: "furlong" })).toThrow();
    expect(() => parseQuantity({ value: 1, unit: "M" })).toThrow();
  });

  it("rejects a non-finite value", () => {
    expect(() => parseQuantity({ value: Number.NaN, unit: "L" })).toThrow();
  });

  it("accepts a well-formed pair", () => {
    expect(parseQuantity({ value: 0.05, unit: "L" })).toEqual({ value: 0.05, unit: "L" });
  });
});

describe("unit table and canonical conversion", () => {
  const symbols = Object.keys(UNIT_TABLE) as UnitSymbol[];

  it("has a canonical unit for every dimension present in the table", () => {
    for (const unit of symbols) {
      expect(CANONICAL_UNIT[dimensionOf(unit)]).toBeDefined();
    }
  });

  it("converts every non-temperature unit to canonical and back without loss", () => {
    for (const unit of symbols) {
      const dimension = dimensionOf(unit);
      if (dimension === "temperature") continue; // offset scale; tested below

      const original: SerializedQuantity = { value: 1, unit };
      const canonical = toCanonical(original);
      expect(canonical.unit).toBe(CANONICAL_UNIT[dimension]);

      // Round-trip via the table factor. Compared with a relative tolerance so
      // a double that has been through a 1e-6 factor is still exact enough.
      const factor = UNIT_TABLE[unit].toCanonical;
      expect(canonical.value).toBeCloseTo(1 * factor, 12);
    }
  });

  it("treats Celsius as an offset scale, not a factor", () => {
    expect(toCanonical({ value: 25, unit: "degC" })).toEqual({ value: 298.15, unit: "K" });
    expect(fromCelsius(25)).toBeCloseTo(298.15);
    expect(celsius(fromCelsius(25))).toBeCloseTo(25);
  });

  it("refuses to combine quantities of different dimensions", () => {
    expect(() =>
      assertSameDimension({ value: 1, unit: "mol/L" }, { value: 1, unit: "mol/kg" }),
    ).toThrow(TypeError);
  });

  it("recognises exactly the units in the table", () => {
    expect(isUnitSymbol("mol/L")).toBe(true);
    expect(isUnitSymbol("M")).toBe(false);
  });
});

describe("molarity <-> molality — the conversion that needs a density", () => {
  // Sourced scenario inputs, not invented models (ADR-0004 §4). Constructed
  // through the real types rather than cast: the earlier version of this test
  // wrote `M_HCl as never`, which bypassed the very types it was meant to
  // protect — the test would have passed with the constructor validation
  // deleted.
  const M_HCl = kilogramsPerMol(0.0364609);
  const RHO_HCL_0_1M = kilogramsPerLitre(1.0020);

  it("converts 0.1000 mol/L HCl and back", () => {
    const c = molPerLitre(0.1);
    const m = molarityToMolality(c, M_HCl, RHO_HCL_0_1M);

    // The spike measured 0.100165 mol/kg for this solution.
    expect(m).toBeCloseTo(0.100165, 5);

    const back = molalityToMolarity(m, M_HCl, RHO_HCL_0_1M);
    expect(back).toBeCloseTo(0.1, 12);
  });

  it("shows the two scales are NOT interchangeable", () => {
    const c = molPerLitre(0.1);
    const m = molarityToMolality(c, M_HCl, RHO_HCL_0_1M);
    // 0.16% apart. Small enough to hide, which is why the types must not.
    expect(m).not.toBe(c);
  });

  it("refuses a solution where the solute exceeds the solution mass", () => {
    expect(() =>
      molarityToMolality(molPerLitre(30), M_HCl, 1.0),
    ).toThrow(RangeError);
  });

  it("relates molarity and amount through volume, with no density", () => {
    expect(molarityOf(mol(0.05), litre(0.5))).toBeCloseTo(0.1, 12);
    expect(amountFromMolarity(molPerLitre(0.1), litre(0.5))).toBeCloseTo(0.05, 12);
    expect(() => molarityOf(mol(1), litre(0))).toThrow(RangeError);
  });
});

describe("standard state — reduced vs physical (AC-U5)", () => {
  it("converts molality to reduced molality and back", () => {
    const m = molPerKilogram(0.1);
    const mHat = reduceMolality(m);

    // Numerically identical at m° = 1 mol/kg. That identity is exactly why a
    // NUMERIC test cannot catch a mix-up, and why the distinction is carried by
    // the TYPE — see units.guarantees.ts.
    expect(mHat.value).toBe(m / STANDARD_MOLALITY);
    expect(physicalMolality(mHat)).toBeCloseTo(m, 15);
  });

  it("converts ionic strength to its reduced form", () => {
    const i = ionicStrengthMolal(0.1);
    expect(reduceIonicStrength(i).value).toBeCloseTo(0.1, 15);
  });

  it("keeps the reduced value dimensionless even at another standard", () => {
    // The conversion is a function, so it is visible at every call site rather
    // than being an implicit `m° = 1`.
    const mHat: ReducedMolality = reducedMolality(0.5);
    expect(physicalMolality(mHat)).toBeCloseTo(0.5 * STANDARD_MOLALITY, 15);
  });
});

describe("ionic strength bases are distinct quantities (AC-U2)", () => {
  it("uses distinct brand symbols, so the two bases cannot be confused", () => {
    const molal = ionicStrengthMolal(0.1);
    const molar = ionicStrengthMolar(0.1);
    // Numerically equal, physically different. The only thing preventing a
    // mix-up is that the brands differ, so that is what this asserts — a
    // copy-paste error in the brand key then fails a test instead of silently
    // making the two types interchangeable. (The numeric-policy spike hit
    // precisely that bug once.)
    expect(Object.getOwnPropertySymbols(molal)).not.toEqual(
      Object.getOwnPropertySymbols(molar),
    );
  });
});

describe("bad conversions fail loudly rather than returning a number", () => {
  it("refuses a non-positive solution mass", () => {
    expect(() =>
      molalityToMolarity(molPerKilogram(1), (-1) as unknown, 1),
    ).toThrow(RangeError);
  });

  it("refuses a negative value at a quantity constructor", () => {
    expect(() => molPerKilogram(-1)).toThrow(RangeError);
  });

  it("states, as a NEGATIVE result, that runtime cannot separate the two scales", () => {
    // Recorded deliberately. At m° = 1 mol/kg the two are numerically
    // identical, so no runtime assertion distinguishes them — which is exactly
    // why the separation must be carried by the TYPES (AC-U5) and tested in
    // units.guarantees.ts. An `expect(mHat).not.toBe(m)` here would fail on
    // correct code, and deleting it while pretending the property was tested
    // would be worse.
    const m: MolPerKilogram = molPerKilogram(1);
    const mHat: ReducedMolality = reduceMolality(m);
    expect(mHat.value).toBe(m);
  });
});
