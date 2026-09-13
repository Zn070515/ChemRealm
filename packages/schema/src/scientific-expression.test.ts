import { describe, expect, it } from "vitest";
import {
  SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
  ScientificExpressionSchema,
} from "./scientific.js";
import { TEST_MODEL_VERSION } from "./generated/versions.js";

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
        producerVersion: TEST_MODEL_VERSION,
        modelId: "acidbase-monoprotic-davies",
        modelVersion: TEST_MODEL_VERSION,
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
