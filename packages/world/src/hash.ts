/**
 * Deterministic hashing primitives for the World Runtime (`ADR-0007`).
 *
 * Canonical JSON and SHA-256 are shared with schema so content-addressed
 * records have one implementation across persistence, world, and render
 * boundaries. World-specific replay identity additionally owns quantization.
 */

import {
  canonicalJson,
  hashCanonical,
  type CanonicalJsonValue,
} from "@chemrealm/schema";

export { canonicalJson, hashCanonical };
export type { CanonicalJsonValue };

/** Quantize one canonical numeric value, as required by `ADR-0007` §3. */
export function quantize(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`quantize: expected a finite number, got ${value}`);
  }
  const rounded = Number(value.toPrecision(12));
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Apply the one quantization policy recursively without changing structure. */
export function quantizeTree(value: unknown): unknown {
  if (typeof value === "number") return quantize(value);
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => quantizeTree(item));
  if (typeof value === "object") {
    if (value === null) return value;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      result[key] = quantizeTree((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  throw new TypeError("quantizeTree: value is not JSON-compatible");
}

/** Hash a derived-science projection without making it part of world truth. */
export function scienceHash(value: unknown): string {
  return hashCanonical(quantizeTree(value));
}
