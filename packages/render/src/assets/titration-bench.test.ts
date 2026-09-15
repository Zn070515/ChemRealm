import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
  TITRATION_BENCH_ASSET,
  validateApparatusAssetManifest,
} from "./titration-bench.js";

describe("M6 titration apparatus asset contract", () => {
  it("declares an original mm-based semantic package", () => {
    const asset = validateApparatusAssetManifest();
    expect(asset.coordinateUnit).toBe("mm");
    expect(asset.view).toBe("orthographic-side-elevation");
    expect(asset.parts.map((part) => part.id)).toEqual(expect.arrayContaining([
      "burette.body",
      "burette.stopcock",
      "flask.body",
      "stand.clamp",
    ]));
    expect(asset.ports.map((port) => port.kind)).toEqual(expect.arrayContaining([
      "fluid-outlet",
      "fluid-inlet",
    ]));
    expect(asset.interactionRegions.map((region) => region.id)).toEqual(expect.arrayContaining([
      "region.burette-body",
      "region.flask-body",
      "region.beaker-body",
    ]));
    expect(asset.volumeProfileIds).toContain("m5-conical-flask-250ml-profile");
  });

  it("keeps package metadata immutable and rejects non-volumetric drift", () => {
    expect(Object.isFrozen(TITRATION_BENCH_ASSET)).toBe(true);
    expect(Object.isFrozen(TITRATION_BENCH_ASSET.parts)).toBe(true);
    expect(Object.isFrozen(TITRATION_BENCH_ASSET.interactionRegions)).toBe(true);
    expect(() => validateApparatusAssetManifest({
      ...TITRATION_BENCH_ASSET,
      volumetric: false,
    } as unknown as typeof TITRATION_BENCH_ASSET)).toThrow(/frozen volume profile/i);
  });

  it("ships the inspectable master/source/license/QA package beside runtime metadata", async () => {
    const packageRoot = new URL("../../../../assets/apparatus/titration-bench/", import.meta.url);
    const [manifest, master, source, license, qa] = await Promise.all([
      readFile(new URL("manifest.json", packageRoot), "utf8"),
      readFile(new URL("master.svg", packageRoot), "utf8"),
      readFile(new URL("source-record.md", packageRoot), "utf8"),
      readFile(new URL("license.md", packageRoot), "utf8"),
      readFile(new URL("qa/README.md", packageRoot), "utf8"),
    ]);
    expect(JSON.parse(manifest)).toMatchObject({
      assetId: TITRATION_BENCH_ASSET.assetId,
      assetVersionSource: "contracts/version-manifest.json#representation.apparatusAsset",
      coordinateUnit: "mm",
      interactionRegions: expect.any(Array),
    });
    expect(master).toContain("<svg");
    expect(source).toMatch(/original/i);
    expect(license).toContain("PolyForm Noncommercial");
    expect(qa).toContain("review");
    expect(master).not.toMatch(/(?:href|src)=["']https?:\/\//i);
  });
});
