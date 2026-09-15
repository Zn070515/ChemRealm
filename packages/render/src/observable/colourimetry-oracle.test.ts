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
  type IndicatorChemicalObservation,
  type OpticalProfileSnapshot,
} from "@chemrealm/schema";
import oracle from "../../../../docs/research/indicator-optics/colourimetry-independent-oracle.json" with { type: "json" };
import cie from "./colourimetry-cie-d65-1931-2deg-5nm.json" with { type: "json" };
import productionProfile from "./phenolphthalein-ordinary-aqueous.profile.json" with { type: "json" };
import { observeIndicatorOptics, type IndicatorOpticalObservationInput } from "./optics.js";

const provenance = {
  source: "Independent colourimetry oracle test fixture",
  reference: "docs/research/indicator-optics/colourimetry-independent-oracle.json",
  category: "evaluated" as const,
};

const source = {
  citation: "Synthetic optical oracle fixture; not a production profile",
  sourceUrl: "https://example.test/chemrealm/colourimetry-oracle",
  accessedOn: "2026-09-15",
  licenseOrPermission: "permission-recorded" as const,
  extractionMethod: "machine-readable" as const,
  rawDataLocation: "docs/research/indicator-optics/colourimetry-independent-oracle.json",
  reportedPrecision: "independent frozen numerical vector",
  conditions: {
    solvent: "water",
    temperature: "298.15 K",
    concentration: "0 to 1e-3 mol/L",
    pathLength: "1 to 100 mm",
    acidityOrIonicStrength: "0 to 0.5 mol/kg",
  },
};

function syntheticProfile(epsilonAt: (wavelength: number) => number, convention: "decadic" | "napierian"): OpticalProfileSnapshot {
  const payload = {
    profileId: "synthetic-colourimetry-oracle-profile",
    profileVersion: VERSION_MANIFEST.representation.indicatorOpticalProfile,
    indicatorId: "synthetic-oracle-indicator",
    representation: "spectral-molar-absorptivity" as const,
    formSpectra: [{
      formId: "form-a",
      spectrumId: "synthetic-oracle-form-a",
      epsilonUnit: "L mol^-1 cm^-1" as const,
      epsilonConvention: convention,
      samples: cie.wavelengthNanometres.map((wavelength) => ({
        wavelengthNanometres: wavelength,
        epsilon: epsilonAt(wavelength),
      })),
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
  return parseOpticalProfileSnapshot({
    ...payload,
    profileHash: opticalProfileHash(payload),
  });
}

const pathPayload = {
  pathRuleId: "synthetic-colourimetry-oracle-path",
  pathRuleVersion: VERSION_MANIFEST.representation.opticalPath,
  representation: "fixed-path" as const,
  pathLength: { value: 10, unit: "mm" as const },
  minLiquidVolume: { value: 0.01, unit: "L" as const },
  maxLiquidVolume: { value: 0.25, unit: "L" as const },
  provenance,
};

const opticalPath = parseFrozenOpticalPathSnapshot({
  ...pathPayload,
  pathRuleHash: opticalPathHash(pathPayload),
});

function chemical(totalAmount: number, indicatorId: string, formId: string): IndicatorChemicalObservation {
  return {
    status: "CHEMICAL_FORMS_OK",
    indicatorId,
    totalAmount: mol(totalAmount),
    forms: [{ formId, fraction: 1 }],
    modelId: "test-colourimetry-model",
    modelVersion: TEST_MODEL_VERSION,
    sourceReplayHash: "sha256:colourimetry-oracle-test-state",
  };
}

function observation(
  profile: OpticalProfileSnapshot,
  totalAmount: number,
  overrides: Partial<IndicatorOpticalObservationInput> = {},
  formId = profile.formSpectra[0]!.formId,
): IndicatorOpticalObservationInput {
  return {
    chemical: chemical(totalAmount, profile.indicatorId, formId),
    opticalProfile: profile,
    opticalPath,
    liquidVolume: litre(0.1),
    temperature: kelvin(298.15),
    ionicStrengthMolal: ionicStrengthMolal(0.1),
    modelPh: ph(7),
    solvent: "water",
    sourceReplayHash: "sha256:colourimetry-oracle-test-state",
    ...overrides,
  };
}

function vector(id: string) {
  const found = oracle.vectors.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`missing independent oracle vector ${id}`);
  return found;
}

function assertMatchesOracle(result: ReturnType<typeof observeIndicatorOptics>, id: string): void {
  expect(result.status).toBe("OPTICAL_MODEL_OK");
  if (result.status !== "OPTICAL_MODEL_OK") throw new Error("expected optical model success");
  const expected = vector(id);
  for (const [index, value] of result.tintSrgb.entries()) {
    expect(value).toBeCloseTo(expected.sRgb[index]!, 7);
  }
  expect(result.transmittanceSamples).toHaveLength(expected.transmittance.length);
  for (const [index, sample] of result.transmittanceSamples.entries()) {
    expect(sample.transmittance).toBeCloseTo(expected.transmittance[index]!, 9);
  }
}

describe("independent colourimetry oracle", () => {
  it("contains independent vectors for blank, grey, narrow-band, and production profile cases", () => {
    expect(oracle.method.implementation).toMatch(/Python 3 standard library/);
    expect(oracle.method.independenceBoundary).toMatch(/frozen outputs/);
    expect(oracle.vectors.map((candidate) => candidate.id)).toEqual([
      "transparent-white",
      "neutral-grey-half-transmission",
      "synthetic-narrow-550nm-absorber",
      "phenolphthalein-quinoid-profile",
    ]);
    expect(oracle.inputArtifacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: expect.stringContaining("colourimetry-cie-d65") }),
      expect.objectContaining({ path: expect.stringContaining("phenolphthalein-ordinary-aqueous") }),
    ]));
  });

  it("matches the independent transparent-white vector", () => {
    const profile = syntheticProfile(() => 0, "decadic");
    assertMatchesOracle(observeIndicatorOptics(observation(profile, 0)), "transparent-white");
  });

  it("matches the independent neutral-grey transmission vector", () => {
    const epsilonForHalfTransmission = 3010.299956639812;
    const profile = syntheticProfile(() => epsilonForHalfTransmission, "decadic");
    assertMatchesOracle(observeIndicatorOptics(observation(profile, 1e-5)), "neutral-grey-half-transmission");
  });

  it("matches the independent narrow 550 nm absorber vector", () => {
    const profile = syntheticProfile((wavelength) => wavelength === 550 ? 10000 : 0, "decadic");
    assertMatchesOracle(observeIndicatorOptics(observation(profile, 1e-6)), "synthetic-narrow-550nm-absorber");
  });

  it("matches the independent phenolphthalein profile vector", () => {
    const profile = parseOpticalProfileSnapshot(productionProfile);
    assertMatchesOracle(observeIndicatorOptics(observation(profile, 5e-6, {
      temperature: kelvin(293.15),
      ionicStrengthMolal: ionicStrengthMolal(0.04),
      modelPh: ph(10),
    }, "quinoid-base")), "phenolphthalein-quinoid-profile");
  });
});
