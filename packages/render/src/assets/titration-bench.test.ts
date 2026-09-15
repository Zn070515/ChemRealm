import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { VERSION_MANIFEST } from "@chemrealm/schema";

import { APPARATUS_CATALOG, APPARATUS_CATALOG_VERSION } from "./apparatus-catalog.js";
import {
  TITRATION_BENCH_ASSET,
  validateApparatusAssetManifest,
} from "./titration-bench.js";

describe("M6 titration apparatus asset contract", () => {
  it("declares an original mm-based semantic package", () => {
    const asset = validateApparatusAssetManifest();
    expect(asset.coordinateUnit).toBe("mm");
    expect(asset.view).toBe("orthographic-side-elevation");
    expect(asset.masterArtboard).toEqual({
      coordinateSpace: "logical-artboard",
      viewBox: [0, 0, 1200, 760],
      semanticBoundsMm: [260, 190],
    });
    expect(asset.catalogVersion).toBe(VERSION_MANIFEST.representation.apparatusCatalog);
    expect(asset.catalogSpecificationIds).toEqual(expect.arrayContaining([
      "burette-v0-100ml",
      "conical-flask-250ml",
      "beaker-250ml",
    ]));
    expect(asset.parts.filter((part) => part.detachable).map((part) => part.id)).toEqual(expect.arrayContaining([
      "stand.clamp",
      "burette.stopcock",
      "burette.tip",
    ]));
    expect(asset.assetLayers).toEqual(expect.arrayContaining([
      "glass-back",
      "liquid",
      "meniscus",
      "graduation",
      "hardware",
      "glass-front",
      "highlight",
    ]));
    expect(asset.parts.map((part) => part.id)).toEqual(expect.arrayContaining([
      "burette.body",
      "burette.stopcock",
      "flask.body",
      "flask.rim",
      "beaker.rim",
      "beaker.spout",
      "stand.clamp",
    ]));
    expect(asset.parts.find((part) => part.id === "flask.neck")?.detachable).toBe(false);
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

  it("rejects a master artboard whose semantic bounds diverge from the asset", () => {
    expect(() => validateApparatusAssetManifest({
      ...TITRATION_BENCH_ASSET,
      masterArtboard: {
        ...TITRATION_BENCH_ASSET.masterArtboard,
        semanticBoundsMm: [261, 190],
      },
    })).toThrow(/semantic bounds/i);
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
      catalogVersionSource: "contracts/version-manifest.json#representation.apparatusCatalog",
      catalogSpecificationIds: expect.arrayContaining([...TITRATION_BENCH_ASSET.catalogSpecificationIds]),
      assetLayers: expect.arrayContaining(["liquid", "meniscus", "graduation", "hardware"]),
      coordinateUnit: "mm",
      masterArtboard: {
        coordinateSpace: "logical-artboard",
        viewBox: [0, 0, 1200, 760],
        semanticBoundsMm: [260, 190],
      },
      interactionRegions: expect.any(Array),
    });
    expect(master).toContain("<svg");
    expect(master).toContain('data-coordinate-space="logical-artboard"');
    expect(master).toContain('data-semantic-bounds-mm="260 190"');
    expect(source).toMatch(/original/i);
    expect(license).toContain("PolyForm Noncommercial");
    expect(qa).toContain("review");
    expect(master).not.toMatch(/(?:href|src)=["']https?:\/\//i);
    expect(master).not.toMatch(/prototype|placeholder|watermark/i);
  });

  it("ships a multi-specification catalog package with inspectable layer structure", async () => {
    const packageRoot = new URL("../../../../assets/apparatus/catalog/", import.meta.url);
    const [manifestText, master, source, license, qa] = await Promise.all([
      readFile(new URL("manifest.json", packageRoot), "utf8"),
      readFile(new URL("master.svg", packageRoot), "utf8"),
      readFile(new URL("source-record.md", packageRoot), "utf8"),
      readFile(new URL("license.md", packageRoot), "utf8"),
      readFile(new URL("qa/README.md", packageRoot), "utf8"),
    ]);
    const manifest = JSON.parse(manifestText) as {
      catalogVersionSource?: string;
      specifications?: readonly { specificationId?: string; familyId?: string }[];
      detachableSpecIds?: readonly string[];
      masterArtboard?: {
        coordinateSpace?: string;
        viewBox?: readonly number[];
        unit?: string;
      };
      sourceRecords?: readonly string[];
    };
    expect(manifest.catalogVersionSource).toBe("contracts/version-manifest.json#representation.apparatusCatalog");
    expect(manifest.specifications?.length).toBeGreaterThanOrEqual(APPARATUS_CATALOG.specifications.length);
    expect(manifest.specifications?.map((specification) => specification.specificationId))
      .toEqual(expect.arrayContaining(APPARATUS_CATALOG.specifications.map((specification) => specification.specificationId)));
    const sourceIds = [...new Set(APPARATUS_CATALOG.specifications.flatMap((specification) =>
      specification.provenance.map((provenance) => provenance.sourceId)) )];
    expect(manifest.sourceRecords).toEqual(expect.arrayContaining(sourceIds));
    expect(manifest.detachableSpecIds).toEqual(expect.arrayContaining([
      "glass-tube-straight-6mm",
      "connector-t-6mm",
      "rubber-tube-6mm",
      "rubber-stopper-two-hole-18mm",
    ]));
    expect(manifest.masterArtboard).toEqual({
      coordinateSpace: "logical-artboard",
      viewBox: [0, 0, 1400, 940],
      unit: "logical-scene-unit",
    });
    expect(master).toMatch(/data-layer=["'](?:glass|liquid|scale|hardware|highlight|detachable)["']/i);
    expect(master).toContain('data-coordinate-space="logical-artboard"');
    expect(master).toContain("data-specification=\"burette-v0-100ml\"");
    expect(master).toContain("data-specification=\"burette-acid-25ml-class-as\"");
    expect(master).toContain("data-specification=\"conical-flask-250ml\"");
    expect(master).not.toMatch(/(?:href|src)=["']https?:\/\//i);
    expect(source).toMatch(/Zhejiang|NOBOOK|original/i);
    expect(license).toContain("PolyForm Noncommercial");
    expect(qa).toMatch(/detachable|specification|review/i);
    expect(APPARATUS_CATALOG_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
