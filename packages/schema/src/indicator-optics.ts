/**
 * Schema-owned indicator chemistry and optical observation artifacts.
 *
 * These are serializable contracts only. The Scientific Reality Core owns
 * chemical form fractions; the Representation Engine will later consume the
 * validated records to calculate an optical observation. No RGB fallback or
 * executable profile function is persisted here.
 */

import { z } from "zod";

import {
  INDICATOR_OPTICAL_PROFILE_VERSION,
  OPTICAL_PATH_VERSION,
} from "./generated/versions.js";
import { hashCanonical } from "./canonical-hash.js";
import { DataProvenanceSchema } from "./scientific.js";
import {
  canonicalQuantityOfDimension,
  type Dimension,
} from "./quantity.js";

const HashSchema = z.string().min(1);

function canonicalRangeSchema(dimension: Dimension) {
  return z.strictObject({
    min: canonicalQuantityOfDimension(dimension),
    max: canonicalQuantityOfDimension(dimension),
  });
}

const NumericRangeSchema = z.strictObject({
  min: z.number().finite(),
  max: z.number().finite(),
});

function addInvalidRangeIssue(
  range: { min: { value: number }; max: { value: number } },
  path: string[],
  context: z.RefinementCtx,
): void {
  if (range.min.value > range.max.value) {
    context.addIssue({
      code: "custom",
      path,
      message: "range minimum must be less than or equal to maximum",
    });
  }
}

const OpticalProfileSourceConditionsSchema = z.strictObject({
  solvent: z.string().min(1),
  temperature: z.string().min(1),
  concentration: z.string().min(1),
  pathLength: z.string().min(1),
  acidityOrIonicStrength: z.string().min(1),
});

export const OpticalProfileSourceRecordSchema = z.strictObject({
  citation: z.string().min(1),
  sourceUrl: z.string().url(),
  accessedOn: z.string().min(1),
  licenseOrPermission: z.enum(["open", "permission-recorded"]),
  extractionMethod: z.enum(["machine-readable", "digitized"]),
  rawDataLocation: z.string().min(1),
  reportedPrecision: z.string().min(1),
  digitisationUncertainty: z.string().min(1).optional(),
  conditions: OpticalProfileSourceConditionsSchema,
});
export type OpticalProfileSourceRecord = z.infer<
  typeof OpticalProfileSourceRecordSchema
>;

export const OpticalSpectrumSampleSchema = z.strictObject({
  wavelengthNanometres: z.number().int().positive(),
  epsilon: z.number().finite().nonnegative(),
});
export type OpticalSpectrumSample = z.infer<typeof OpticalSpectrumSampleSchema>;

export const OpticalFormSpectrumSchema = z.strictObject({
  formId: z.string().min(1),
  spectrumId: z.string().min(1),
  epsilonUnit: z.literal("L mol^-1 cm^-1"),
  samples: z.array(OpticalSpectrumSampleSchema).min(2),
});
export type OpticalFormSpectrum = z.infer<typeof OpticalFormSpectrumSchema>;

const OpticalProfileConditionsSchema = z.strictObject({
  solvent: z.string().min(1),
  temperature: canonicalRangeSchema("temperature"),
  concentration: canonicalRangeSchema("molarity"),
  pathLength: canonicalRangeSchema("length"),
  ionicStrengthMolal: canonicalRangeSchema("molality"),
  ph: NumericRangeSchema.optional(),
});

const OpticalProfileReviewStatusSchema = z.enum([
  "quantitative",
  "qualitative-only",
]);

const OpticalProfileSnapshotBaseSchema = z.strictObject({
  profileId: z.string().min(1),
  profileVersion: z.literal(INDICATOR_OPTICAL_PROFILE_VERSION),
  profileHash: HashSchema,
  indicatorId: z.string().min(1),
  representation: z.literal("spectral-molar-absorptivity"),
  formSpectra: z.array(OpticalFormSpectrumSchema),
  conditions: OpticalProfileConditionsSchema,
  illuminant: z.literal("D65"),
  observer: z.literal("CIE-1931-2deg"),
  transform: z.enum(["sRGB-IEC-61966-2-1", "qualitative-reference"]),
  provenance: DataProvenanceSchema,
  source: OpticalProfileSourceRecordSchema,
  reviewStatus: OpticalProfileReviewStatusSchema,
});

export const OpticalProfileSnapshotSchema = OpticalProfileSnapshotBaseSchema.superRefine(
  (profile, context) => {
    addInvalidRangeIssue(profile.conditions.temperature, ["conditions", "temperature"], context);
    addInvalidRangeIssue(profile.conditions.concentration, ["conditions", "concentration"], context);
    addInvalidRangeIssue(profile.conditions.pathLength, ["conditions", "pathLength"], context);
    addInvalidRangeIssue(
      profile.conditions.ionicStrengthMolal,
      ["conditions", "ionicStrengthMolal"],
      context,
    );
    if (profile.conditions.ph !== undefined && profile.conditions.ph.min > profile.conditions.ph.max) {
      context.addIssue({
        code: "custom",
        path: ["conditions", "ph"],
        message: "range minimum must be less than or equal to maximum",
      });
    }

    const formIds = new Set<string>();
    const spectrumIds = new Set<string>();
    let wavelengthGrid: number[] | undefined;

    for (const [formIndex, form] of profile.formSpectra.entries()) {
      if (formIds.has(form.formId)) {
        context.addIssue({
          code: "custom",
          path: ["formSpectra", formIndex, "formId"],
          message: "form IDs must be unique",
        });
      }
      formIds.add(form.formId);
      if (spectrumIds.has(form.spectrumId)) {
        context.addIssue({
          code: "custom",
          path: ["formSpectra", formIndex, "spectrumId"],
          message: "spectrum IDs must be unique",
        });
      }
      spectrumIds.add(form.spectrumId);

      for (let sampleIndex = 1; sampleIndex < form.samples.length; sampleIndex += 1) {
        const previous = form.samples[sampleIndex - 1]!;
        const current = form.samples[sampleIndex]!;
        if (current.wavelengthNanometres <= previous.wavelengthNanometres) {
          context.addIssue({
            code: "custom",
            path: ["formSpectra", formIndex, "samples", sampleIndex],
            message: "wavelength samples must be strictly increasing",
          });
        }
      }

      const currentGrid = form.samples.map((sample) => sample.wavelengthNanometres);
      if (wavelengthGrid === undefined) {
        wavelengthGrid = currentGrid;
      } else if (
        currentGrid.length !== wavelengthGrid.length ||
        currentGrid.some((wavelength, index) => wavelength !== wavelengthGrid![index])
      ) {
        context.addIssue({
          code: "custom",
          path: ["formSpectra", formIndex, "samples"],
          message: "quantitative forms must use the same wavelength grid",
        });
      }
    }

    if (profile.reviewStatus === "quantitative") {
      if (profile.formSpectra.length === 0) {
        context.addIssue({
          code: "custom",
          path: ["formSpectra"],
          message: "quantitative profiles require at least one form spectrum",
        });
      }
      if (profile.transform !== "sRGB-IEC-61966-2-1") {
        context.addIssue({
          code: "custom",
          path: ["transform"],
          message: "quantitative profiles require the pinned sRGB transform",
        });
      }
    } else {
      if (profile.transform !== "qualitative-reference") {
        context.addIssue({
          code: "custom",
          path: ["transform"],
          message: "qualitative-only profiles cannot enable a quantitative transform",
        });
      }
      if (profile.formSpectra.length > 0) {
        context.addIssue({
          code: "custom",
          path: ["formSpectra"],
          message: "qualitative-only profiles cannot contain quantitative spectra",
        });
      }
    }
  },
);
export type OpticalProfileSnapshot = z.infer<typeof OpticalProfileSnapshotSchema>;
export type OpticalProfileSnapshotPayload = Omit<
  OpticalProfileSnapshot,
  "profileHash"
>;

/** Content-address a profile without allowing the hash to self-reference. */
export function opticalProfileHash(
  profile: OpticalProfileSnapshot | OpticalProfileSnapshotPayload,
): string {
  const payload = { ...profile } as Partial<OpticalProfileSnapshot>;
  delete payload.profileHash;
  return `sha256:${hashCanonical(payload)}`;
}

export function parseOpticalProfileSnapshot(input: unknown): OpticalProfileSnapshot {
  const profile = OpticalProfileSnapshotSchema.parse(input);
  const expectedHash = opticalProfileHash(profile);
  if (profile.profileHash !== expectedHash) {
    throw new Error(
      `optical profile hash mismatch: expected ${expectedHash}, received ${profile.profileHash}`,
    );
  }
  return profile;
}

const FrozenOpticalPathSnapshotBaseSchema = z.strictObject({
  pathRuleId: z.string().min(1),
  pathRuleVersion: z.literal(OPTICAL_PATH_VERSION),
  pathRuleHash: HashSchema,
  representation: z.literal("fixed-path"),
  pathLength: canonicalQuantityOfDimension("length"),
  minLiquidVolume: canonicalQuantityOfDimension("volume"),
  maxLiquidVolume: canonicalQuantityOfDimension("volume"),
  provenance: DataProvenanceSchema,
});

export const FrozenOpticalPathSnapshotSchema = FrozenOpticalPathSnapshotBaseSchema.superRefine(
  (path, context) => {
    if (path.pathLength.value <= 0) {
      context.addIssue({
        code: "custom",
        path: ["pathLength"],
        message: "fixed optical path length must be positive",
      });
    }
    if (path.minLiquidVolume.value < 0 || path.maxLiquidVolume.value < 0) {
      context.addIssue({
        code: "custom",
        path: ["minLiquidVolume", "maxLiquidVolume"],
        message: "fixed optical path volume bounds cannot be negative",
      });
    }
    if (path.minLiquidVolume.value > path.maxLiquidVolume.value) {
      context.addIssue({
        code: "custom",
        path: ["minLiquidVolume"],
        message: "minimum liquid volume must be less than or equal to maximum",
      });
    }
  },
);
export type FrozenOpticalPathSnapshot = z.infer<
  typeof FrozenOpticalPathSnapshotSchema
>;
export type FrozenOpticalPathSnapshotPayload = Omit<
  FrozenOpticalPathSnapshot,
  "pathRuleHash"
>;

/** Content-address a fixed path without allowing the hash to self-reference. */
export function opticalPathHash(
  path: FrozenOpticalPathSnapshot | FrozenOpticalPathSnapshotPayload,
): string {
  const payload = { ...path } as Partial<FrozenOpticalPathSnapshot>;
  delete payload.pathRuleHash;
  return `sha256:${hashCanonical(payload)}`;
}

export function parseFrozenOpticalPathSnapshot(
  input: unknown,
): FrozenOpticalPathSnapshot {
  const path = FrozenOpticalPathSnapshotSchema.parse(input);
  const expectedHash = opticalPathHash(path);
  if (path.pathRuleHash !== expectedHash) {
    throw new Error(
      `optical path hash mismatch: expected ${expectedHash}, received ${path.pathRuleHash}`,
    );
  }
  return path;
}

const IndicatorChemicalFormFractionSchema = z.strictObject({
  formId: z.string().min(1),
  fraction: z.number().finite().nonnegative().max(1),
});
export type IndicatorChemicalFormFraction = z.infer<
  typeof IndicatorChemicalFormFractionSchema
>;

const ChemicalFormsOkSchema = z.strictObject({
  status: z.literal("CHEMICAL_FORMS_OK"),
  indicatorId: z.string().min(1),
  totalAmount: canonicalQuantityOfDimension("amount"),
  forms: z.array(IndicatorChemicalFormFractionSchema).min(1),
  modelId: z.string().min(1),
  modelVersion: z.string().min(1),
  sourceReplayHash: HashSchema,
}).superRefine((observation, context) => {
  const formIds = new Set<string>();
  let total = 0;
  for (const [index, form] of observation.forms.entries()) {
    if (formIds.has(form.formId)) {
      context.addIssue({
        code: "custom",
        path: ["forms", index, "formId"],
        message: "chemical form IDs must be unique",
      });
    }
    formIds.add(form.formId);
    total += form.fraction;
  }
  if (Math.abs(total - 1) > 1e-12) {
    context.addIssue({
      code: "custom",
      path: ["forms"],
      message: "chemical form fractions must sum to one",
    });
  }
});

const ChemicalFormsUnavailableSchema = z.strictObject({
  status: z.literal("CHEMICAL_FORMS_UNAVAILABLE"),
  indicatorId: z.string().min(1),
  totalAmount: canonicalQuantityOfDimension("amount").optional(),
  reason: z.string().min(1),
  modelId: z.string().min(1),
  modelVersion: z.string().min(1),
  sourceReplayHash: HashSchema,
});

export const IndicatorChemicalObservationSchema = z.union([
  ChemicalFormsOkSchema,
  ChemicalFormsUnavailableSchema,
]);
export type IndicatorChemicalObservation = z.infer<
  typeof IndicatorChemicalObservationSchema
>;

const TransmittanceSampleSchema = z.strictObject({
  wavelengthNanometres: z.number().int().positive(),
  transmittance: z.number().finite().min(0).max(1),
});

const OpticalModelOkSchema = z.strictObject({
  status: z.literal("OPTICAL_MODEL_OK"),
  indicatorId: z.string().min(1),
  tintSrgb: z.tuple([
    z.number().finite().min(0).max(1),
    z.number().finite().min(0).max(1),
    z.number().finite().min(0).max(1),
  ]),
  tintStrength: z.number().finite().min(0).max(1),
  transmittanceSamples: z.array(TransmittanceSampleSchema).min(1),
  profileId: z.string().min(1),
  profileHash: HashSchema,
  sourceReplayHash: HashSchema,
  conditions: z.record(z.string(), z.union([z.number().finite(), z.string()])),
});

const OpticalModelRefusalSchema = z.union([
  z.strictObject({
    status: z.literal("OPTICAL_MODEL_DATA_MISSING"),
    indicatorId: z.string().min(1),
    reason: z.string().min(1),
    sourceReplayHash: HashSchema,
    missingOrOutOfRange: z.array(z.string().min(1)),
  }),
  z.strictObject({
    status: z.literal("OPTICAL_MODEL_OUT_OF_COVERAGE"),
    indicatorId: z.string().min(1),
    reason: z.string().min(1),
    sourceReplayHash: HashSchema,
    missingOrOutOfRange: z.array(z.string().min(1)),
  }),
]);

export const IndicatorOpticalObservationSchema = z.union([
  OpticalModelOkSchema,
  OpticalModelRefusalSchema,
]);
export type IndicatorOpticalObservation = z.infer<
  typeof IndicatorOpticalObservationSchema
>;
