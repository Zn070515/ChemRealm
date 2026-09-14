import { describe, expect, it } from "vitest";

import {
  IndicatorMultiformObservationSchema,
  parseIndicatorMultiformObservation,
  serializeIndicatorMultiformObservation,
} from "./indicator-multiform.js";
import { VERSION_MANIFEST } from "./generated/versions.js";

describe("ordinary multiform indicator schema", () => {
  it("accepts exactly the ordinary phenolphthalein three-form result", () => {
    const result = IndicatorMultiformObservationSchema.parse({
      status: "CHEMICAL_FORMS_OK",
      indicatorId: "phenolphthalein",
      totalAmount: { value: 1e-6, unit: "mol" },
      forms: [
        { formId: "neutral-lactone", fraction: 0.5 },
        { formId: "intermediate-monoanion", fraction: 0.25 },
        { formId: "quinoid-base", fraction: 0.25 },
      ],
      modelId: VERSION_MANIFEST.scientific.indicatorMultiform.id,
      modelVersion: VERSION_MANIFEST.scientific.indicatorMultiform.version,
      sourceReplayHash: "sha256:state",
    });

    expect(result.status).toBe("CHEMICAL_FORMS_OK");
  });

  it("rejects a result that smuggles the strong-acid cation into the ordinary tuple", () => {
    expect(() => IndicatorMultiformObservationSchema.parse({
      status: "CHEMICAL_FORMS_OK",
      indicatorId: "phenolphthalein",
      totalAmount: { value: 1e-6, unit: "mol" },
      forms: [
        { formId: "neutral-lactone", fraction: 0.5 },
        { formId: "intermediate-monoanion", fraction: 0.25 },
        { formId: "strong-acid-cation", fraction: 0.25 },
      ],
      modelId: VERSION_MANIFEST.scientific.indicatorMultiform.id,
      modelVersion: VERSION_MANIFEST.scientific.indicatorMultiform.version,
      sourceReplayHash: "sha256:state",
    })).toThrow();
  });

  it("rejects ordinary results whose fractions do not conserve the indicator", () => {
    expect(() => IndicatorMultiformObservationSchema.parse({
      status: "CHEMICAL_FORMS_OK",
      indicatorId: "phenolphthalein",
      totalAmount: { value: 1e-6, unit: "mol" },
      forms: [
        { formId: "neutral-lactone", fraction: 0.5 },
        { formId: "intermediate-monoanion", fraction: 0.5 },
        { formId: "quinoid-base", fraction: 0.1 },
      ],
      modelId: VERSION_MANIFEST.scientific.indicatorMultiform.id,
      modelVersion: VERSION_MANIFEST.scientific.indicatorMultiform.version,
      sourceReplayHash: "sha256:state",
    })).toThrow(/sum/i);
  });

  it("requires an explicit refusal reason code for uncovered chemistry", () => {
    expect(IndicatorMultiformObservationSchema.parse({
      status: "CHEMICAL_FORMS_UNAVAILABLE",
      indicatorId: "phenolphthalein",
      reasonCode: "FORM_OUT_OF_DOMAIN",
      reason: "strong-acid cation is outside the ordinary aqueous model",
      modelId: VERSION_MANIFEST.scientific.indicatorMultiform.id,
      modelVersion: VERSION_MANIFEST.scientific.indicatorMultiform.version,
      sourceReplayHash: "sha256:state",
    })).toMatchObject({
      status: "CHEMICAL_FORMS_UNAVAILABLE",
      reasonCode: "FORM_OUT_OF_DOMAIN",
    });
  });

  it("round-trips a validated ordinary result through its domain bridge", () => {
    const dto = IndicatorMultiformObservationSchema.parse({
      status: "CHEMICAL_FORMS_OK",
      indicatorId: "phenolphthalein",
      totalAmount: { value: 1e-6, unit: "mol" },
      forms: [
        { formId: "neutral-lactone", fraction: 0.5 },
        { formId: "intermediate-monoanion", fraction: 0.25 },
        { formId: "quinoid-base", fraction: 0.25 },
      ],
      modelId: VERSION_MANIFEST.scientific.indicatorMultiform.id,
      modelVersion: VERSION_MANIFEST.scientific.indicatorMultiform.version,
      sourceReplayHash: "sha256:state",
    });

    const domain = parseIndicatorMultiformObservation(dto);
    expect(domain.totalAmount).toBe(1e-6);
    expect(Object.isFrozen(domain)).toBe(true);
    expect(serializeIndicatorMultiformObservation(domain)).toEqual(dto);
  });
});
