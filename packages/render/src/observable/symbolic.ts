import {
  SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
  type ScientificExpression,
} from "@chemrealm/schema";

export type PresentedScientificExpression = Omit<
  Readonly<ScientificExpression>,
  "omittedTerms"
> & {
  readonly omittedTerms: readonly string[];
};

export interface ScientificExpressionIdentity {
  readonly sourceStateHash: string;
  readonly modelId: string;
  readonly modelVersion: string;
}

/** Present expressions supplied by Scientific Core; never derive or rewrite. */
export function presentSymbolicLines(
  lines: readonly ScientificExpression[],
  expectedIdentity: ScientificExpressionIdentity,
): readonly PresentedScientificExpression[] {
  const result = lines.map((line) => {
    if (line.id.trim().length === 0 || line.expression.trim().length === 0) {
      throw new RangeError("symbolic line requires an id and expression");
    }
    if (line.label !== "exact" && line.label !== "shortcut") {
      throw new RangeError(`unsupported symbolic line label: ${line.label}`);
    }
    if (
      line.schemaVersion !== SCIENTIFIC_EXPRESSION_SCHEMA_VERSION ||
      line.sourceStateHash !== expectedIdentity.sourceStateHash ||
      line.modelId !== expectedIdentity.modelId ||
      line.modelVersion !== expectedIdentity.modelVersion
    ) {
      throw new RangeError("symbolic line does not belong to the scientific frame identity");
    }
    return Object.freeze({
      ...line,
      omittedTerms: Object.freeze([...line.omittedTerms]),
    });
  });
  return Object.freeze(result) as readonly PresentedScientificExpression[];
}
