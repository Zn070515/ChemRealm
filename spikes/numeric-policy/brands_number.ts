/**
 * SPIKE (remediation P1-4) - what does `number & { __unit }` ACTUALLY guarantee?
 *
 * ADR-0004 claimed branded numeric types make unit-mixing and pH-averaging
 * "unavailable". That claim is tested here rather than assumed.
 *
 * How to read the result: each `@ts-expect-error` directive asserts that the
 * NEXT line is a type error. If the line is in fact legal, tsc reports
 * error TS2578 "Unused '@ts-expect-error' directive" - and that report is the
 * falsification. So:
 *
 *   tsc reports NO errors  -> branded numbers provide the claimed guarantee
 *   tsc reports TS2578     -> the claim is FALSE on that line
 *
 * Run: npx tsc --noEmit brands_number.ts
 */

type Mol = number & { readonly __unit: "mol" };
type Litre = number & { readonly __unit: "L" };
type Ph = number & { readonly __unit: "pH" };

declare const mol: (n: number) => Mol;
declare const litre: (n: number) => Litre;
declare const ph: (n: number) => Ph;

const a: Mol = mol(1);
const b: Litre = litre(2);

/* --- CLAIM 1: a plain number cannot be used where a quantity is expected. ---
   Branded types DO provide this. Expect: no TS2578. */
// @ts-expect-error plain number is not assignable to Mol
const c1: Mol = 1;

/* --- CLAIM 2: quantities of different units cannot be assigned to each other. ---
   Branded types DO provide this. Expect: no TS2578. */
// @ts-expect-error Mol is not assignable to Litre
const c2: Litre = a;

/* --- CLAIM 3: the RESULT of arithmetic cannot be silently stored as a quantity. ---
   Branded types DO provide this. Expect: no TS2578. */
// @ts-expect-error `number` (the result of +) is not assignable to Mol
const c3: Mol = a + a;

/* --- CLAIM 4 (THE OVERSTATEMENT): "arithmetic such as adding or averaging pH
   is unavailable". Under branding, `a + b` is perfectly legal TypeScript; it
   simply has type `number`. Expect: TS2578 -> the claim is FALSE. --- */
// @ts-expect-error claimed: cannot add a Mol to a Litre
const c4 = a + b;

// @ts-expect-error claimed: cannot add two Moles
const c5 = a + a;

// @ts-expect-error claimed: pH cannot be averaged
const c6 = (ph(1) + ph(2)) / 2;

/* --- CLAIM 5: the guarantee that DOES hold for pH under branding is weaker
   than stated. You cannot STORE an averaged pH back as a Ph, but you can
   freely compute and pass around the bare number. Expect: no TS2578, because
   this line genuinely errors. --- */
// @ts-expect-error `number` is not assignable to Ph
const c7: Ph = (ph(1) + ph(2)) / 2;

export { a, b, c1, c2, c3, c4, c5, c6, c7 };
