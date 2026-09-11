/**
 * SPIKE (remediation P1-2) - measured cross-implementation behaviour of the
 * math operations the activity model needs, plus the quantization /
 * conservation interaction.
 *
 * Reads vectors.json, writes node_results.json. The comparison against
 * arbitrary-precision references happens in compare.py; this file never
 * decides whether its own output is correct.
 *
 * Run: npx tsc --noEmit && node --experimental-strip-types check.ts
 *      (or compile then run; see README.md)
 */

import { readFileSync, writeFileSync } from "node:fs";

// ---------------------------------------------------------------- bit helpers
function f64ToHex(x: number): string {
  const b = new ArrayBuffer(8);
  new DataView(b).setFloat64(0, x);
  return Buffer.from(b).toString("hex");
}

function hexToF64(h: string): number {
  const b = Buffer.from(h, "hex");
  return new DataView(b.buffer, b.byteOffset, 8).getFloat64(0);
}

// ------------------------------------------- deterministic math (the proposal)
const LN2 = 0.6931471805599453;
const LOG2_10 = 3.321928094887362;
const LOG10_2 = 0.3010299956639812;
const LOG10_E = 0.4342944819032518;

/** Exact 2^k for |k| < 1023, via exponent-field construction. */
function pow2(k: number): number {
  const b = new ArrayBuffer(8);
  const dv = new DataView(b);
  dv.setUint32(0, ((k + 1023) << 20) >>> 0);
  dv.setUint32(4, 0);
  return dv.getFloat64(0);
}

/**
 * Deterministic 10^x.
 * Uses only +, -, *, / and exactly-specified integer operations, so it produces
 * bit-identical results on every conforming engine.
 */
export function detExp10(x: number): number {
  const y = x * LOG2_10;
  const k = Math.round(y);
  const f = y - k;              // |f| <= 0.5
  const r = f * LN2;            // |r| <= 0.3466
  let term = 1.0;
  let sum = 1.0;
  for (let i = 1; i <= 16; i++) {
    term = (term * r) / i;
    sum += term;
  }
  return sum * pow2(k);
}

/**
 * Deterministic log10.
 * Decomposes x into exponent and mantissa by bit manipulation, reduces the
 * mantissa to [1/sqrt2, sqrt2), and evaluates the atanh series.
 */
export function detLog10(x: number): number {
  if (x <= 0) return NaN;
  const b = new ArrayBuffer(8);
  const dv = new DataView(b);
  dv.setFloat64(0, x);
  let hi = dv.getUint32(0);
  const lo = dv.getUint32(4);
  let e = ((hi >>> 20) & 0x7ff) - 1023;
  hi = (hi & 0x800fffff) | (1023 << 20);
  dv.setUint32(0, hi);
  dv.setUint32(4, lo);
  let m = dv.getFloat64(0);
  if (m > 1.4142135623730951) {
    m = m * 0.5;
    e = e + 1;
  }
  const t = (m - 1) / (m + 1);
  const t2 = t * t;
  let term = t;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    sum += term / (2 * i + 1);
    term *= t2;
  }
  const lnM = 2 * sum;
  return e * LOG10_2 + lnM * LOG10_E;
}

// ------------------------------------------------- quantization / conservation
function quantize(v: number, sig = 12): number {
  return Number(v.toPrecision(sig));
}

/**
 * The owner's question: can independent quantization of species break
 * conservation?
 *
 * Three strategies for a 100-step serial transfer out of a vessel:
 *   A. quantize the transfer amount once, apply as exact zero-sum
 *   B. quantize each vessel's amount independently at every step
 *   C. no quantization (the float baseline)
 */
function conservationProbe(): Record<string, number> {
  const N_A = 0.1; // mol of acid, conserved
  const STEPS = 100;

  let worstA = 0;
  let worstB = 0;
  let worstC = 0;

  for (let trial = 0; trial < 500; trial++) {
    // jitter the step fraction so we are not measuring one lucky path
    const frac = 1 / 200 + trial * 1e-9;

    // A: quantize the transfer amount only; apply zero-sum
    {
      let nFrom = N_A;
      let nTo = 0.0;
      for (let s = 0; s < STEPS; s++) {
        const d = quantize(nFrom * frac);
        nFrom = nFrom - d;
        nTo = nTo + d;
      }
      worstA = Math.max(worstA, Math.abs(nFrom + nTo - N_A) / N_A);
    }

    // B: quantize each vessel independently
    {
      let nFrom = quantize(N_A);
      let nTo = quantize(0.0);
      for (let s = 0; s < STEPS; s++) {
        const d = nFrom * frac;
        nFrom = quantize(nFrom - d);
        nTo = quantize(nTo + d);
      }
      worstB = Math.max(worstB, Math.abs(nFrom + nTo - N_A) / N_A);
    }

    // C: no quantization at all
    {
      let nFrom = N_A;
      let nTo = 0.0;
      for (let s = 0; s < STEPS; s++) {
        const d = nFrom * frac;
        nFrom = nFrom - d;
        nTo = nTo + d;
      }
      worstC = Math.max(worstC, Math.abs(nFrom + nTo - N_A) / N_A);
    }
  }

  return {
    "A_transfer_amount_quantized": worstA,
    "B_vessels_quantized_independently": worstB,
    "C_no_quantization": worstC,
  };
}

// ------------------------------------------------------------------------ main
function main(): void {
  const vectors = JSON.parse(readFileSync("vectors.json", "utf8")) as {
    log10: string[];
    exp10: string[];
  };

  const out: Record<string, unknown> = {
    engine: process.version,
    sqrt: [] as { x: string; y: string }[],
    log10: [] as { x: string; y: string; det: string }[],
    exp10: [] as { x: string; y: string; det: string }[],
    conservation: conservationProbe(),
  };

  for (const h of vectors.log10) {
    const x = hexToF64(h);
    (out.sqrt as { x: string; y: string }[]).push({
      x: h,
      y: f64ToHex(Math.sqrt(x)),
    });
    (out.log10 as { x: string; y: string; det: string }[]).push({
      x: h,
      y: f64ToHex(Math.log10(x)),
      det: f64ToHex(detLog10(x)),
    });
  }

  for (const h of vectors.exp10) {
    const x = hexToF64(h);
    (out.exp10 as { x: string; y: string; det: string }[]).push({
      x: h,
      y: f64ToHex(Math.pow(10, x)),
      det: f64ToHex(detExp10(x)),
    });
  }

  writeFileSync("node_results.json", JSON.stringify(out), "utf8");
  console.log(`engine: ${process.version}`);
  console.log(`wrote node_results.json`);
}

main();
