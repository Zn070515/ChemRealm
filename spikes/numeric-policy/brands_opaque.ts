/**
 * SPIKE (remediation P1-4) - does an OPAQUE representation actually control
 * arithmetic, where branding does not?
 *
 * An opaque type is not a `number` at all, so the `+` operator has no
 * definition for it and the compiler rejects the arithmetic itself rather than
 * merely rejecting the assignment of its result.
 *
 * How to read the result: every `@ts-expect-error` below must be "used" -
 * i.e. the following line must genuinely be a type error. If tsc emits
 * error TS2578 on any of them, the opaque type failed to prevent that
 * operation.
 *
 * Run: npx tsc --noEmit brands_opaque.ts
 */

declare const phBrand: unique symbol;
declare const molBrand: unique symbol;
declare const litreBrand: unique symbol;

export interface Ph {
  readonly [phBrand]: true;
  readonly value: number;
}

export interface Mol {
  readonly [molBrand]: true;
  readonly value: number;
}

export interface Litre {
  readonly [litreBrand]: true;
  readonly value: number;
}

declare const ph: (n: number) => Ph;
declare const mol: (n: number) => Mol;
declare const litre: (n: number) => Litre;

const p1: Ph = ph(1);
const p2: Ph = ph(2);
const m1: Mol = mol(1);

/* Arithmetic on an opaque type is a TYPE ERROR, not merely an assignment error. */
// @ts-expect-error operator '+' cannot be applied to Ph and Ph
const o1 = p1 + p2;

// @ts-expect-error operator '/' cannot be applied to Ph and number
const o2 = p1 / 2;

// @ts-expect-error Mol is not assignable to Litre
const o3: Litre = m1;

// @ts-expect-error plain number is not assignable to Mol
const o4: Mol = 1;

/* The value is reachable only by explicitly unwrapping, which is visible in
   review - which is the entire point. */
const o5: number = p1.value + p2.value;

export { p1, p2, m1, o1, o2, o3, o4, o5 };
