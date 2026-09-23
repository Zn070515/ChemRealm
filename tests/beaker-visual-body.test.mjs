import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "..");
const manifestPath = resolve(
  repositoryRoot,
  "assets/apparatus/masters/beaker-250ml/source/visual-body/manifest.json",
);
const graduationsPath = resolve(
  repositoryRoot,
  "assets/apparatus/masters/beaker-250ml/source/visual-body/runtime/graduations.svg",
);
const interiorMaskPath = resolve(
  repositoryRoot,
  "assets/apparatus/masters/beaker-250ml/source/visual-body/runtime/interior-mask.svg",
);
const liquidMaskPath = resolve(
  repositoryRoot,
  "assets/apparatus/masters/beaker-250ml/source/visual-body/runtime/liquid-mask.svg",
);

describe("beaker runtime graduation boundary", () => {
  it("keeps the first and last graduation labels fully inside the vessel-safe clip box", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const svg = await readFile(graduationsPath, "utf8");
    const { heightPx: height } = manifest.body;
    const region = manifest.coordinateContract.graduationRegion;
    const rimY = manifest.coordinateContract.anchors.rimTop[1] * height;
    const contactY = manifest.coordinateContract.anchors.contactBase[1] * height;
    const topY = region.topY * height;
    const bottomY = region.bottomY * height;
    const clipTopY = region.clipTopY * height;
    const clipBottomY = region.clipBottomY * height;

    expect(region.clipTopY).toBeDefined();
    expect(region.clipBottomY).toBeDefined();
    expect(clipTopY).toBeGreaterThan(rimY);
    expect(clipTopY).toBeLessThan(topY);
    expect(clipBottomY).toBeGreaterThan(bottomY);
    expect(clipBottomY).toBeLessThan(contactY);
    expect(svg).toContain('data-label-clip="endpoint-safe"');

    const clipRect = svg.match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
    expect(clipRect).not.toBeNull();
    expect(Number(clipRect[2])).toBeCloseTo(clipTopY, 1);
    expect(Number(clipRect[2]) + Number(clipRect[4])).toBeCloseTo(clipBottomY, 1);
    expect(svg).toContain('data-marking-value-ml="200"');
    expect(svg).toContain('data-marking-value-ml="25"');
  });

  it("derives liquid and interior masks from the cavity contract, not the graduation box", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const [interiorMask, liquidMask] = await Promise.all([
      readFile(interiorMaskPath, "utf8"),
      readFile(liquidMaskPath, "utf8"),
    ]);
    const { heightPx: height } = manifest.body;
    const anchors = manifest.coordinateContract.anchors;
    const cavityTopY = anchors.cavityTop[1] * height;
    const cavityBottomY = anchors.cavityBottom[1] * height;
    const graduationRegion = manifest.coordinateContract.graduationRegion;

    for (const mask of [interiorMask, liquidMask]) {
      expect(mask).toContain('data-mask-source="cavity-contract"');
      expect(mask).toContain(`data-mask-top-y="${cavityTopY.toFixed(2)}"`);
      expect(mask).toContain(`data-mask-bottom-y="${cavityBottomY.toFixed(2)}"`);
    }
    expect(cavityTopY).toBeLessThan(graduationRegion.topY * height);
    expect(cavityBottomY).toBeGreaterThan(graduationRegion.bottomY * height);
  });
});
