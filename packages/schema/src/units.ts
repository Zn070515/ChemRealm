/**
 * Quantity types, constructors, operators, and the ONE conversion module.
 *
 * AUTHORITATIVE SEMANTICS: `docs/science/quantity-ontology.md`.
 * REPRESENTATION RULES:  `ADR-0004`.
 *
 * If this file and the ontology disagree about what a quantity *means*, the
 * ontology wins and this file is wrong. This file owns only how quantities are
 * represented.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE ARE TWO KINDS OF TYPE
 * ---------------------------------------------------------------------------
 * The criterion is NOT "is arithmetic allowed". It is **which operations have
 * defined physical meaning** (`ADR-0004` §2):
 *
 *   activity           x, /, ratio      but NOT +
 *   activity coeff.    x, /, log10      but NOT +
 *   mole fraction      + (sums to 1)    but NOT x
 *   ionic strength     +, x scalar, compare within one basis
 *   pH-like            compare, difference (a ΔpH is meaningful) — NOT average
 *
 * So both kinds are needed:
 *
 *   OPAQUE  — raw operators are a COMPILE ERROR; the defined operations are
 *             named functions. Used where the legal set is small and easy to
 *             get wrong, and where a mistake is invisible at runtime.
 *   BRANDED — `number & {__unit}`. Arithmetic compiles; what it buys is that a
 *             bare number cannot be assigned to a quantity, cross-unit
 *             assignment is blocked, and an arithmetic RESULT cannot be stored
 *             back without an explicit operator. It does NOT block the
 *             arithmetic itself, and this file does not claim otherwise.
 *
 * ---------------------------------------------------------------------------
 * THE m° CONVENTION — READ THIS BEFORE EDITING ANY CONVERSION
 * ---------------------------------------------------------------------------
 * `ReducedMolality` and `MolPerKilogram` are DIFFERENT TYPES and must never be
 * interchangeable. The thermodynamic algebra runs entirely in reduced molality
 * (`m̂ = m/m°`), which is dimensionless, because `Kw` is a dimensionless
 * constant: `Kw_c / m_H` is `dimensionless / (mol/kg)` and is not a legal
 * expression. It produces correct-looking numbers anyway, because `m° = 1
 * mol/kg`, which is exactly why three review rounds missed it and why the
 * compiler now has to carry the distinction.
 */

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/** Reject values no physical quantity can take. Called by every constructor. */
function finite(value: number, what: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${what}: expected a finite number, got ${value}`);
  }
  return value;
}

/** Reject negative values for quantities that cannot be negative. */
function nonNegative(value: number, what: string): number {
  finite(value, what);
  if (value < 0) {
    throw new RangeError(`${what}: expected a non-negative number, got ${value}`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// OPAQUE QUANTITIES — arithmetic is a compile error
// ---------------------------------------------------------------------------

/**
 * The brand keys are module-private and use `unique symbol`, so a consumer
 * cannot fabricate one of these values by writing an object literal — the only
 * way in is the constructor below. That is what "opaque" buys.
 */
const phBrand = Symbol("chemrealm.Ph");
const taughtPhBrand = Symbol("chemrealm.TeachingHydrogenIonExponent");
const activityBrand = Symbol("chemrealm.Activity");
const activityCoefficientBrand = Symbol("chemrealm.ActivityCoefficient");
const moleFractionBrand = Symbol("chemrealm.MoleFraction");
const ionicStrengthMolalBrand = Symbol("chemrealm.IonicStrengthMolal");
const ionicStrengthMolarBrand = Symbol("chemrealm.IonicStrengthMolar");
const reducedIonicStrengthBrand = Symbol("chemrealm.ReducedIonicStrength");
const reducedMolalityBrand = Symbol("chemrealm.ReducedMolality");

/**
 * pH. A logarithmic coordinate, so `averagePh(a, b)` has no meaning while
 * `differencePh(a, b)` does — a ΔpH is a real quantity.
 *
 * Note this type is used ONLY for the activity-based model pH. The taught
 * quantity `−lg c(H⁺)` is a different number for the same solution and is a
 * separate type; see `TeachingHydrogenIonExponent` below.
 */
export interface Ph {
  readonly [phBrand]: true;
  readonly value: number;
}

/**
 * `−lg c(H⁺)`, the syllabus quantity. See the constructor for why it is a
 * separate type from `Ph` rather than a naming convention.
 */
export interface TeachingHydrogenIonExponent {
  readonly [taughtPhBrand]: true;
  readonly value: number;
}

export interface Activity {
  readonly [activityBrand]: true;
  readonly value: number;
}

export interface ActivityCoefficient {
  readonly [activityCoefficientBrand]: true;
  readonly value: number;
}

export interface MoleFraction {
  readonly [moleFractionBrand]: true;
  readonly value: number;
}

export interface IonicStrengthMolal {
  readonly [ionicStrengthMolalBrand]: true;
  readonly value: number;
}

export interface IonicStrengthMolar {
  readonly [ionicStrengthMolarBrand]: true;
  readonly value: number;
}

export interface ReducedIonicStrength {
  readonly [reducedIonicStrengthBrand]: true;
  readonly value: number;
}

/**
 * `m̂ = m/m°`, dimensionless. The native variable of the equilibrium algebra.
 * Distinct from `MolPerKilogram` on purpose — see the file header.
 */
export interface ReducedMolality {
  readonly [reducedMolalityBrand]: true;
  readonly value: number;
}

export function ph(value: number): Ph {
  return { [phBrand]: true, value: finite(value, "pH") };
}

/**
 * The TAUGHT quantity, `−lg c(H⁺)`, in mol/L.
 *
 * DISTINCT FROM `Ph`, ON PURPOSE, and the distinction is the single most
 * consequential fact about this project's chemistry:
 *
 *   For 0.1000 mol/L HCl:  −lg c(H⁺) = 1.0000   ← textbook "pH = 1"
 *                          model pH   = 1.1064   ← −log10 a(H⁺)
 *
 * They are different numbers for the same solution. `SPEC-0001` AC-S9 requires
 * them to be non-assignable, and this is the type that makes that true — the
 * earlier version of this file referenced `TeachingHydrogenIonExponent` in a
 * comment while no such type existed anywhere.
 *
 * The syllabus calls this "pH" and so does the default UI (`SPEC-0001` §Display
 * decision); what is forbidden is deriving it from a molality rather than from
 * a genuine `c(H⁺)`, or showing it unlabelled beside the model pH.
 */
export function taughtHydrogenIonExponent(value: number): TeachingHydrogenIonExponent {
  return { [taughtPhBrand]: true, value: finite(value, "−lg c(H⁺)") };
}

/**
 * Activity. Must be non-negative: a negative activity is not a physical state,
 * and `γ·m̂` cannot produce one from valid inputs, so a negative here means a
 * bug upstream rather than a value to carry forward.
 */
export function activity(value: number): Activity {
  return { [activityBrand]: true, value: nonNegative(value, "activity") };
}

export function activityCoefficient(value: number): ActivityCoefficient {
  return {
    [activityCoefficientBrand]: true,
    value: nonNegative(value, "activity coefficient"),
  };
}

export function moleFraction(value: number): MoleFraction {
  finite(value, "mole fraction");
  if (value < 0 || value > 1) {
    throw new RangeError(`mole fraction: expected a value in [0, 1], got ${value}`);
  }
  return { [moleFractionBrand]: true, value };
}

export function ionicStrengthMolal(value: number): IonicStrengthMolal {
  return { [ionicStrengthMolalBrand]: true, value: nonNegative(value, "ionic strength") };
}

export function ionicStrengthMolar(value: number): IonicStrengthMolar {
  return { [ionicStrengthMolarBrand]: true, value: nonNegative(value, "ionic strength") };
}

export function reducedIonicStrength(value: number): ReducedIonicStrength {
  return {
    [reducedIonicStrengthBrand]: true,
    value: nonNegative(value, "reduced ionic strength"),
  };
}

export function reducedMolality(value: number): ReducedMolality {
  return { [reducedMolalityBrand]: true, value: nonNegative(value, "reduced molality") };
}

// --- named operations on opaque quantities ---------------------------------

/** Activities do not add; they multiply and divide. */
export function multiplyActivity(a: Activity, b: Activity): Activity {
  return activity(a.value * b.value);
}

/** The ratio an equilibrium constant is built from: `Ka = a_H·a_A / a_HA`. */
export function ratioActivity(numerator: Activity, denominator: Activity): number {
  if (denominator.value === 0) {
    throw new RangeError("ratioActivity: denominator is zero");
  }
  return numerator.value / denominator.value;
}

/**
 * A DIFFERENCE of two pH values is meaningful. An average is not, and no
 * `averagePh` exists here — its absence is the point.
 */
export function differencePh(a: Ph, b: Ph): number {
  return a.value - b.value;
}

/** Mole fractions of all species in a phase must sum to 1. */
export function sumMoleFractions(parts: readonly MoleFraction[]): MoleFraction {
  let total = 0;
  for (const part of parts) total += part.value;
  if (parts.length > 0 && Math.abs(total - 1) > 1e-9) {
    throw new RangeError(
      `sumMoleFractions: expected the fractions to sum to 1, got ${total}`,
    );
  }
  return moleFraction(total);
}

/** Comparison is defined ONLY within one basis; see `IonicStrengthMolar`. */
export function compareIonicStrengthMolal(
  a: IonicStrengthMolal,
  b: IonicStrengthMolal,
): number {
  return a.value - b.value;
}

// ---------------------------------------------------------------------------
// BRANDED QUANTITIES — arithmetic compiles; mis-assignment does not
// ---------------------------------------------------------------------------

export type Mol = number & { readonly __unit: "mol" };
export type Gram = number & { readonly __unit: "g" };
export type Kilogram = number & { readonly __unit: "kg" };
export type Litre = number & { readonly __unit: "L" };
export type Millimetre = number & { readonly __unit: "mm" };
export type MolPerKilogram = number & { readonly __unit: "mol/kg" };
export type MolPerLitre = number & { readonly __unit: "mol/L" };
export type Kelvin = number & { readonly __unit: "K" };
export type Kilopascal = number & { readonly __unit: "kPa" };
export type Second = number & { readonly __unit: "s" };

export type KilogramsPerMol = number & { readonly __unit: "kg/mol" };
export type KilogramsPerLitre = number & { readonly __unit: "kg/L" };
export type GramsPerMol = number & { readonly __unit: "g/mol" };

export const mol = (v: number): Mol => nonNegative(v, "amount") as Mol;
export const gram = (v: number): Gram => nonNegative(v, "mass") as Gram;
export const kilogram = (v: number): Kilogram => nonNegative(v, "mass") as Kilogram;
export const litre = (v: number): Litre => nonNegative(v, "volume") as Litre;
/**
 * A LENGTH, used for geometry. Not a volume — `docs/visual/apparatus-standard.md`
 * carries the correction: a geometry coordinate that meant "millilitres" made
 * liquid level computable for a cylinder and silently wrong for a conical
 * flask, which is the vessel this slice actually needs.
 */
export const millimetre = (v: number): Millimetre => finite(v, "length") as Millimetre;
export const molPerKilogram = (v: number): MolPerKilogram =>
  nonNegative(v, "molality") as MolPerKilogram;
export const molPerLitre = (v: number): MolPerLitre =>
  nonNegative(v, "molarity") as MolPerLitre;
export const kelvin = (v: number): Kelvin => nonNegative(v, "temperature") as Kelvin;
export const kilopascal = (v: number): Kilopascal =>
  nonNegative(v, "pressure") as Kilopascal;
export const second = (v: number): Second => nonNegative(v, "time") as Second;

export const kilogramsPerMol = (v: number): KilogramsPerMol =>
  nonNegative(v, "molar mass") as KilogramsPerMol;
export const kilogramsPerLitre = (v: number): KilogramsPerLitre =>
  nonNegative(v, "density") as KilogramsPerLitre;
export const gramsPerMol = (v: number): GramsPerMol =>
  nonNegative(v, "molar mass") as GramsPerMol;

// --- named operators, so an arithmetic result can be stored back ------------

export function sumAmounts(...parts: readonly Mol[]): Mol {
  return mol(parts.reduce((a, b) => a + b, 0));
}

export function sumVolumes(...parts: readonly Litre[]): Litre {
  return litre(parts.reduce((a, b) => a + b, 0));
}

export function sumMasses(...parts: readonly Kilogram[]): Kilogram {
  return kilogram(parts.reduce((a, b) => a + b, 0));
}

export function scaleVolume(v: Litre, factor: number): Litre {
  return litre(v * factor);
}

export function scaleAmount(n: Mol, factor: number): Mol {
  return mol(n * factor);
}

// `negateMillimetre` was removed here rather than kept "just in case". Nothing
// consumed it and nothing conceptually needs it: a geometry coordinate may be
// negative, but negating a length is not an operation the renderer or the world
// asks for. Speculative API in a contract module is a liability — it has to be
// understood, versioned and maintained whether or not it is ever correct.

// ---------------------------------------------------------------------------
// THE CONVERSION MODULE
// ---------------------------------------------------------------------------
// Every conversion the project needs lives here and nowhere else. No `* 1000`
// and no inline factor appears anywhere else in the repository (`ADR-0004` §4).

/** Standard molality, `m° = 1 mol/kg`. Defines the reduced quantities. */
export const STANDARD_MOLALITY = 1 as MolPerKilogram;

/** `m̂ = m / m°`, dimensionless. */
export function reduceMolality(m: MolPerKilogram): ReducedMolality {
  return reducedMolality(m / STANDARD_MOLALITY);
}

/** `m = m̂ · m°`, mol/kg. The boundary conversion, applied exactly once. */
export function physicalMolality(mHat: ReducedMolality): MolPerKilogram {
  return molPerKilogram(mHat.value * STANDARD_MOLALITY);
}

/** `Î = I_m / m°`, dimensionless. Argument of the Davies equation. */
export function reduceIonicStrength(iMolal: IonicStrengthMolal): ReducedIonicStrength {
  return reducedIonicStrength(iMolal.value / STANDARD_MOLALITY);
}

/** `I_m = Î · m°`, mol/kg. */
export function physicalIonicStrength(
  iHat: ReducedIonicStrength,
): IonicStrengthMolal {
  return ionicStrengthMolal(iHat.value * STANDARD_MOLALITY);
}

export function gramsToKilograms(g: Gram): Kilogram {
  return kilogram(g / 1000);
}

export function gramsPerMolToKilogramsPerMol(g: GramsPerMol): KilogramsPerMol {
  return kilogramsPerMol(g / 1000);
}

/** `c = n / V`. The definition of molarity; no density involved. */
export function molarityOf(n: Mol, volume: Litre): MolPerLitre {
  if (volume === 0) throw new RangeError("molarityOf: volume is zero");
  return molPerLitre(n / volume);
}

/** `n = c · V`. */
export function amountFromMolarity(c: MolPerLitre, volume: Litre): Mol {
  return mol(c * volume);
}

/**
 * Molality -> molarity, for a SINGLE solute.
 *
 * Needs two things molality alone does not carry: the solute's molar mass and
 * the SOLUTION's density. Both are sourced scenario inputs, never a model this
 * project invents (`ADR-0004` §4). Derivation, per kg of water:
 *
 *   n     = m            mol
 *   m_s   = m·M          kg of solute
 *   m_tot = 1 + m·M      kg of solution
 *   V     = (1 + m·M)/ρ  L
 *   c     = n/V = m·ρ/(1 + m·M)
 */
export function molalityToMolarity(
  m: MolPerKilogram,
  molarMass: KilogramsPerMol,
  solutionDensity: KilogramsPerLitre,
): MolPerLitre {
  const denominator = 1 + m * molarMass;
  if (denominator <= 0) {
    throw new RangeError("molalityToMolarity: non-positive solution mass");
  }
  return molPerLitre((m * solutionDensity) / denominator);
}

/** The inverse of `molalityToMolarity`. `m = c/(ρ − c·M)`. */
export function molarityToMolality(
  c: MolPerLitre,
  molarMass: KilogramsPerMol,
  solutionDensity: KilogramsPerLitre,
): MolPerKilogram {
  const denominator = solutionDensity - c * molarMass;
  if (denominator <= 0) {
    throw new RangeError("molarityToMolality: solute exceeds solution mass");
  }
  return molPerKilogram(c / denominator);
}

/** Temperature in kelvin from degrees Celsius. */
export const KELVIN_OFFSET = 273.15;
export function celsius(kelvinValue: Kelvin): number {
  return kelvinValue - KELVIN_OFFSET;
}
export function fromCelsius(celsiusValue: number): Kelvin {
  return kelvin(celsiusValue + KELVIN_OFFSET);
}
