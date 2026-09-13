import { describe, expect, it } from "vitest";
import { presentSymbolicLines, type SymbolicLine } from "./symbolic.js";

describe("symbolic observable", () => {
  it("presents supplied scientific expressions without rewriting them", () => {
    const source: SymbolicLine[] = [
      {
        id: "exact",
        label: "exact",
        expression: "supplied-exact-expression",
        omittedTerms: [],
      },
      {
        id: "shortcut",
        label: "shortcut",
        expression: "supplied-shortcut-expression",
        omittedTerms: ["activity correction"],
      },
    ];

    const lines = presentSymbolicLines(source);
    expect(lines).toEqual(source);
    expect(lines).not.toBe(source);
    expect(Object.isFrozen(lines)).toBe(true);
    expect(Object.isFrozen(lines[0])).toBe(true);
  });
});
