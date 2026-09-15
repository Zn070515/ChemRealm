import { describe, expect, it } from "vitest";

import {
  IndicatorChemicalObservationSchema,
  OpticalProfileSnapshotSchema,
  opticalPathHash,
  opticalProfileHash,
  parseFrozenOpticalPathSnapshot,
  parseOpticalProfileSnapshot,
  type OpticalProfileSnapshot,
} from "./indicator-optics.js";
import {
  INDICATOR_OPTICAL_PROFILE_VERSION,
  OPTICAL_PATH_VERSION,
  TEST_MODEL_VERSION,
} from "./generated/versions.js";

const provenance = {
  source: "Test source",
  reference: "Test reference, table 1",
  category: "measured" as const,
  lastVerified: "2026-09-14",
};

const source = {
  citation: "Test source, table 1",
  sourceUrl: "https://example.test/indicator-spectrum",
  accessedOn: "2026-09-14",
  licenseOrPermission: "permission-recorded" as const,
  extractionMethod: "machine-readable" as const,
  rawDataLocation: "table-1.csv",
  reportedPrecision: "reported as integer samples",
  digitisationUncertainty: "not applicable",
  conditions: {
    solvent: "water",
    temperature: "25 degC",
    concentration: "1e-5 mol/L",
    pathLength: "1 cm",
    acidityOrIonicStrength: "pH 8 aqueous buffer",
  },
};

const profilePayload = {
  profileId: "synthetic-test-profile",
  profileVersion: INDICATOR_OPTICAL_PROFILE_VERSION,
  indicatorId: "synthetic-indicator",
  representation: "spectral-molar-absorptivity" as const,
  formSpectra: [
    {
      formId: "form-a",
      spectrumId: "form-a-spectrum",
      epsilonUnit: "L mol^-1 cm^-1" as const,
      epsilonConvention: "decadic" as const,
      samples: [
        { wavelengthNanometres: 500, epsilon: 10 },
        { wavelengthNanometres: 510, epsilon: 20 },
      ],
    },
  ],
  conditions: {
    solvent: "water",
    temperature: {
      min: { value: 298.15, unit: "K" as const },
      max: { value: 298.15, unit: "K" as const },
    },
    concentration: {
      min: { value: 1e-7, unit: "mol/L" as const },
      max: { value: 1e-3, unit: "mol/L" as const },
    },
    pathLength: {
      min: { value: 1, unit: "mm" as const },
      max: { value: 100, unit: "mm" as const },
    },
    ionicStrengthMolal: {
      min: { value: 0, unit: "mol/kg" as const },
      max: { value: 0.5, unit: "mol/kg" as const },
    },
    ph: { min: 6, max: 10 },
  },
  illuminant: "D65" as const,
  observer: "CIE-1931-2deg" as const,
  transform: "sRGB-IEC-61966-2-1" as const,
  provenance,
  source,
  reviewStatus: "quantitative" as const,
};

const validProfile: OpticalProfileSnapshot = {
  ...profilePayload,
  profileHash: opticalProfileHash(profilePayload),
};

const pathPayload = {
  pathRuleId: "fixed-path-test",
  pathRuleVersion: OPTICAL_PATH_VERSION,
  representation: "fixed-path" as const,
  pathLength: { value: 10, unit: "mm" as const },
  minLiquidVolume: { value: 0.01, unit: "L" as const },
  maxLiquidVolume: { value: 0.25, unit: "L" as const },
  provenance,
};

const validPath = {
  ...pathPayload,
  pathRuleHash: opticalPathHash(pathPayload),
};

describe("content-addressed indicator optical artifacts", () => {
  it("accepts a reviewed quantitative profile with a common wavelength grid", () => {
    expect(parseOpticalProfileSnapshot(validProfile)).toEqual(validProfile);
  });

  it("requires every spectrum to declare its Beer-Lambert logarithm convention", () => {
    const withConvention = {
      ...validProfile,
      formSpectra: [{
        ...validProfile.formSpectra[0]!,
        epsilonConvention: "napierian" as const,
      }],
    };
    const profile = {
      ...withConvention,
      profileHash: opticalProfileHash(withConvention),
    };

    expect(parseOpticalProfileSnapshot(profile)).toEqual(profile);
  });

  it("rejects a spectrum with no Beer-Lambert logarithm convention", () => {
    const { epsilonConvention: _epsilonConvention, ...spectrumWithoutConvention } =
      validProfile.formSpectra[0]!;

    expect(() => OpticalProfileSnapshotSchema.parse({
      ...validProfile,
      formSpectra: [spectrumWithoutConvention],
    })).toThrow();
  });

  it("rejects an unknown Beer-Lambert logarithm convention", () => {
    expect(() => OpticalProfileSnapshotSchema.parse({
      ...validProfile,
      formSpectra: [{
        ...validProfile.formSpectra[0]!,
        epsilonConvention: "unknown" as never,
      }],
    })).toThrow();
  });

  it("rejects a profile whose payload changed while retaining its old hash", () => {
    const tampered = {
      ...validProfile,
      formSpectra: [{
        ...validProfile.formSpectra[0]!,
        samples: validProfile.formSpectra[0]!.samples.map((sample, index) =>
          index === 1 ? { ...sample, epsilon: sample.epsilon + 1 } : sample,
        ),
      }],
    };

    expect(() => parseOpticalProfileSnapshot(tampered)).toThrow(
      "optical profile hash mismatch",
    );
  });

  it("requires at least two strictly increasing samples on the quantitative grid", () => {
    expect(() => OpticalProfileSnapshotSchema.parse({
      ...validProfile,
      profileHash: opticalProfileHash({
        ...validProfile,
        formSpectra: [{
          ...validProfile.formSpectra[0]!,
          samples: [{ wavelengthNanometres: 500, epsilon: 1 }],
        }],
      }),
      formSpectra: [{
        ...validProfile.formSpectra[0]!,
        samples: [{ wavelengthNanometres: 500, epsilon: 1 }],
      }],
    })).toThrow();
  });

  it("requires every quantitative form to use the same wavelength grid", () => {
    const secondForm = {
      ...validProfile.formSpectra[0]!,
      formId: "form-b",
      spectrumId: "form-b-spectrum",
      samples: [
        { wavelengthNanometres: 500, epsilon: 1 },
        { wavelengthNanometres: 520, epsilon: 2 },
      ],
    };
    const changed = {
      ...validProfile,
      formSpectra: [...validProfile.formSpectra, secondForm],
    };

    expect(() => OpticalProfileSnapshotSchema.parse(changed)).toThrow(
      "same wavelength grid",
    );
  });

  it("does not let a qualitative profile enable the quantitative transform", () => {
    expect(() => OpticalProfileSnapshotSchema.parse({
      ...validProfile,
      reviewStatus: "qualitative-only",
      transform: "sRGB-IEC-61966-2-1",
    })).toThrow();
  });

  it("revalidates a fixed optical path content hash before use", () => {
    expect(parseFrozenOpticalPathSnapshot(validPath)).toEqual(validPath);
    expect(() => parseFrozenOpticalPathSnapshot({
      ...validPath,
      pathLength: { value: 11, unit: "mm" },
    })).toThrow("optical path hash mismatch");
  });

  it("rejects malformed chemical form fractions", () => {
    expect(() => IndicatorChemicalObservationSchema.parse({
      status: "CHEMICAL_FORMS_OK",
      indicatorId: "synthetic-indicator",
      totalAmount: { value: 1e-6, unit: "mol" },
      forms: [
        { formId: "a", fraction: 0.75 },
        { formId: "b", fraction: 0.1 },
      ],
      modelId: "test-model",
      modelVersion: TEST_MODEL_VERSION,
      sourceReplayHash: "sha256:state",
    })).toThrow("sum");
  });

  it("does not accept form data on a chemical-coverage refusal", () => {
    expect(() => IndicatorChemicalObservationSchema.parse({
      status: "CHEMICAL_FORMS_UNAVAILABLE",
      indicatorId: "synthetic-indicator",
      reason: "model does not cover this indicator",
      forms: [],
      modelId: "test-model",
      modelVersion: TEST_MODEL_VERSION,
      sourceReplayHash: "sha256:state",
    })).toThrow();
  });
});
