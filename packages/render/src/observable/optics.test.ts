import { describe, expect, it } from "vitest";
import {
  ionicStrengthMolal,
  kelvin,
  litre,
  mol,
  opticalPathHash,
  opticalProfileHash,
  parseFrozenOpticalPathSnapshot,
  parseOpticalProfileSnapshot,
  ph,
  TEST_MODEL_VERSION,
  VERSION_MANIFEST,
  type FrozenOpticalPathSnapshot,
  type IndicatorChemicalObservation,
} from "@chemrealm/schema";
import { observeIndicatorOptics, type IndicatorOpticalObservationInput } from "./optics.js";
import referenceData from "./optics-reference-vectors.json" with { type: "json" };

const provenance = {
  source: "Synthetic test-only optical reference",
  reference: "optics-reference-vectors.json",
  category: "evaluated" as const,
};

const source = {
  citation: "Synthetic test-only spectrum; not a production profile",
  sourceUrl: "https://example.test/chemrealm/optics-reference",
  accessedOn: "2026-09-14",
  licenseOrPermission: "permission-recorded" as const,
  extractionMethod: "machine-readable" as const,
  rawDataLocation: "packages/render/src/observable/optics-reference-vectors.json",
  reportedPrecision: "test-only pinned values",
  conditions: {
    solvent: "water",
    temperature: "298.15 K",
    concentration: "0 to 1e-3 mol/L",
    pathLength: "1 to 100 mm",
    acidityOrIonicStrength: "0 to 0.5 mol/kg",
  },
};

const profilePayload = {
  profileId: "synthetic-optical-profile",
  profileVersion: VERSION_MANIFEST.representation.indicatorOpticalProfile,
  indicatorId: "synthetic-indicator",
  representation: "spectral-molar-absorptivity" as const,
  formSpectra: [{
    formId: "form-a",
    spectrumId: "form-a-spectrum",
    epsilonUnit: "L mol^-1 cm^-1" as const,
    samples: [
      { wavelengthNanometres: 500, epsilon: 10 },
      { wavelengthNanometres: 510, epsilon: 20 },
      { wavelengthNanometres: 520, epsilon: 30 },
    ],
  }],
  conditions: {
    solvent: "water",
    temperature: {
      min: { value: 298.15, unit: "K" as const },
      max: { value: 298.15, unit: "K" as const },
    },
    concentration: {
      min: { value: 0, unit: "mol/L" as const },
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
    ph: { min: 0, max: 14 },
  },
  illuminant: "D65" as const,
  observer: "CIE-1931-2deg" as const,
  transform: "sRGB-IEC-61966-2-1" as const,
  provenance,
  source,
  reviewStatus: "quantitative" as const,
};

const profile = parseOpticalProfileSnapshot({
  ...profilePayload,
  profileHash: opticalProfileHash(profilePayload),
});

const pathPayload = {
  pathRuleId: "synthetic-fixed-path",
  pathRuleVersion: VERSION_MANIFEST.representation.opticalPath,
  representation: "fixed-path" as const,
  pathLength: { value: 10, unit: "mm" as const },
  minLiquidVolume: { value: 0.01, unit: "L" as const },
  maxLiquidVolume: { value: 0.25, unit: "L" as const },
  provenance,
};

const path = parseFrozenOpticalPathSnapshot({
  ...pathPayload,
  pathRuleHash: opticalPathHash(pathPayload),
});

const chemical: IndicatorChemicalObservation = {
  status: "CHEMICAL_FORMS_OK",
  indicatorId: "synthetic-indicator",
  totalAmount: mol(1e-5),
  forms: [{ formId: "form-a", fraction: 1 }],
  modelId: "test-chemical-model",
  modelVersion: TEST_MODEL_VERSION,
  sourceReplayHash: "sha256:optical-test-state",
};

function input(overrides: Partial<IndicatorOpticalObservationInput> = {}): IndicatorOpticalObservationInput {
  return {
    chemical,
    opticalProfile: profile,
    opticalPath: path,
    liquidVolume: litre(0.1),
    temperature: kelvin(298.15),
    ionicStrengthMolal: ionicStrengthMolal(0.1),
    modelPh: ph(7),
    solvent: "water",
    sourceReplayHash: "sha256:optical-test-state",
    ...overrides,
  };
}

function pathLength(value: number): FrozenOpticalPathSnapshot {
  const payload = { ...pathPayload, pathLength: { value, unit: "mm" as const } };
  return parseFrozenOpticalPathSnapshot({
    ...payload,
    pathRuleHash: opticalPathHash(payload),
  });
}

describe("deterministic indicator optical observation", () => {
  it("normalizes tint strength against the complete colourimetry reference grid", () => {
    const result = observeIndicatorOptics(input({
      chemical: { ...chemical, totalAmount: mol(1e-5) },
      liquidVolume: litre(0.1),
      opticalPath: pathLength(10),
    }));

    expect(result.status).toBe("OPTICAL_MODEL_OK");
    if (result.status !== "OPTICAL_MODEL_OK") {
      throw new Error("expected optical model success");
    }

    const trapezoid = (values: readonly number[], component: readonly number[]) => {
      let total = 0;
      for (let index = 0; index < values.length - 1; index += 1) {
        const span = referenceData.wavelengthNanometres[index + 1]!
          - referenceData.wavelengthNanometres[index]!;
        const first = values[index]! * referenceData.d65RelativePower[index]! * component[index]!;
        const second = values[index + 1]! * referenceData.d65RelativePower[index + 1]! * component[index + 1]!;
        total += ((first + second) / 2) * span;
      }
      return total;
    };
    const transmittance = result.transmittanceSamples.map((sample) => sample.transmittance);
    const fullGridY = trapezoid(transmittance, referenceData.cie1931YBar);
    const fullGridBlankY = trapezoid(
      referenceData.wavelengthNanometres.map(() => 1),
      referenceData.cie1931YBar,
    );

    expect(result.tintStrength).toBeCloseTo(1 - fullGridY / fullGridBlankY, 12);
  });

  it("refuses missing chemical coverage instead of inventing a tint", () => {
    const unavailable: IndicatorChemicalObservation = {
      status: "CHEMICAL_FORMS_UNAVAILABLE",
      indicatorId: "phenolphthalein",
      reason: "multi-form chemistry is not covered by the v0 model",
      modelId: "acidbase-monoprotic-davies",
      modelVersion: TEST_MODEL_VERSION,
      sourceReplayHash: "sha256:optical-test-state",
    };

    expect(observeIndicatorOptics(input({ chemical: unavailable }))).toMatchObject({
      status: "OPTICAL_MODEL_DATA_MISSING",
      indicatorId: "phenolphthalein",
    });
  });

  it("squares transmittance when the declared optical path doubles", () => {
    const onePath = observeIndicatorOptics(input({ opticalPath: pathLength(10) }));
    const twoPath = observeIndicatorOptics(input({ opticalPath: pathLength(20) }));

    expect(onePath.status).toBe("OPTICAL_MODEL_OK");
    expect(twoPath.status).toBe("OPTICAL_MODEL_OK");
    if (onePath.status !== "OPTICAL_MODEL_OK" || twoPath.status !== "OPTICAL_MODEL_OK") {
      throw new Error("expected optical model success");
    }
    expect(twoPath.transmittanceSamples[0]!.transmittance).toBeCloseTo(
      onePath.transmittanceSamples[0]!.transmittance ** 2,
      12,
    );
  });

  it("matches the pinned Beer-Lambert arithmetic reference vector", () => {
    const vector = referenceData.referenceVectors[0]!;
    const result = observeIndicatorOptics(input({
      chemical: { ...chemical, totalAmount: mol(vector.concentrationMolPerLitre * 0.1) },
      liquidVolume: litre(0.1),
      opticalPath: pathLength(vector.pathLengthMillimetres),
    }));

    expect(result.status).toBe("OPTICAL_MODEL_OK");
    if (result.status !== "OPTICAL_MODEL_OK") {
      throw new Error("expected optical model success");
    }
    const pathLengthCentimetres = vector.pathLengthMillimetres / 10;
    for (const [index, epsilon] of vector.epsilon.entries()) {
      const expectedAbsorbance =
        pathLengthCentimetres * epsilon * vector.concentrationMolPerLitre;
      expect(result.transmittanceSamples[index]!.transmittance).toBeCloseTo(
        10 ** -expectedAbsorbance,
        12,
      );
    }
  });

  it("returns a transparent zero-dose observation without a fallback colour", () => {
    const zeroDose = observeIndicatorOptics(input({
      chemical: { ...chemical, totalAmount: mol(0) },
    }));

    expect(zeroDose).toMatchObject({
      status: "OPTICAL_MODEL_OK",
      tintStrength: 0,
    });
  });

  it("refuses qualitative profiles and out-of-coverage concentration", () => {
    const qualitative = parseOpticalProfileSnapshot({
      ...profilePayload,
      formSpectra: [],
      transform: "qualitative-reference" as const,
      reviewStatus: "qualitative-only" as const,
      profileHash: opticalProfileHash({
        ...profilePayload,
        formSpectra: [],
        transform: "qualitative-reference" as const,
        reviewStatus: "qualitative-only" as const,
      }),
    });
    expect(observeIndicatorOptics(input({ opticalProfile: qualitative })).status)
      .toBe("OPTICAL_MODEL_DATA_MISSING");
    expect(observeIndicatorOptics(input({
      chemical: { ...chemical, totalAmount: mol(2e-4) },
      liquidVolume: litre(0.1),
    })).status).toBe("OPTICAL_MODEL_OUT_OF_COVERAGE");
  });
});
