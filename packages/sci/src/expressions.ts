import {
  SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
  type ScientificExpressionEquationId,
  type ScientificExpressionSubstitution,
  type ScientificExpression,
} from "@chemrealm/schema";

import type { ScientificFrame } from "./frame.js";

/** Version of the Scientific Core's expression producer contract. */
export const SCIENTIFIC_EXPRESSION_PRODUCER_VERSION = "2.0.0";

function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  return value;
}

function format(value: number): string {
  return Number(finite(value, "expression substitution").toPrecision(8)).toString();
}

function speciesValue(frame: ScientificFrame, symbol: string, field: "molality" | "activity" | "activityCoefficient"): number {
  const species = frame.scientificState.species.find((entry) => entry.symbol === symbol);
  if (species === undefined) throw new RangeError(`scientific expression requires species ${symbol}`);
  const value = species[field];
  return typeof value === "number" ? value : value.value;
}

function substitution(
  symbol: string,
  value: number,
  unit: string,
): ScientificExpressionSubstitution {
  return { symbol, value: finite(value, symbol), unit };
}

function substituted(
  symbol: string,
  value: number,
  unit: string,
): string {
  return `${symbol}[${format(value)} ${unit}]`;
}

function makeExpression(
  frame: ScientificFrame,
  equationId: ScientificExpressionEquationId,
  formula: string,
  expression: string,
  substitutions: readonly ScientificExpressionSubstitution[],
  omittedTerms: readonly string[],
): ScientificExpression {
  const { modelId, modelVersion } = frame.scientificState.provenance;
  const frozenSubstitutions = substitutions.map((entry) => ({ ...entry }));
  const frozenOmittedTerms = [...omittedTerms];
  Object.freeze(frozenSubstitutions);
  Object.freeze(frozenOmittedTerms);
  return Object.freeze({
    schemaVersion: SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
    id: equationId,
    equationId,
    label: "exact" as const,
    expression,
    formula,
    substitutions: frozenSubstitutions,
    omittedTerms: frozenOmittedTerms,
    producerId: "scientific-core" as const,
    producerVersion: SCIENTIFIC_EXPRESSION_PRODUCER_VERSION,
    modelId,
    modelVersion,
    sourceStateHash: frame.sourceStateHash,
  });
}

/**
 * Produce the inspection expressions owned by the Scientific Core.
 *
 * Render receives these records after this boundary; it never authors a line
 * and then labels it as exact. Every emitted expression is an equation used by
 * the v0 model and carries the current frame's numerical substitutions. The
 * result is still a presentation record, not a second solver.
 */
export function createScientificExpressions(
  frame: ScientificFrame,
): readonly ScientificExpression[] {
  const h = speciesValue(frame, "H+", "molality");
  const na = speciesValue(frame, "Na+", "molality");
  const oh = speciesValue(frame, "OH-", "molality");
  const cl = speciesValue(frame, "Cl-", "molality");
  const oac = speciesValue(frame, "OAc-", "molality");
  const hActivity = speciesValue(frame, "H+", "activity");
  const ohActivity = speciesValue(frame, "OH-", "activity");
  const haActivity = speciesValue(frame, "HOAc", "activity");
  const oacActivity = speciesValue(frame, "OAc-", "activity");
  const ha = speciesValue(frame, "HOAc", "molality");
  const acidFamilyTotal = ha + oac;
  const kw = frame.scientificState.provenance.parameters.Kw;
  const ka = frame.scientificState.provenance.parameters.Ka_HOAc;
  if (kw === undefined || ka === undefined) {
    throw new RangeError("scientific expression requires Kw and Ka_HOAc provenance");
  }

  const chargeSubstitutions = [
    substitution("m(H+)", h, "mol/kg"),
    substitution("m(Na+)", na, "mol/kg"),
    substitution("m(OH-)", oh, "mol/kg"),
    substitution("m(Cl-)", cl, "mol/kg"),
    substitution("m(OAc-)", oac, "mol/kg"),
  ];
  const expressions: ScientificExpression[] = [
    makeExpression(
      frame,
      "charge-balance",
      "m(H+) + m(Na+) = m(OH-) + m(Cl-) + m(OAc-)",
      `${substituted("m(H+)", h, "mol/kg")} + ${substituted("m(Na+)", na, "mol/kg")} = ` +
        `${substituted("m(OH-)", oh, "mol/kg")} + ${substituted("m(Cl-)", cl, "mol/kg")} + ${substituted("m(OAc-)", oac, "mol/kg")}`,
      chargeSubstitutions,
      [],
    ),
    makeExpression(
      frame,
      "water-autoprotolysis",
      "a(H+) · a(OH-) = Kw",
      `${substituted("a(H+)", hActivity, "1")} · ${substituted("a(OH-)", ohActivity, "1")} = ${substituted("Kw", kw, "1")}`,
      [
        substitution("a(H+)", hActivity, "1"),
        substitution("a(OH-)", ohActivity, "1"),
        substitution("Kw", kw, "1"),
      ],
      ["non-unit water activity is not modeled in the v0 unit-water-activity convention"],
    ),
  ];

  if (acidFamilyTotal > 0) {
    expressions.push(
      makeExpression(
        frame,
        "acid-family-equilibrium",
        "Ka_HOAc = a(H+) · a(OAc-) / a(HOAc)",
        `${substituted("Ka_HOAc", ka, "1")} = ${substituted("a(H+)", hActivity, "1")} · ` +
          `${substituted("a(OAc-)", oacActivity, "1")} / ${substituted("a(HOAc)", haActivity, "1")}`,
        [
          substitution("Ka_HOAc", ka, "1"),
          substitution("a(H+)", hActivity, "1"),
          substitution("a(OAc-)", oacActivity, "1"),
          substitution("a(HOAc)", haActivity, "1"),
        ],
        [],
      ),
      makeExpression(
        frame,
        "acid-family-balance",
        "m(HOAc) + m(OAc-) = m_A,total",
        `${substituted("m(HOAc)", ha, "mol/kg")} + ${substituted("m(OAc-)", oac, "mol/kg")} = ${substituted("m_A,total", acidFamilyTotal, "mol/kg")}`,
        [
          substitution("m(HOAc)", ha, "mol/kg"),
          substitution("m(OAc-)", oac, "mol/kg"),
          substitution("m_A,total", acidFamilyTotal, "mol/kg"),
        ],
        [],
      ),
    );
  }

  return Object.freeze(expressions);
}
