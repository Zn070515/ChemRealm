import {
  SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
  type ScientificExpression,
} from "@chemrealm/schema";

import type { ScientificFrame } from "./frame.js";

/** Version of the Scientific Core's expression producer contract. */
export const SCIENTIFIC_EXPRESSION_PRODUCER_VERSION = "1.0.0";

/**
 * Produce the inspection expressions owned by the Scientific Core.
 *
 * Render receives these records after this boundary; it never authors a line
 * and then labels it as exact. The expression is intentionally a model
 * statement rather than a renderer string: the actual numbers remain in the
 * bound ScientificState and the model identity travels with this record.
 */
export function createScientificExpressions(
  frame: ScientificFrame,
): readonly ScientificExpression[] {
  const { modelId, modelVersion, activityModel } = frame.scientificState.provenance;
  const species = frame.scientificState.species.map((entry) => entry.symbol).join(", ");
  const expression: ScientificExpression = {
    schemaVersion: SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
    id: "equilibrium-system",
    label: "exact",
    expression:
      `solve charge balance and component balances self-consistently ` +
      `for ${species || "the declared species"} using ${activityModel} activities`,
    omittedTerms: [],
    producerId: "scientific-core",
    producerVersion: SCIENTIFIC_EXPRESSION_PRODUCER_VERSION,
    modelId,
    modelVersion,
    sourceStateHash: frame.sourceStateHash,
  };
  return Object.freeze([Object.freeze(expression)]);
}
