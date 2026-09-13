import { describe, expect, it } from "vitest";
import { ScientificExpressionSchema } from "./scientific.js";

describe("scientific expression contract", () => {
  it("requires model and source-state identity", () => {
    expect(() =>
      ScientificExpressionSchema.parse({
        schemaVersion: 1,
        id: "equilibrium",
        label: "exact",
        expression: "supplied-expression",
        omittedTerms: [],
        modelId: "acidbase-monoprotic-davies",
        modelVersion: "1.0.0",
        sourceStateHash: "state-hash",
      }),
    ).not.toThrow();
  });

  it("rejects an expression without source identity", () => {
    expect(() =>
      ScientificExpressionSchema.parse({
        schemaVersion: 1,
        id: "equilibrium",
        label: "exact",
        expression: "supplied-expression",
        omittedTerms: [],
      }),
    ).toThrow();
  });
});
