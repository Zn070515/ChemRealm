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
});
