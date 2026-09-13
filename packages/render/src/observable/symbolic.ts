import {
  SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
  ScientificExpressionSchema,
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
    const parsed = ScientificExpressionSchema.parse(line);
    if (parsed.id.trim().length === 0 || parsed.expression.trim().length === 0) {
      throw new RangeError("symbolic line requires an id and expression");
    }
    if (parsed.label !== "exact" && parsed.label !== "shortcut") {
      throw new RangeError(`unsupported symbolic line label: ${parsed.label}`);
    }
    if (
      parsed.schemaVersion !== SCIENTIFIC_EXPRESSION_SCHEMA_VERSION ||
      parsed.sourceStateHash !== expectedIdentity.sourceStateHash ||
      parsed.modelId !== expectedIdentity.modelId ||
      parsed.modelVersion !== expectedIdentity.modelVersion
    ) {
      throw new RangeError("symbolic line does not belong to the scientific frame identity");
    }
    return Object.freeze({
      ...parsed,
      omittedTerms: Object.freeze([...parsed.omittedTerms]),
    });
  });
  return Object.freeze(result) as readonly PresentedScientificExpression[];
}
