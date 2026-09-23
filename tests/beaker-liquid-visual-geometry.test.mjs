import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "..");
const manifestPath = resolve(
  repositoryRoot,
  "assets/apparatus/masters/beaker-250ml/source/visual-body/manifest.json",
);
const geometryArtifactPath = resolve(
  repositoryRoot,
  "assets/apparatus/masters/beaker-250ml/source/visual-body/runtime/liquid-visual-geometry.svg",
);

describe("beaker liquid visual geometry spike", () => {
  it("declares a hand-authored cavity outline and perspective surface contract", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const geometry = manifest.liquidVisualGeometry;

    expect(geometry?.status).toBe("prototype-visual-calibration");
    expect(geometry?.cavityOutline?.path).toMatch(/^M /);
    expect(geometry?.cavityOutline?.path).toMatch(/C /);
    expect(geometry?.cavityOutline?.path).not.toMatch(/Q .* H .* V /);
    expect(geometry?.sideBoundary?.left?.length).toBeGreaterThanOrEqual(3);
    expect(geometry?.sideBoundary?.right?.length).toBeGreaterThanOrEqual(3);
    expect(geometry?.surface?.kind).toBe("perspective-ellipse");
    expect(geometry?.surface?.depthPx).toBeGreaterThan(0);
  });

  it("keeps 25, 100, and 200 mL visual fixture heights ordered without claiming scientific h(V)", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const region = manifest.coordinateContract.graduationRegion;
    const visualY = (volume) => {
      const fraction = (volume - 25) / (200 - 25);
      return region.bottomY - fraction * (region.bottomY - region.topY);
    };

    expect(visualY(25)).toBeGreaterThan(visualY(100));
    expect(visualY(100)).toBeGreaterThan(visualY(200));
    expect(manifest.liquidVisualGeometry.heightSource).toBe(
      "prototype-visual-fixture-not-scientific-profile",
    );
  });

  it("keeps the rejected visual spike isolated from production claims", async () => {
    const svg = await readFile(geometryArtifactPath, "utf8");

    expect(svg).toContain('data-status="prototype-only"');
    expect(svg).toContain('data-layer="liquid-body"');
    expect(svg).toContain('data-layer="rear-meniscus"');
    expect(svg).toContain('data-layer="front-meniscus"');
    expect(svg).toContain('data-visual-volume-ml="25"');
    expect(svg).toContain('data-visual-volume-ml="100"');
    expect(svg).toContain('data-visual-volume-ml="200"');
    expect(svg).toContain("<path");
  });
});
