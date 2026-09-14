/**
 * Schema-owned contract for the accepted ordinary-aqueous phenolphthalein
 * three-form candidate. This is deliberately separate from the legacy
 * monoprotic observation so a candidate model cannot silently rewrite the M4
 * wire meaning.
 */

import { z } from "zod";

import { VERSION_MANIFEST } from "./generated/versions.js";
import { canonicalQuantityOfDimension, toCanonical } from "./quantity.js";
import { mol, type Mol } from "./units.js";

const MODEL = VERSION_MANIFEST.scientific.indicatorMultiform;

export const ORDINARY_PHENOLPHTHALEIN_FORM_IDS = [
  "neutral-lactone",
  "intermediate-monoanion",
  "quinoid-base",
] as const;

export type OrdinaryPhenolphthaleinFormId =
  (typeof ORDINARY_PHENOLPHTHALEIN_FORM_IDS)[number];

const OrdinaryFormFractionSchema = z.strictObject({
  fraction: z.number().finite().min(0).max(1),
});

const OrdinaryFormsSchema = z.tuple([
  OrdinaryFormFractionSchema.extend({ formId: z.literal("neutral-lactone") }),
  OrdinaryFormFractionSchema.extend({ formId: z.literal("intermediate-monoanion") }),
  OrdinaryFormFractionSchema.extend({ formId: z.literal("quinoid-base") }),
]);

export type OrdinaryPhenolphthaleinFormFractions = z.infer<
  typeof OrdinaryFormsSchema
>;

const ChemicalFormsOkSchema = z.strictObject({
  status: z.literal("CHEMICAL_FORMS_OK"),
  indicatorId: z.literal("phenolphthalein"),
  totalAmount: canonicalQuantityOfDimension("amount"),
  forms: OrdinaryFormsSchema,
  modelId: z.literal(MODEL.id),
  modelVersion: z.literal(MODEL.version),
  sourceReplayHash: z.string().min(1),
}).superRefine((observation, context) => {
  const total = observation.forms.reduce((sum, form) => sum + form.fraction, 0);
  if (Math.abs(total - 1) > 1e-12) {
    context.addIssue({
      code: "custom",
      path: ["forms"],
      message: "ordinary phenolphthalein fractions must sum to one",
    });
  }
});

const ChemicalFormsUnavailableSchema = z.strictObject({
  status: z.literal("CHEMICAL_FORMS_UNAVAILABLE"),
  indicatorId: z.literal("phenolphthalein"),
  totalAmount: canonicalQuantityOfDimension("amount").optional(),
  reasonCode: z.enum([
    "FORM_OUT_OF_DOMAIN",
    "FORM_DATA_MISSING",
    "NUMERICAL_FAILURE",
  ]),
  reason: z.string().min(1),
  modelId: z.literal(MODEL.id),
  modelVersion: z.literal(MODEL.version),
  sourceReplayHash: z.string().min(1),
});

export const IndicatorMultiformObservationSchema = z.union([
  ChemicalFormsOkSchema,
  ChemicalFormsUnavailableSchema,
]);

export type IndicatorMultiformObservationDto = z.infer<
  typeof IndicatorMultiformObservationSchema
>;

export type IndicatorMultiformObservation =
  | {
      readonly status: "CHEMICAL_FORMS_OK";
      readonly indicatorId: "phenolphthalein";
      readonly totalAmount: Mol;
      readonly forms: readonly [
        { readonly formId: "neutral-lactone"; readonly fraction: number },
        { readonly formId: "intermediate-monoanion"; readonly fraction: number },
        { readonly formId: "quinoid-base"; readonly fraction: number },
      ];
      readonly modelId: typeof MODEL.id;
      readonly modelVersion: typeof MODEL.version;
      readonly sourceReplayHash: string;
    }
  | {
      readonly status: "CHEMICAL_FORMS_UNAVAILABLE";
      readonly indicatorId: "phenolphthalein";
      readonly totalAmount?: Mol;
      readonly reasonCode:
        | "FORM_OUT_OF_DOMAIN"
        | "FORM_DATA_MISSING"
        | "NUMERICAL_FAILURE";
      readonly reason: string;
      readonly modelId: typeof MODEL.id;
      readonly modelVersion: typeof MODEL.version;
      readonly sourceReplayHash: string;
    };

type IndicatorMultiformObservationOk = Extract<
  IndicatorMultiformObservation,
  { readonly status: "CHEMICAL_FORMS_OK" }
>;

/** DTO → domain bridge for the candidate's strict ordinary-form result. */
export function parseIndicatorMultiformObservation(
  input: IndicatorMultiformObservationDto,
): IndicatorMultiformObservation {
  const parsed = IndicatorMultiformObservationSchema.parse(input);
  if (parsed.status === "CHEMICAL_FORMS_OK") {
    return Object.freeze({
      status: parsed.status,
      indicatorId: parsed.indicatorId,
      totalAmount: mol(toCanonical(parsed.totalAmount).value),
      forms: Object.freeze(
        parsed.forms.map((form) => Object.freeze({ ...form })),
      ) as IndicatorMultiformObservationOk["forms"],
      modelId: parsed.modelId,
      modelVersion: parsed.modelVersion,
      sourceReplayHash: parsed.sourceReplayHash,
    }) as IndicatorMultiformObservation;
  }

  return Object.freeze({
    status: parsed.status,
    indicatorId: parsed.indicatorId,
    ...(parsed.totalAmount === undefined
      ? {}
      : { totalAmount: mol(toCanonical(parsed.totalAmount).value) }),
    reasonCode: parsed.reasonCode,
    reason: parsed.reason,
    modelId: parsed.modelId,
    modelVersion: parsed.modelVersion,
    sourceReplayHash: parsed.sourceReplayHash,
  }) as IndicatorMultiformObservation;
}

/** Domain → DTO bridge; validation remains owned by the schema package. */
export function serializeIndicatorMultiformObservation(
  input: IndicatorMultiformObservation,
): IndicatorMultiformObservationDto {
  if (input.status === "CHEMICAL_FORMS_OK") {
    return IndicatorMultiformObservationSchema.parse({
      status: input.status,
      indicatorId: input.indicatorId,
      totalAmount: { value: input.totalAmount, unit: "mol" },
      forms: input.forms.map((form) => ({ ...form })),
      modelId: input.modelId,
      modelVersion: input.modelVersion,
      sourceReplayHash: input.sourceReplayHash,
    });
  }

  return IndicatorMultiformObservationSchema.parse({
    status: input.status,
    indicatorId: input.indicatorId,
    ...(input.totalAmount === undefined
      ? {}
      : { totalAmount: { value: input.totalAmount, unit: "mol" } }),
    reasonCode: input.reasonCode,
    reason: input.reason,
    modelId: input.modelId,
    modelVersion: input.modelVersion,
    sourceReplayHash: input.sourceReplayHash,
  });
}
