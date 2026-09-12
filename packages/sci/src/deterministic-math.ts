/**
 * Deterministic base-10 logarithm/exponential for the Scientific Reality Core.
 *
 * The implementation intentionally does not delegate to implementation-
 * approximated Math.log10/Math.exp/Math.pow. Constants and operation ordering
 * are part of the numeric policy; changing them requires new reference vectors.
 */

const LN2_HIGH = 0.6931471803691238;
const LN2_LOW = 1.9082150941723212e-10;
const LOG2_10_HIGH = 3.321928024291992;
const LOG2_10_LOW = 7.059537034787032e-8;
const LOG10_2_HIGH = 0.3010299956639812;
const LOG10_2_LOW = -4.786261105275507e-18;
const LOG10_E_HIGH = 0.4342944819032518;
const LOG10_E_LOW = 2.7651128918916604e-17;
const SQRT2 = 1.4142135623730951;
const MIN_NORMAL = 2.2250738585072014e-308;

/** The measured public range used by the M4 solver and its validation cases. */
export const DET_EXP10_DOMAIN = [-0.135, 0] as const;
export const DET_LOG10_DOMAIN = [MIN_NORMAL, Number.MAX_VALUE] as const;

type DoubleDouble = {
  readonly hi: number;
  readonly lo: number;
};

const SPLIT_FACTOR = 134217729;

function twoSum(first: number, second: number): DoubleDouble {
  const sum = first + second;
  const virtual = sum - first;
  const error = (first - (sum - virtual)) + (second - virtual);
  return { hi: sum, lo: error };
}

function twoProduct(first: number, second: number): DoubleDouble {
  const product = first * second;
  const firstSplit = SPLIT_FACTOR * first;
  const firstHigh = firstSplit - (firstSplit - first);
  const firstLow = first - firstHigh;
  const secondSplit = SPLIT_FACTOR * second;
  const secondHigh = secondSplit - (secondSplit - second);
  const secondLow = second - secondHigh;
  const error =
    ((firstHigh * secondHigh - product) + firstHigh * secondLow + firstLow * secondHigh) +
    firstLow * secondLow;
  return { hi: product, lo: error };
}

function addDoubleDouble(first: DoubleDouble, second: DoubleDouble): DoubleDouble {
  const leading = twoSum(first.hi, second.hi);
  const low = leading.lo + first.lo + second.lo;
  const hi = leading.hi + low;
  return { hi, lo: low - (hi - leading.hi) };
}

function multiplyDoubleDouble(first: DoubleDouble, second: DoubleDouble): DoubleDouble {
  const leading = twoProduct(first.hi, second.hi);
  const cross = addDoubleDouble(
    twoProduct(first.hi, second.lo),
    addDoubleDouble(twoProduct(first.lo, second.hi), twoProduct(first.lo, second.lo)),
  );
  return addDoubleDouble(leading, cross);
}

function negateDoubleDouble(value: DoubleDouble): DoubleDouble {
  return { hi: -value.hi, lo: -value.lo };
}

function divideDoubleDouble(numerator: DoubleDouble, denominator: DoubleDouble): DoubleDouble {
  const quotient = numerator.hi / denominator.hi;
  const product = multiplyDoubleDouble({ hi: quotient, lo: 0 }, denominator);
  const residual = addDoubleDouble(numerator, negateDoubleDouble(product));
  const correction = (residual.hi + residual.lo) / denominator.hi;
  return addDoubleDouble({ hi: quotient, lo: 0 }, { hi: correction, lo: 0 });
}

function divideByInteger(value: DoubleDouble, divisor: number): DoubleDouble {
  return { hi: value.hi / divisor, lo: value.lo / divisor };
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name}: expected a finite number`);
  }
}

/** Exact 2^k for the exponent range needed by detExp10. */
function powerOfTwo(k: number): number {
  const exponent = k + 1023;
  if (exponent <= 0 || exponent >= 0x7ff) {
    throw new RangeError(`detExp10: power-of-two exponent is outside range: ${k}`);
  }
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, exponent << 20);
  view.setUint32(4, 0);
  return view.getFloat64(0);
}

/**
 * Deterministic 10^x using two-part Cody–Waite argument reduction.
 * The validated interval is the measured Davies call band. The reduction is
 * implemented with fixed-order double-double arithmetic so the public domain
 * does not depend on a single engine's intermediate rounding behaviour.
 */
export function detExp10(value: number): number {
  assertFinite(value, "detExp10");
  if (value < DET_EXP10_DOMAIN[0] || value > DET_EXP10_DOMAIN[1]) {
    throw new RangeError(
      `detExp10: value ${value} is outside [${DET_EXP10_DOMAIN[0]}, ${DET_EXP10_DOMAIN[1]}]`,
    );
  }

  const reducedLog2 = addDoubleDouble(
    twoProduct(value, LOG2_10_HIGH),
    twoProduct(value, LOG2_10_LOW),
  );
  const k = Math.round(reducedLog2.hi + reducedLog2.lo);
  const fraction = addDoubleDouble(
    { hi: reducedLog2.hi - k, lo: reducedLog2.lo },
    { hi: 0, lo: 0 },
  );
  const r = multiplyDoubleDouble(
    fraction,
    { hi: LN2_HIGH, lo: LN2_LOW },
  );

  let term: DoubleDouble = { hi: 1, lo: 0 };
  let sum: DoubleDouble = { hi: 1, lo: 0 };
  for (let i = 1; i <= 18; i += 1) {
    term = divideByInteger(multiplyDoubleDouble(term, r), i);
    sum = addDoubleDouble(sum, term);
  }
  const scaled = multiplyDoubleDouble(sum, { hi: powerOfTwo(k), lo: 0 });
  return scaled.hi + scaled.lo;
}

/**
 * Deterministic log10 by binary exponent decomposition and an atanh series.
 * Subnormal inputs are rejected because they are outside the measured domain;
 * the M4 chemistry never needs them.
 */
export function detLog10(value: number): number {
  assertFinite(value, "detLog10");
  if (value < DET_LOG10_DOMAIN[0] || value > DET_LOG10_DOMAIN[1]) {
    throw new RangeError("detLog10: value is outside the validated domain");
  }

  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value);
  let high = view.getUint32(0);
  const low = view.getUint32(4);
  let exponent = ((high >>> 20) & 0x7ff) - 1023;
  high = (high & 0x800fffff) | (1023 << 20);
  view.setUint32(0, high);
  view.setUint32(4, low);

  let mantissa = view.getFloat64(0);
  if (mantissa > SQRT2) {
    mantissa *= 0.5;
    exponent += 1;
  }

  const t = divideDoubleDouble(
    twoSum(mantissa, -1),
    twoSum(mantissa, 1),
  );
  const tSquared = multiplyDoubleDouble(t, t);
  let term = t;
  let sum: DoubleDouble = { hi: 0, lo: 0 };
  for (let i = 0; i < 16; i += 1) {
    sum = addDoubleDouble(sum, divideByInteger(term, 2 * i + 1));
    term = multiplyDoubleDouble(term, tSquared);
  }
  const naturalLogMantissa = { hi: 2 * sum.hi, lo: 2 * sum.lo };
  const exponentPart = multiplyDoubleDouble(
    { hi: exponent, lo: 0 },
    { hi: LOG10_2_HIGH, lo: LOG10_2_LOW },
  );
  const mantissaPart = multiplyDoubleDouble(
    naturalLogMantissa,
    { hi: LOG10_E_HIGH, lo: LOG10_E_LOW },
  );
  const result = addDoubleDouble(exponentPart, mantissaPart);
  return result.hi + result.lo;
}
