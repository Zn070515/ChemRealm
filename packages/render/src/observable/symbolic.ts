export type SymbolicLineLabel = "exact" | "shortcut";

export interface SymbolicLine {
  readonly id: string;
  readonly label: SymbolicLineLabel;
  readonly expression: string;
  readonly omittedTerms: readonly string[];
}

/** Present expressions supplied by Scientific Core; never derive or rewrite. */
export function presentSymbolicLines(
  lines: readonly SymbolicLine[],
): readonly SymbolicLine[] {
  const result = lines.map((line) => {
    if (line.id.trim().length === 0 || line.expression.trim().length === 0) {
      throw new RangeError("symbolic line requires an id and expression");
    }
    if (line.label !== "exact" && line.label !== "shortcut") {
      throw new RangeError(`unsupported symbolic line label: ${line.label}`);
    }
    return Object.freeze({
      ...line,
      omittedTerms: Object.freeze([...line.omittedTerms]),
    });
  });
  return Object.freeze(result);
}
