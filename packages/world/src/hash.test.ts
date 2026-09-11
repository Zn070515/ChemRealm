import { describe, expect, it } from "vitest";

import { canonicalJson, hashCanonical, quantize, quantizeTree } from "./hash.js";

describe("canonical replay hashing", () => {
  it("sorts object keys and normalizes negative zero", () => {
    expect(canonicalJson({ b: 2, a: -0 })).toBe('{"a":0,"b":2}');
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  });

  it("rejects non-finite numbers instead of serializing them as null", () => {
    expect(() => canonicalJson({ value: Number.NaN })).toThrow(RangeError);
    expect(() => canonicalJson({ value: Number.POSITIVE_INFINITY })).toThrow(RangeError);
    expect(() => canonicalJson([Number.NEGATIVE_INFINITY])).toThrow(RangeError);
  });

  it("quantizes finite values to twelve significant digits", () => {
    expect(quantize(1.2345678901234)).toBe(1.23456789012);
    expect(quantize(-0)).toBe(0);
    expect(quantizeTree({ value: 1.2345678901234 })).toEqual({ value: 1.23456789012 });
  });

  it("hashes the canonical bytes, independent of insertion order", () => {
    expect(hashCanonical({ b: 2, a: 1 })).toBe(
      "43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777",
    );
    expect(hashCanonical(null)).toBe(
      "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b",
    );
    expect(hashCanonical([1, 2, 3])).toBe(
      "a615eeaee21de5179de080de8c3052c8da901138406ba71c38c032845f7d54f4",
    );
  });
});
