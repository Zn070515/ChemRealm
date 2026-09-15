import { readFile, readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { GOLD_MASTER_CONSTRUCTION_SOURCE } from "./gold-master-source.js";

const mastersRoot = new URL("../../../../assets/apparatus/masters/", import.meta.url);
const firstWaveIds = new Set(GOLD_MASTER_CONSTRUCTION_SOURCE.specifications.map((record) => record.specificationId));

async function readMasters(): Promise<readonly { readonly directory: string; readonly assetId: string; readonly svg: string }[]> {
  const entries = await readdir(mastersRoot, { withFileTypes: true });
  const records = [] as { directory: string; assetId: string; svg: string }[];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const svg = await readFile(new URL(`${entry.name}/master.svg`, mastersRoot), "utf8");
    const assetId = svg.match(/data-asset-id="([^"]+)"/)?.[1];
    if (assetId !== undefined && firstWaveIds.has(assetId)) records.push({ directory: entry.name, assetId, svg });
  }
  return records;
}

describe("M6 instrument audit package", () => {
  it("ships a source record, measurement sheet, and review record for every first-wave master", async () => {
    const masters = await readMasters();
    expect(masters).toHaveLength(firstWaveIds.size);
    for (const master of masters) {
      const base = new URL(`${master.directory}/`, mastersRoot);
      const sourceRecord = await readFile(new URL("source-record.md", base), "utf8");
      const measurementSheet = JSON.parse(await readFile(new URL("measurement-sheet.json", base), "utf8")) as {
        readonly assetId: string;
        readonly classification: string;
        readonly dimensionsMm: readonly number[];
      };
      const review = await readFile(new URL("review.md", base), "utf8");
      expect(sourceRecord).toContain(master.assetId);
      expect(measurementSheet.assetId).toBe(master.assetId);
      expect(measurementSheet.classification).toMatch(/source|derived|approx/i);
      expect(measurementSheet.dimensionsMm.length).toBe(3);
      expect(review).toMatch(/owner visual review/i);
    }
  });

  it("keeps the instrument-specific marking semantics visible in the master", async () => {
    const masters = await readMasters();
    for (const master of masters) {
      const source = GOLD_MASTER_CONSTRUCTION_SOURCE.specifications.find((record) => record.specificationId === master.assetId);
      expect(source).toBeDefined();
      expect(master.svg).not.toContain('data-layer="graduation"');
      if (source?.familyId === "burette") {
        expect(master.svg).toContain('data-layer="scale" data-part="burette.scale-on-tube"');
        expect(master.svg).toContain('data-marking-direction="increases-downward"');
        expect(master.svg).toContain('data-marking-reference="top-zero"');
        expect(master.svg).toContain('data-marking-surface="tube-wrap"');
      } else if (source?.familyId === "beaker") {
        expect(master.svg).toContain('data-layer="scale" data-part="vessel.scale"');
        expect(master.svg).toContain('data-marking-direction="increases-upward"');
        expect(master.svg).toContain('data-marking-range-ml="25-200"');
      } else {
        expect(master.svg).not.toMatch(/data-layer="scale"/);
      }
    }
  });
});
