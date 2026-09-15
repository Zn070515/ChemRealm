import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
import productionColourimetryData from "./colourimetry-cie-d65-1931-2deg-5nm.json" with { type: "json" };
import productionProfile from "./phenolphthalein-ordinary-aqueous.profile.json" with { type: "json" };

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
    epsilonConvention: "decadic" as const,
    samples: productionColourimetryData.wavelengthNanometres.map((wavelength) => ({
      wavelengthNanometres: wavelength,
      epsilon: wavelength === 500 ? 10 : wavelength === 510 ? 20 : wavelength === 520 ? 30 : 10,
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
  it("keeps the test-only three-point fixture out of production optics", () => {
    const source = readFileSync(fileURLToPath(new URL("./optics.ts", import.meta.url)), "utf8");
    expect(source).not.toContain("optics-reference-vectors.json");
    expect(productionColourimetryData.status).toBe("production");
    expect(productionColourimetryData.wavelengthNanometres[0]).toBe(380);
    expect(productionColourimetryData.wavelengthNanometres.at(-1)).toBe(780);
    expect(productionColourimetryData.wavelengthNanometres).toHaveLength(81);
  });

  it("admits the ordinary production profile only on the full visible grid including the 552 nm region", () => {
    expect(productionProfile.formSpectra[0]?.samples).toHaveLength(81);
    expect(productionProfile.formSpectra[0]?.samples.some((sample) => sample.wavelengthNanometres === 550)).toBe(true);
    expect(productionProfile.formSpectra[0]?.samples.some((sample) => sample.wavelengthNanometres === 555)).toBe(true);
    expect(parseOpticalProfileSnapshot(productionProfile).profileHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("maps a transparent blank to the normalized D65 white point", () => {
    const result = observeIndicatorOptics(input({
      chemical: { ...chemical, totalAmount: mol(0) },
    }));

    expect(result.status).toBe("OPTICAL_MODEL_OK");
    if (result.status !== "OPTICAL_MODEL_OK") throw new Error("expected optical model success");
    expect(Math.abs(result.tintSrgb[0] - 1)).toBeLessThan(1e-4);
    expect(Math.abs(result.tintSrgb[1] - 1)).toBeLessThan(1e-4);
    expect(Math.abs(result.tintSrgb[2] - 1)).toBeLessThan(1e-4);
  });

  it("produces a chromatic pink/fuchsia result for the admitted quinoid profile", () => {
    const result = observeIndicatorOptics({
      chemical: {
        status: "CHEMICAL_FORMS_OK",
        indicatorId: "phenolphthalein",
        totalAmount: mol(2.5e-6),
        forms: [
          { formId: "neutral-lactone", fraction: 0 },
          { formId: "intermediate-monoanion", fraction: 0 },
          { formId: "quinoid-base", fraction: 1 },
        ],
        modelId: "acidbase-phenolphthalein-diprotic-davies",
        modelVersion: TEST_MODEL_VERSION,
        sourceReplayHash: "sha256:optical-test-state",
      },
      opticalProfile: parseOpticalProfileSnapshot(productionProfile),
      opticalPath: parseFrozenOpticalPathSnapshot({
        pathRuleId: "phenolphthalein-test-path",
        pathRuleVersion: VERSION_MANIFEST.representation.opticalPath,
        representation: "fixed-path",
        pathLength: { value: 10, unit: "mm" },
        minLiquidVolume: { value: 0.01, unit: "L" },
        maxLiquidVolume: { value: 0.25, unit: "L" },
        provenance,
        pathRuleHash: opticalPathHash({
          pathRuleId: "phenolphthalein-test-path",
          pathRuleVersion: VERSION_MANIFEST.representation.opticalPath,
          representation: "fixed-path",
          pathLength: { value: 10, unit: "mm" },
          minLiquidVolume: { value: 0.01, unit: "L" },
          maxLiquidVolume: { value: 0.25, unit: "L" },
          provenance,
        }),
      }),
      liquidVolume: litre(0.05),
      temperature: kelvin(293.15),
      ionicStrengthMolal: ionicStrengthMolal(0.04),
      modelPh: ph(10),
      solvent: "water",
      sourceReplayHash: "sha256:optical-test-state",
    });

    expect(result.status).toBe("OPTICAL_MODEL_OK");
    if (result.status !== "OPTICAL_MODEL_OK") throw new Error("expected optical model success");
    const [red, green, blue] = result.tintSrgb;
    expect(red).toBeGreaterThan(0.9);
    expect(blue).toBeGreaterThan(0.75);
    expect(green).toBeLessThan(0.85);
    expect(green).toBeLessThan(red * 0.9);
    expect(green).toBeLessThan(blue * 0.9);
  });

  it("uses the declared Napierian convention for an epsilon anchor", () => {
    const napierianPayload = {
      ...profilePayload,
      formSpectra: [{
        ...profilePayload.formSpectra[0]!,
        epsilonConvention: "napierian" as const,
      }],
    };
    const napierian = parseOpticalProfileSnapshot({
      ...napierianPayload,
      profileHash: opticalProfileHash(napierianPayload),
    });
    const result = observeIndicatorOptics(input({
      opticalProfile: napierian,
      chemical: { ...chemical, totalAmount: mol(1e-5) },
      liquidVolume: litre(0.1),
      opticalPath: pathLength(10),
    }));

    expect(result.status).toBe("OPTICAL_MODEL_OK");
    if (result.status !== "OPTICAL_MODEL_OK") throw new Error("expected optical model success");
    expect(result.transmittanceSamples[0]!.transmittance).toBeCloseTo(
      Math.exp(-(10 * 1e-4 * 1)),
      12,
    );
  });

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
        const span = productionColourimetryData.wavelengthNanometres[index + 1]!
          - productionColourimetryData.wavelengthNanometres[index]!;
        const first = values[index]! * productionColourimetryData.d65RelativePower[index]! * component[index]!;
        const second = values[index + 1]! * productionColourimetryData.d65RelativePower[index + 1]! * component[index + 1]!;
        total += ((first + second) / 2) * span;
      }
      return total;
    };
    const transmittance = result.transmittanceSamples.map((sample) => sample.transmittance);
    const fullGridY = trapezoid(transmittance, productionColourimetryData.cie1931YBar);
    const fullGridBlankY = trapezoid(
      productionColourimetryData.wavelengthNanometres.map(() => 1),
      productionColourimetryData.cie1931YBar,
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
      const wavelength = vector.wavelengthNanometres[index]!;
      const sample = result.transmittanceSamples.find((candidate) => candidate.wavelengthNanometres === wavelength);
      expect(sample).toBeDefined();
      expect(sample!.transmittance).toBeCloseTo(
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
