import { describe, expect, it } from "vitest";
import { presentSymbolicLines } from "./symbolic.js";
import { type ScientificExpression } from "@chemrealm/schema";

describe("symbolic observable", () => {
  it("presents supplied scientific expressions without rewriting them", () => {
    const source: ScientificExpression[] = [
      {
        schemaVersion: 1,
        id: "exact",
        label: "exact",
        expression: "supplied-exact-expression",
        omittedTerms: [],
        modelId: "acidbase-monoprotic-davies",
        modelVersion: "1.0.0",
        sourceStateHash: "state-hash",
      },
      {
        schemaVersion: 1,
        id: "shortcut",
        label: "shortcut",
        expression: "supplied-shortcut-expression",
        omittedTerms: ["activity correction"],
        modelId: "acidbase-monoprotic-davies",
        modelVersion: "1.0.0",
        sourceStateHash: "state-hash",
      },
    ];

    const lines = presentSymbolicLines(source, {
      sourceStateHash: "state-hash",
      modelId: "acidbase-monoprotic-davies",
      modelVersion: "1.0.0",
    });
    expect(lines).toEqual(source);
    expect(lines).not.toBe(source);
    expect(Object.isFrozen(lines)).toBe(true);
    expect(Object.isFrozen(lines[0])).toBe(true);
  });

  it("rejects an expression from a different scientific frame", () => {
    expect(() =>
      presentSymbolicLines(
        [
          {
            schemaVersion: 1,
            id: "exact",
            label: "exact",
            expression: "supplied-expression",
            omittedTerms: [],
            modelId: "acidbase-monoprotic-davies",
            modelVersion: "1.0.0",
            sourceStateHash: "other-state",
          },
        ],
        {
          sourceStateHash: "state-hash",
          modelId: "acidbase-monoprotic-davies",
          modelVersion: "1.0.0",
        },
      ),
    ).toThrow(RangeError);
  });

  it("rejects an expression from a different model identity", () => {
    expect(() =>
      presentSymbolicLines(
        [
          {
            schemaVersion: 1,
            id: "exact",
            label: "exact",
            expression: "supplied-expression",
            omittedTerms: [],
            modelId: "other-model",
            modelVersion: "1.0.0",
            sourceStateHash: "state-hash",
          },
        ],
        {
          sourceStateHash: "state-hash",
          modelId: "acidbase-monoprotic-davies",
          modelVersion: "1.0.0",
        },
      ),
    ).toThrow(RangeError);
  });
});
