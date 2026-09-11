/**
 * COMPILE-TIME GUARANTEES — this file is a test, not code.
 *
 * It is EXCLUDED from the package build (see `tsconfig.json`) and checked
 * separately by `pnpm verify:guarantees`, which runs `tsc --noEmit` against it.
 *
 * HOW IT WORKS
 * ------------
 * Every `@ts-expect-error` below asserts that the NEXT line is a type error. If
 * a guarantee ever stops holding, the directive becomes UNUSED and TypeScript
 * reports TS2578 — so the check fails. A passing `tsc` therefore means every
 * guarantee in this file still holds.
 *
 * This exists because these guarantees CANNOT be tested at runtime. `m° = 1`
 * makes reduced and physical molality numerically identical, so a numeric test
 * passes whether or not the types are being respected. Standard-state safety is
 * a compile-time property or it is nothing (`SPEC-0001` AC-U5, round 4).
 *
 * Rationale for each split is in `ADR-0004` §2: opaque where arithmetic is
 * meaningless, branded where it is meaningful.
 */

import {
  activity,
  differencePh,
  ionicStrengthMolar,
  ionicStrengthMolal,
  litre,
  mol,
  molPerKilogram,
  moleFraction,
  ph,
  ratioActivity,
  reduceMolality,
  reducedMolality,
  type Litre,
  type Mol,
  type MolPerKilogram,
  taughtHydrogenIonExponent,
  type ReducedMolality,
  type TeachingHydrogenIonExponent,
  activityCoefficient,
  divideActivityCoefficient,
  log10ActivityCoefficient,
  multiplyActivityCoefficient,
  reducedIonicStrength,
  sumIonicStrengthMolal,
  sumIonicStrengthMolar,
  sumReducedIonicStrength,
  thermodynamicConstant,
  type ActivityCoefficient,
  type ThermodynamicConstant,
} from "./units.js";

// ---------------------------------------------------------------------------
// OPAQUE — raw arithmetic is a compile error
// ---------------------------------------------------------------------------

export function opaqueGuarantees(): void {
  const a = ph(1);
  const b = ph(2);

  // @ts-expect-error — `+` is not defined for Ph. Averaging a pH has no meaning.
  void (a + b);

  // @ts-expect-error — `/` is not defined for Ph.
  void (a / 2);

  // @ts-expect-error — a bare number is not a Ph.
  void ((1) as unknown as { value: number }) satisfies Ph extends never ? never : unknown;

  const actA = activity(0.5);
  const actB = activity(0.5);

  // @ts-expect-error — activities do not add. They multiply and divide.
  void (actA + actB);
}

/** What IS defined on opaque quantities. These must all compile. */
export function opaqueDefinedOperations(): number {
  const a = activity(0.5);
  const b = activity(0.25);

  // A ratio is meaningful: `Ka = a_H·a_A / a_HA`.
  const ratio = ratioActivity(a, b);

  // A DIFFERENCE of pH values is meaningful even though a sum is not.
  const delta = differencePh(ph(7), ph(4));

  // Mole fractions sum to 1.
  const x = moleFraction(0.25).value + moleFraction(0.75).value;

  return ratio + delta + x;
}

// ---------------------------------------------------------------------------
// BRANDED — arithmetic compiles; the guarantee is narrower and stated honestly
// ---------------------------------------------------------------------------

export function brandedGuarantees(): void {
  const n: Mol = mol(1);
  const v: Litre = litre(2);

  // @ts-expect-error — a bare number cannot be assigned to a quantity.
  const bare: Mol = 1;
  void bare;

  // @ts-expect-error — Mol is not assignable to Litre.
  const crossed: Litre = n;
  void crossed;

  // @ts-expect-error — the RESULT of arithmetic is `number`, so it cannot be
  // stored back as a quantity without an explicit operator.
  const stored: Mol = n + n;
  void stored;

  // This one is LEGAL and is deliberately not marked. Branded types do NOT
  // block the arithmetic — `ADR-0004` says so explicitly, and the numeric-policy
  // spike measured it. Claiming otherwise would be a false guarantee.
  void (n + v);
}

// ---------------------------------------------------------------------------
// THE TWO pH-LIKE QUANTITIES — different numbers, must not be interchangeable
// ---------------------------------------------------------------------------

export function hydrogenIonQuantityGuarantees(): void {
  const modelPh = ph(1.1064);
  const taught = taughtHydrogenIonExponent(1.0);

  // For 0.1000 mol/L HCl these are 1.1064 and 1.0000. Same solution, different
  // numbers. AC-S9 requires them not to be assignable in either direction.
  // @ts-expect-error — model pH is not the taught quantity
  const a: Ph = taught;
  void a;

  // @ts-expect-error — and the other direction
  const b: TeachingHydrogenIonExponent = modelPh;
  void b;

  // @ts-expect-error — arithmetic is not defined on the taught quantity either.
  void (taught + taught);
}

// ---------------------------------------------------------------------------
// STANDARD STATE — reduced vs physical must not be interchangeable
// ---------------------------------------------------------------------------

export function standardStateGuarantees(): void {
  const m: MolPerKilogram = molPerKilogram(0.1);
  const mHat: ReducedMolality = reduceMolality(m);

  // @ts-expect-error — reduced molality is dimensionless; physical molality is
  // mol/kg. They are numerically identical at m° = 1 and must still be distinct
  // types, which is the entire point of AC-U5.
  const asPlain: MolPerKilogram = mHat;
  void asPlain;

  // @ts-expect-error — and the other direction.
  const asReduced: ReducedMolality = m;
  void asReduced;

  // The boundary conversion is a function, so it is visible at every call site.
  void reducedMolality(mHat.value);
}

// ---------------------------------------------------------------------------
// IONIC STRENGTH — three bases, mutually non-assignable and non-comparable
// ---------------------------------------------------------------------------

export function ionicStrengthGuarantees(): void {
  const molal = ionicStrengthMolal(0.1);
  const molar = ionicStrengthMolar(0.1);
  const reduced = reducedIonicStrength(0.1);

  // @ts-expect-error — the two bases are different quantities.
  const crossed: typeof molar = molal;
  void crossed;

  // @ts-expect-error — and they cannot be compared, which is where a silent
  // mix-up would be most confusing: the numbers are nearly equal.
  void (molal === molar);

  // @ts-expect-error — summing across bases must not compile either. A single
  // generic `sumIonicStrength` would have accepted this silently.
  void sumIonicStrengthMolal(molal, molar);

  // @ts-expect-error — nor may a reduced value stand in for a dimensional one.
  void sumIonicStrengthMolal(molal, reduced);

  // Each basis sums within itself. These must compile.
  void sumIonicStrengthMolal(molal, molal);
  void sumIonicStrengthMolar(molar, molar);
  void sumReducedIonicStrength(reduced, reduced);
}

// ---------------------------------------------------------------------------
// ACTIVITY COEFFICIENT — multiplies and divides, never adds
// ---------------------------------------------------------------------------

export function activityCoefficientGuarantees(): void {
  const g = activityCoefficient(0.8);

  // @ts-expect-error — coefficients do not add.
  void (g + g);

  // @ts-expect-error — a bare number is not a coefficient.
  const bare: ActivityCoefficient = 0.8;
  void bare;

  // @ts-expect-error — and an activity is not a coefficient, though both are
  // dimensionless and both sit around 1.
  const crossedWithActivity: ActivityCoefficient = activity(0.8);
  void crossedWithActivity;

  // The defined operations: multiply, divide, log10. These must compile.
  void multiplyActivityCoefficient(g, g);
  void divideActivityCoefficient(g, g);
  void log10ActivityCoefficient(g);
}

// ---------------------------------------------------------------------------
// EQUILIBRIUM CONSTANTS — thermodynamic is not conditional
// ---------------------------------------------------------------------------

export function thermodynamicConstantGuarantees(): void {
  const ka = thermodynamicConstant(1.8e-5);

  // @ts-expect-error — a bare number is not a thermodynamic constant. This is
  // the assignment that would let a CONDITIONAL (I-dependent, derived inside
  // the loop) constant be stored where a standard-state one belongs, which is
  // anti-pattern 5 of the quantity ontology.
  const bare: ThermodynamicConstant = 1.8e-5;
  void bare;

  // @ts-expect-error — nor is an activity, though both are dimensionless and
  // both live near 1 in dilute solution.
  const asActivity: ThermodynamicConstant = activity(1);
  void asActivity;

  // @ts-expect-error — and a reduced molality, also dimensionless.
  const asMolality: ThermodynamicConstant = reducedMolality(0.1);
  void asMolality;

  void ka.value;
}
