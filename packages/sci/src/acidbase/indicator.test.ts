import { describe, expect, it } from "vitest";
import {
  activity,
  activityCoefficient,
  mol,
  thermodynamicConstant,
  VERSION_MANIFEST,
  type ActivityCoefficient,
  type ThermodynamicConstant,
} from "@chemrealm/schema";
import {
  chemicalFormObservation,
  protonationRatio,
  type IndicatorInput,
} from "./indicator.js";

const INDICATOR: IndicatorInput = {
  indicatorId: "phenolphthalein",
  kaIn: thermodynamicConstant(3.981071705534969e-10),
};

const ANION_GAMMA = activityCoefficient(0.8);

describe("indicator equilibrium ratio", () => {
  it("returns no chemical observation when no conserved optical dose is present", () => {
    expect(
      chemicalFormObservation(
        INDICATOR,
        VERSION_MANIFEST.scientific.acidBase.id,
        VERSION_MANIFEST.scientific.acidBase.legacyVersion,
        "sha256:state",
      ),
    ).toBeUndefined();
  });

  it("refuses unsupported multi-form chemistry without inventing forms", () => {
    const observation = chemicalFormObservation(
      { ...INDICATOR, totalAmount: mol(5e-7) },
      VERSION_MANIFEST.scientific.acidBase.id,
      VERSION_MANIFEST.scientific.acidBase.legacyVersion,
      "sha256:state",
    );

    expect(observation).toEqual({
      status: "CHEMICAL_FORMS_UNAVAILABLE",
      indicatorId: "phenolphthalein",
      totalAmount: mol(5e-7),
      reason: expect.stringMatching(/multi-form|chemical model/i),
      modelId: VERSION_MANIFEST.scientific.acidBase.id,
      modelVersion: VERSION_MANIFEST.scientific.acidBase.legacyVersion,
      sourceReplayHash: "sha256:state",
    });
    expect(JSON.stringify(observation)).not.toMatch(/lactone|quinoid|orange/i);
  });

  it("uses the activity-based protonation relation", () => {
    const ratio = protonationRatio(
      {
        indicatorId: "methyl-orange",
        kaIn: thermodynamicConstant(1e-4),
      },
      activity(1e-2),
      activityCoefficient(0.5),
    );

    expect(ratio).toBeCloseTo(0.02, 15);
  });

  it("is continuous and monotone through the taught transition", () => {
    const moreAcidic = protonationRatio(INDICATOR, activity(1.001e-9), ANION_GAMMA);
    const transition = protonationRatio(INDICATOR, activity(1e-9), ANION_GAMMA);
    const moreBasic = protonationRatio(INDICATOR, activity(0.999e-9), ANION_GAMMA);

    expect(moreAcidic).toBeLessThan(transition);
    expect(transition).toBeLessThan(moreBasic);
    expect(moreBasic - moreAcidic).toBeLessThan(0.002);
    expect(Number.isFinite(moreAcidic)).toBe(true);
  });

  it("keeps the monoprotic approximation continuous outside the taught band", () => {
    const lowPH = protonationRatio(INDICATOR, activity(6.309573444801932e-9), ANION_GAMMA);
    const highPH = protonationRatio(INDICATOR, activity(1e-10), ANION_GAMMA);
    const beyondSecondTransition = protonationRatio(
      INDICATOR,
      activity(1e-12),
      ANION_GAMMA,
    );

    expect(lowPH).toBeGreaterThan(0);
    expect(highPH).toBeGreaterThan(lowPH);
    expect(beyondSecondTransition).toBeGreaterThan(highPH);
    expect(Number.isFinite(beyondSecondTransition)).toBe(true);
  });

  it("returns only the observable ratio, not chemistry internals", () => {
    const output = {
      indicatorId: INDICATOR.indicatorId,
      protonationRatio: protonationRatio(INDICATOR, activity(1e-9), ANION_GAMMA),
    };

    expect(Object.keys(output)).toEqual(["indicatorId", "protonationRatio"]);
    expect(output).not.toHaveProperty("kaIn");
    expect(output).not.toHaveProperty("activity");
    expect(output).not.toHaveProperty("activityCoefficient");
  });

  it.each([
    ["empty indicator id", { indicatorId: "", kaIn: INDICATOR.kaIn }, activity(1e-9), ANION_GAMMA],
    ["missing Ka", { indicatorId: "broken", kaIn: {} as ThermodynamicConstant }, activity(1e-9), ANION_GAMMA],
    ["zero hydrogen activity", INDICATOR, activity(0), ANION_GAMMA],
    ["missing hydrogen activity", INDICATOR, { value: undefined } as never, ANION_GAMMA],
    ["invalid anion coefficient", INDICATOR, activity(1e-9), { value: 0 } as ActivityCoefficient],
  ])("rejects %s at the chemistry boundary", (_label, indicator, hydrogen, gamma) => {
    expect(() => protonationRatio(indicator, hydrogen, gamma)).toThrow(RangeError);
  });
});
