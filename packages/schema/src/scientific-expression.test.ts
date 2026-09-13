import { describe, expect, it } from "vitest";
import {
  SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
  ScientificExpressionSchema,
} from "./scientific.js";

describe("scientific expression contract", () => {
  it("requires model and source-state identity", () => {
    expect(() =>
      ScientificExpressionSchema.parse({
        schemaVersion: SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
        id: "equilibrium",
        equationId: "charge-balance",
        label: "exact",
        expression: "supplied-expression",
        formula: "m(H+) = m(OH-)",
        substitutions: [{ symbol: "m(H+)", value: 0.1, unit: "mol/kg" }],
        omittedTerms: [],
        producerId: "scientific-core",
        producerVersion: "1.0.0",
        modelId: "acidbase-monoprotic-davies",
        modelVersion: "1.0.0",
        sourceStateHash: "state-hash",
      }),
    ).not.toThrow();
  });

  it("rejects an expression without source identity", () => {
    expect(() =>
      ScientificExpressionSchema.parse({
        schemaVersion: SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
        id: "equilibrium",
        equationId: "charge-balance",
        label: "exact",
        expression: "supplied-expression",
        formula: "m(H+) = m(OH-)",
        substitutions: [{ symbol: "m(H+)", value: 0.1, unit: "mol/kg" }],
        omittedTerms: [],
      }),
    ).toThrow();
  });
});
