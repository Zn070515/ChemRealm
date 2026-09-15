import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { APPARATUS_CATALOG } from "./apparatus-catalog.js";

const packageRoot = new URL("../../../../assets/apparatus/catalog/gold-master/", import.meta.url);

const goldMasterAssets = [
  { assetId: "burette-acid-25ml-class-as", familyId: "burette", capacityMl: 25 },
  { assetId: "burette-alkali-50ml-class-b", familyId: "burette", capacityMl: 50 },
  { assetId: "beaker-100ml", familyId: "beaker", capacityMl: 100 },
  { assetId: "beaker-250ml", familyId: "beaker", capacityMl: 250 },
  { assetId: "beaker-1000ml", familyId: "beaker", capacityMl: 1000 },
  { assetId: "conical-flask-100ml", familyId: "conical-flask", capacityMl: 100 },
  { assetId: "conical-flask-250ml", familyId: "conical-flask", capacityMl: 250 },
  { assetId: "conical-flask-500ml", familyId: "conical-flask", capacityMl: 500 },
] as const;

const lods = ["master", "scene", "preview", "thumbnail"] as const;
const requiredMasterLayers = ["glass-back", "glass-front", "rim", "base", "hardware", "highlight"];

interface GoldMasterManifest {
  readonly schemaVersion: number;
  readonly assetVersionSource: string;
  readonly catalogVersionSource: string;
  readonly visualFamily: string;
  readonly coordinateUnit: string;
  readonly lods: readonly string[];
  readonly backgrounds: readonly string[];
  readonly statePackage: {
    readonly manifest: string;
    readonly variants: readonly string[];
    readonly source: string;
  };
  readonly deterministicFixture: string;
  readonly comparisonSheets: readonly string[];
  readonly assets: readonly {
    readonly assetId: string;
    readonly specificationId: string;
    readonly familyId: string;
    readonly capacityMl: number;
    readonly dimensionsMm: readonly number[];
    readonly identityLayers: readonly string[];
    readonly actuatorKind?: string;
    readonly provenanceRefs: readonly string[];
    readonly lodFiles: Readonly<Record<string, string>>;
  }[];
}

async function readManifest(): Promise<GoldMasterManifest> {
  return JSON.parse(await readFile(new URL("manifest.json", packageRoot), "utf8")) as GoldMasterManifest;
}

describe("M6 Gold Master asset package", () => {
  it("declares the bounded first owner-review set and its deterministic LOD contract", async () => {
    const manifest = await readManifest();

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.assetVersionSource).toBe("contracts/version-manifest.json#representation.apparatusAsset");
    expect(manifest.catalogVersionSource).toBe("contracts/version-manifest.json#representation.apparatusCatalog");
    expect(manifest.visualFamily).toBe("chemrealm-lab-v1");
    expect(manifest.coordinateUnit).toBe("mm");
    expect(manifest.lods).toEqual(lods);
    expect(manifest.backgrounds).toEqual(["dark-neutral", "light-neutral"]);
    expect(manifest.statePackage).toEqual({
      manifest: "states/manifest.json",
      variants: ["empty", "filled", "connected"],
      source: "RenderState apparatus state contract",
    });
    expect(manifest.deterministicFixture).toBe("fixture/render-fixture.json");
    expect(manifest.comparisonSheets).toEqual(expect.arrayContaining([
      "qa/comparison-sheet-physical-scale.svg",
      "qa/comparison-sheet-normalized-shape.svg",
    ]));
    expect(manifest.assets).toHaveLength(goldMasterAssets.length);
    for (const expected of goldMasterAssets) {
      expect(manifest.assets).toEqual(expect.arrayContaining([
        expect.objectContaining({
          assetId: expected.assetId,
          specificationId: expected.assetId,
          familyId: expected.familyId,
          capacityMl: expected.capacityMl,
          dimensionsMm: expect.arrayContaining([expect.any(Number)]),
          identityLayers: expect.arrayContaining([expect.any(String)]),
          provenanceRefs: expect.arrayContaining([expect.any(String)]),
          lodFiles: expect.objectContaining({ master: "master.svg", scene: "scene.svg", preview: "preview.svg", thumbnail: "thumbnail.svg" }),
        }),
      ]));
    }
  });

  it("ships original, self-contained SVGs with structural layers at every LOD", async () => {
    const manifest = await readManifest();
    const packageRecords = await Promise.all([
      readFile(new URL("source-record.md", packageRoot), "utf8"),
      readFile(new URL("license.md", packageRoot), "utf8"),
      readFile(new URL("qa/README.md", packageRoot), "utf8"),
    ]);

    expect(packageRecords[0]).toMatch(/original/i);
    expect(packageRecords[0]).toMatch(/NOBOOK/i);
    expect(packageRecords[1]).toContain("PolyForm Noncommercial");
    expect(packageRecords[2]).toMatch(/dark-neutral|light-neutral/i);
    expect(packageRecords[2]).toMatch(/thumbnail/i);

    for (const asset of manifest.assets) {
      for (const lod of lods) {
        const svg = await readFile(new URL(`${asset.assetId}/${asset.lodFiles[lod]}`, packageRoot), "utf8");
        expect(svg, `${asset.assetId}/${lod}`).toMatch(/^<svg\b/);
        expect(svg).toContain(`data-asset-id="${asset.assetId}"`);
        expect(svg).toContain(`data-specification-id="${asset.specificationId}"`);
        expect(svg).toContain(`data-family-id="${asset.familyId}"`);
        expect(svg).toContain(`data-capacity-ml="${asset.capacityMl}"`);
        expect(svg).toContain(`data-dimensions-mm="${asset.dimensionsMm.join(" ")}"`);
        expect(svg).toContain(`data-lod="${lod}"`);
        expect(svg).toContain('data-coordinate-unit="mm"');
        expect(svg).toContain('data-visual-role="apparatus-geometry"');
        expect(svg).toContain(`data-view-mode="${lod === "master" ? "construction" : lod === "scene" ? "experiment-world" : "catalog-preview"}"`);
        expect(svg).toContain('data-measurement-qualified="false"');
        if (asset.actuatorKind) {
          expect(svg).toContain(`data-actuator-kind="${asset.actuatorKind}"`);
        }
        expect(svg).not.toMatch(/(?:href|src)=['"]https?:\/\//i);
        expect(svg).not.toMatch(/<image\b/i);
        expect(svg).not.toMatch(/pH|pKa|reagent|phenolphthalein|methyl-orange/i);
        for (const layer of asset.identityLayers) {
          expect(svg, `${asset.assetId}/${lod} missing ${layer}`).toContain(`data-layer="${layer}"`);
        }
      }

      const master = await readFile(new URL(`${asset.assetId}/master.svg`, packageRoot), "utf8");
      for (const layer of requiredMasterLayers) {
        expect(master, `${asset.assetId}/master.svg missing ${layer}`).toContain(`data-layer="${layer}"`);
      }
      if (asset.familyId === "burette") {
        expect(master).toContain('data-layer="graduation"');
        expect(master).toContain('data-layer="actuator"');
        expect(asset.actuatorKind).toMatch(/rotary-valve|pinch-valve/);
      }
    }
  });

  it("keeps Gold Master identity aligned with the typed apparatus catalog", async () => {
    const manifest = await readManifest();
    for (const asset of manifest.assets) {
      const specification = APPARATUS_CATALOG.specifications.find(
        (candidate) => candidate.specificationId === asset.specificationId,
      );
      expect(specification, asset.specificationId).toBeDefined();
      expect(specification).toMatchObject({
        familyId: asset.familyId,
        capacityMl: asset.capacityMl,
        dimensionsMm: asset.dimensionsMm,
      });
    }
  });

  it("ships independent physical-scale and normalized-shape comparison evidence", async () => {
    const physical = await readFile(new URL("qa/comparison-sheet-physical-scale.svg", packageRoot), "utf8");
    const normalized = await readFile(new URL("qa/comparison-sheet-normalized-shape.svg", packageRoot), "utf8");
    expect(physical).toContain('data-review-mode="measurement-valid"');
    expect(physical).toContain("burette-acid-25ml-class-as");
    expect(physical).toContain("beaker-1000ml");
    expect(physical).toContain("conical-flask-500ml");
    expect(normalized).toContain('data-review-mode="visual-only"');
    expect(normalized).toContain("changed geometry parameters");
    expect(normalized).toContain("burette-alkali-50ml-class-b");
    expect(normalized).toContain("beaker-250ml");
    expect(normalized).toContain("conical-flask-100ml");
  });

  it("ships explicit state coverage and a deterministic review fixture", async () => {
    const manifest = await readManifest();
    const states = JSON.parse(await readFile(new URL(manifest.statePackage.manifest, packageRoot), "utf8")) as {
      readonly variants: readonly { readonly id: string; readonly visibleLayers: readonly string[] }[];
      readonly assets: readonly { readonly assetId: string; readonly supportedVariants: readonly string[] }[];
    };
    const fixture = JSON.parse(await readFile(new URL(manifest.deterministicFixture, packageRoot), "utf8")) as {
      readonly fixtureId: string;
      readonly renderMode: string;
      readonly assetIds: readonly string[];
      readonly backgrounds: readonly string[];
      readonly lods: readonly string[];
    };

    expect(states.variants.map((variant) => variant.id)).toEqual(["empty", "filled", "connected"]);
    expect(states.variants.every((variant) => variant.visibleLayers.length > 0)).toBe(true);
    expect(states.assets).toHaveLength(manifest.assets.length);
    for (const asset of manifest.assets) {
      const state = states.assets.find((candidate) => candidate.assetId === asset.assetId);
      expect(state).toBeDefined();
      expect(state?.supportedVariants).toContain("empty");
      expect(state?.supportedVariants).toContain("filled");
      if (asset.familyId === "burette") expect(state?.supportedVariants).toContain("connected");
    }
    expect(fixture.fixtureId).toBe("m6-gold-master-static-review-v1");
    expect(fixture.renderMode).toBe("asset-package-review");
    expect(fixture.assetIds).toEqual(manifest.assets.map((asset) => asset.assetId));
    expect(fixture.backgrounds).toEqual(manifest.backgrounds);
    expect(fixture.lods).toEqual(manifest.lods);
  });
});
