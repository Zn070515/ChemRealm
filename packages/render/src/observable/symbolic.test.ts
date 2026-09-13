import { describe, expect, it } from "vitest";
import { presentSymbolicLines } from "./symbolic.js";
import {
  SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
  TEST_MODEL_VERSION,
  type ScientificExpression,
} from "@chemrealm/schema";

describe("symbolic observable", () => {
  it("presents supplied scientific expressions without rewriting them", () => {
    const source: ScientificExpression[] = [
      {
        schemaVersion: SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
        id: "exact",
        equationId: "charge-balance",
        label: "exact",
        expression: "supplied-exact-expression",
        formula: "m(H+) = m(OH-)",
        substitutions: [{ symbol: "m(H+)", value: 0.1, unit: "mol/kg" }],
        omittedTerms: [],
        producerId: "scientific-core",
        producerVersion: TEST_MODEL_VERSION,
        modelId: "acidbase-monoprotic-davies",
        modelVersion: TEST_MODEL_VERSION,
        sourceStateHash: "state-hash",
      },
      {
        schemaVersion: SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
        id: "shortcut",
        equationId: "acid-family-equilibrium",
        label: "shortcut",
        expression: "supplied-shortcut-expression",
        formula: "Ka = a(H+) a(OAc-) / a(HOAc)",
        substitutions: [{ symbol: "Ka", value: 1e-5, unit: "1" }],
        omittedTerms: ["activity correction"],
        producerId: "scientific-core",
        producerVersion: TEST_MODEL_VERSION,
        modelId: "acidbase-monoprotic-davies",
        modelVersion: TEST_MODEL_VERSION,
        sourceStateHash: "state-hash",
      },
    ];

    const lines = presentSymbolicLines(source, {
      sourceStateHash: "state-hash",
      modelId: "acidbase-monoprotic-davies",
      modelVersion: TEST_MODEL_VERSION,
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
            schemaVersion: SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
            id: "exact",
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
            sourceStateHash: "other-state",
          },
        ],
        {
          sourceStateHash: "state-hash",
          modelId: "acidbase-monoprotic-davies",
          modelVersion: TEST_MODEL_VERSION,
        },
      ),
    ).toThrow(RangeError);
  });

  it("rejects an expression from a different model identity", () => {
    expect(() =>
      presentSymbolicLines(
        [
          {
            schemaVersion: SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
            id: "exact",
            equationId: "charge-balance",
            label: "exact",
            expression: "supplied-expression",
            formula: "m(H+) = m(OH-)",
            substitutions: [{ symbol: "m(H+)", value: 0.1, unit: "mol/kg" }],
            omittedTerms: [],
            producerId: "scientific-core",
            producerVersion: TEST_MODEL_VERSION,
            modelId: "other-model",
            modelVersion: TEST_MODEL_VERSION,
            sourceStateHash: "state-hash",
          },
        ],
        {
          sourceStateHash: "state-hash",
          modelId: "acidbase-monoprotic-davies",
          modelVersion: TEST_MODEL_VERSION,
        },
      ),
    ).toThrow(RangeError);
  });
});
