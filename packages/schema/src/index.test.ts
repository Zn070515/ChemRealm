import { describe, expect, it } from "vitest";

import { QuantitySchema, SCHEMA_VERSION } from "./index.js";

describe("packages/schema placeholder", () => {
  it("exposes a schema version", () => {
    expect(SCHEMA_VERSION).toBe(1);
  });

  it("accepts a well-formed quantity tuple", () => {
    expect(QuantitySchema.safeParse({ value: 0.05, unit: "L" }).success).toBe(true);
  });

  it("rejects a bare number, because serialized quantities carry their unit", () => {
    expect(QuantitySchema.safeParse(0.05).success).toBe(false);
  });

  it("rejects a missing or empty unit rather than defaulting one", () => {
    expect(QuantitySchema.safeParse({ value: 0.05 }).success).toBe(false);
    expect(QuantitySchema.safeParse({ value: 0.05, unit: "" }).success).toBe(false);
  });
});
