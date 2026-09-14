import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (relativePath) => readFileSync(`${root}/${relativePath}`, "utf8");

describe("M5 indicator optical observation boundary", () => {
  it("routes indicator presentation through tagged optical observations", () => {
    const observable = read("packages/render/src/observable/index.ts");
    const optics = read("packages/render/src/observable/optics.ts");
    const scene = read("packages/render/src/state/scene.ts");

    expect(observable).toContain("observeIndicatorOptics");
    expect(observable).toContain("opticalObservation");
    expect(observable).not.toContain("mapIndicatorRatioToTint");
    expect(observable).not.toContain("INDICATOR_PALETTES");
    expect(optics).toContain("OPTICAL_MODEL_DATA_MISSING");
    expect(optics).toContain("OPTICAL_MODEL_OUT_OF_COVERAGE");
    expect(scene).toContain("opticalStatus");
    expect(scene).not.toContain("mapIndicatorRatioToTint");
  });
});
