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
const lodDetail = {
  master: "full",
  scene: "scene",
  preview: "catalog",
  thumbnail: "identity",
} as const;
const assetContracts = {
  "burette-acid-25ml-class-as": {
    requiredLayers: ["body", "glass-back", "glass-front", "rim", "graduation", "stopcock", "stopcock-key", "tip", "support-interface", "highlight", "detachable"],
    forbiddenLayers: ["base", "hardware"],
  },
  "burette-alkali-50ml-class-b": {
    requiredLayers: ["body", "glass-back", "glass-front", "rim", "graduation", "lower-connector", "rubber-tube", "glass-bead", "pinch-region", "tip", "support-interface", "highlight", "detachable"],
    forbiddenLayers: ["base", "hardware", "stopcock", "stopcock-key"],
  },
  "beaker-100ml": {
    requiredLayers: ["body", "glass-back", "glass-front", "rim", "spout", "graduation", "contact-base", "highlight"],
    forbiddenLayers: ["base", "hardware"],
  },
  "beaker-250ml": {
    requiredLayers: ["body", "glass-back", "glass-front", "rim", "spout", "graduation", "contact-base", "highlight"],
    forbiddenLayers: ["base", "hardware"],
  },
  "beaker-1000ml": {
    requiredLayers: ["body", "glass-back", "glass-front", "rim", "spout", "graduation", "contact-base", "highlight"],
    forbiddenLayers: ["base", "hardware"],
  },
  "conical-flask-100ml": {
    requiredLayers: ["body", "shoulder", "neck", "rim", "contact-base", "glass-back", "glass-front", "highlight"],
    forbiddenLayers: ["hardware", "base"],
  },
  "conical-flask-250ml": {
    requiredLayers: ["body", "shoulder", "neck", "rim", "contact-base", "glass-back", "glass-front", "highlight"],
    forbiddenLayers: ["hardware", "base"],
  },
  "conical-flask-500ml": {
    requiredLayers: ["body", "shoulder", "neck", "rim", "contact-base", "glass-back", "glass-front", "highlight"],
    forbiddenLayers: ["hardware", "base"],
  },
} as const;

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
    readonly materialProfile: string;
    readonly anatomy: readonly string[];
    readonly landmarksMm: Readonly<Record<string, number>>;
    readonly identityLayers: readonly string[];
    readonly actuatorKind?: string;
    readonly provenanceRefs: readonly string[];
    readonly lodVisibility: Readonly<Record<string, string>>;
    readonly lodFiles: Readonly<Record<string, string>>;
  }[];
}

async function readManifest(): Promise<GoldMasterManifest> {
  return JSON.parse(await readFile(new URL("manifest.json", packageRoot), "utf8")) as GoldMasterManifest;
}

describe("M6 Gold Master asset package", () => {
  it("declares the bounded first owner-review set and its deterministic LOD contract", async () => {
    const manifest = await readManifest();

    expect(manifest.schemaVersion).toBe(2);
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
    expect(new Set(manifest.assets.map((asset) => asset.materialProfile)).size).toBeGreaterThanOrEqual(4);
    for (const expected of goldMasterAssets) {
      expect(manifest.assets).toEqual(expect.arrayContaining([
        expect.objectContaining({
          assetId: expected.assetId,
          specificationId: expected.assetId,
          familyId: expected.familyId,
          capacityMl: expected.capacityMl,
          dimensionsMm: expect.arrayContaining([expect.any(Number)]),
          materialProfile: expect.any(String),
          anatomy: expect.arrayContaining([expect.any(String)]),
          landmarksMm: expect.objectContaining({}),
          identityLayers: expect.arrayContaining([expect.any(String)]),
          provenanceRefs: expect.arrayContaining([expect.any(String)]),
          lodVisibility: expect.objectContaining(lodDetail),
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
    expect(packageRecords[0]).toMatch(/family anatomy/i);
    expect(packageRecords[0]).toMatch(/scene-owned.*shadow|shadow.*scene-owned/i);
    expect(packageRecords[2]).toMatch(/token.*not.*visual|visual.*review/i);

    for (const asset of manifest.assets) {
      const contract = assetContracts[asset.assetId as keyof typeof assetContracts];
      if (!contract) throw new Error("Missing Gold Master anatomy contract for " + asset.assetId);
      expect(asset.anatomy.length).toBeGreaterThanOrEqual(5);
      expect(Object.keys(asset.landmarksMm).length).toBeGreaterThanOrEqual(5);
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
        expect(svg).toContain("data-material-profile=\"" + asset.materialProfile + "\"");
        expect(svg).toContain("data-lod-detail=\"" + lodDetail[lod] + "\"");
        if (asset.actuatorKind) {
          expect(svg).toContain(`data-actuator-kind="${asset.actuatorKind}"`);
        }
        expect(svg).not.toMatch(/(?:href|src)=['"]https?:\/\//i);
        expect(svg).not.toMatch(/<image\b/i);
        expect(svg).not.toMatch(/pH|pKa|reagent|phenolphthalein|methyl-orange/i);
        expect(svg).not.toContain('data-layer="base"');
        expect(svg).not.toContain('data-layer="hardware"');
        expect(svg).not.toContain('class="glass-fill edge"');
        for (const layer of contract.requiredLayers) {
          expect(svg, `${asset.assetId}/${lod} missing ${layer}`).toContain(`data-layer="${layer}"`);
        }
        for (const layer of contract.forbiddenLayers) {
          expect(svg, `${asset.assetId}/${lod} contains fictitious ${layer}`).not.toContain(`data-layer="${layer}"`);
        }
      }

      const svgByLod = Object.fromEntries(await Promise.all(lods.map(async (lod) => [
        lod,
        await readFile(new URL(asset.assetId + "/" + asset.lodFiles[lod], packageRoot), "utf8"),
      ]))) as Record<(typeof lods)[number], string>;
      const ids = (svg: string) => {
        const values: string[] = [];
        for (const match of svg.matchAll(/\sid="([^"]+)"/g)) {
          if (match[1] !== undefined) values.push(match[1]);
        }
        return values;
      };
      for (const lod of lods) {
        const idValues = ids(svgByLod[lod]);
        expect(new Set(idValues).size, asset.assetId + "/" + lod + " has duplicate SVG ids").toBe(idValues.length);
        expect(svgByLod[lod]).toContain(
          "aria-labelledby=\"" + asset.assetId + "-" + lod + "-title " + asset.assetId + "-" + lod + "-desc\"",
        );
      }
      const pathCount = (svg: string) => (svg.match(/<path\b/g) ?? []).length;
      expect(pathCount(svgByLod.master)).toBeGreaterThan(pathCount(svgByLod.scene));
      expect(pathCount(svgByLod.scene)).toBeGreaterThan(pathCount(svgByLod.preview));
      expect(pathCount(svgByLod.preview)).toBeGreaterThan(pathCount(svgByLod.thumbnail));
      expect(svgByLod.master).not.toContain('data-layer="shadow"');
      expect(svgByLod.scene).toContain('data-layer="shadow"');
      if (asset.familyId === "burette") {
        expect(svgByLod.master).toContain('data-layer="graduation"');
        expect(svgByLod.master).toContain(asset.actuatorKind === "rotary-valve" ? 'data-layer="stopcock"' : 'data-layer="rubber-tube"');
        expect(svgByLod.master).toContain('data-layer="tip"');
        expect(svgByLod.master).toContain('data-layer="support-interface"');
        expect(asset.actuatorKind).toMatch(/rotary-valve|pinch-valve/);
      }
      if (asset.familyId === "beaker") {
        const spoutProjection = asset.landmarksMm.spoutMaxProjection;
        if (spoutProjection === undefined) throw new Error("Beaker is missing spoutMaxProjection: " + asset.assetId);
        const diameter = asset.dimensionsMm[0];
        if (diameter === undefined) throw new Error("Beaker is missing width: " + asset.assetId);
        expect(spoutProjection).toBeLessThanOrEqual(diameter * 0.45);
        expect(svgByLod.master).toContain('data-spout-root="rim-continuity"');
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
    expect(normalized).toContain('data-review-mode="visual-only"');
    expect(normalized).toContain("changed geometry parameters");
    for (const asset of goldMasterAssets) {
      expect(physical).toContain("data-source-asset-id=\"" + asset.assetId + "\"");
      expect(physical).toContain('data-source-lod="master"');
      expect(normalized).toContain("data-source-asset-id=\"" + asset.assetId + "\"");
      expect(normalized).toContain('data-source-lod="master"');
    }
    expect(physical).not.toContain('data-review-source="hand-authored-outline"');
    expect(normalized).not.toContain('data-review-source="hand-authored-outline"');
    const ids = (svg: string) => {
      const values: string[] = [];
      for (const match of svg.matchAll(/\sid="([^"]+)"/g)) {
        if (match[1] !== undefined) values.push(match[1]);
      }
      return values;
    };
    for (const sheet of [physical, normalized]) {
      const idValues = ids(sheet);
      expect(new Set(idValues).size, "comparison sheet has duplicate SVG ids").toBe(idValues.length);
    }
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
    expect(states.variants.flatMap((variant) => variant.visibleLayers)).not.toEqual(
      expect.arrayContaining(["base", "hardware", "support-interface"]),
    );
    expect(states.assets).toHaveLength(manifest.assets.length);
    for (const asset of manifest.assets) {
      const state = states.assets.find((candidate) => candidate.assetId === asset.assetId);
      expect(state).toBeDefined();
      expect(state?.supportedVariants).toContain("empty");
      expect(state?.supportedVariants).toContain("filled");
      if (asset.familyId === "burette") expect(state?.supportedVariants).toContain("connected");
    }
    expect(fixture.fixtureId).toBe("m6-gold-master-static-review-v2");
    expect(fixture.renderMode).toBe("asset-package-review");
    expect(fixture.assetIds).toEqual(manifest.assets.map((asset) => asset.assetId));
    expect(fixture.backgrounds).toEqual(manifest.backgrounds);
    expect(fixture.lods).toEqual(manifest.lods);
  });
});
