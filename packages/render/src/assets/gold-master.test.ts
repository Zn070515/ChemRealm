import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { APPARATUS_CATALOG } from "./apparatus-catalog.js";
import { GOLD_MASTER_CONSTRUCTION_SOURCE, GOLD_MASTER_SPECIFICATION_IDS } from "./gold-master-source.js";
import type { InstrumentMarking } from "./instrument-marking.js";

const packageRoot = new URL("../../../../assets/apparatus/catalog/gold-master/", import.meta.url);
const lods = ["master", "scene", "preview", "thumbnail"] as const;
const expectedAssets = [...GOLD_MASTER_SPECIFICATION_IDS];

type AssetRecord = {
  readonly assetId: string;
  readonly specificationId: string;
  readonly assetStatus: "candidate";
  readonly familyId: string;
  readonly capacityMl: number;
  readonly bodyDimensionsMm: readonly number[];
  readonly dimensionsMm: readonly number[];
  readonly materialProfile: string;
  readonly landmarksMm: Readonly<Record<string, number>>;
  readonly marking: InstrumentMarking;
  readonly lodVisibility: Readonly<Record<(typeof lods)[number], readonly string[]>>;
  readonly lodFiles: Readonly<Record<string, string>>;
};
type GoldMasterManifest = { readonly schemaVersion: number; readonly status: string; readonly sourceOfTruth: string; readonly coordinateUnit: string; readonly lods: readonly string[]; readonly backgrounds: readonly string[]; readonly assets: readonly AssetRecord[]; readonly comparisonSheets: readonly string[]; readonly statePackage: { readonly manifest: string } ; readonly deterministicFixture: string };

async function readManifest(): Promise<GoldMasterManifest> {
  return JSON.parse(await readFile(new URL("manifest.json", packageRoot), "utf8")) as GoldMasterManifest;
}
async function readAsset(assetId: string, lod: string): Promise<string> {
  return readFile(new URL(`${assetId}/${lod}.svg`, packageRoot), "utf8");
}
function layer(svg: string, name: string): string {
  const match = svg.match(new RegExp(`<g data-layer="${name}"[^>]*>([\\s\\S]*?)</g>`));
  return match?.[1] ?? "";
}
function attr(svg: string, name: string): string {
  const match = svg.match(new RegExp(`${name}="([^"]+)"`));
  if (match?.[1] === undefined) throw new Error(`missing ${name}`);
  return match[1];
}
function dataNumbers(svg: string, name: string): number[] {
  return [...svg.matchAll(new RegExp(`${name}="([^\"]+)"`, "g"))].flatMap((match) => {
    const value = match[1];
    return value === undefined ? [] : [Number(value)];
  });
}
function markingValues(svg: string): number[] { return dataNumbers(svg, "data-marking-value-ml"); }
function visibleLayer(svg: string, name: string): boolean {
  const match = svg.match(new RegExp(`<g data-layer="${name}"([^>]*)>`));
  return match !== null && !match[1]!.includes('display="none"');
}
function visibleLayerNames(svg: string): string[] {
  return [...svg.matchAll(/<g data-layer="([^"]+)"([^>]*)>/g)]
    .filter((match) => !match[2]?.includes('display="none"'))
    .map((match) => match[1]!)
    .sort();
}
type Point = readonly [number, number];

function pathPoints(path: string): Point[] {
  const tokens = [...path.matchAll(/[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi)].map((match) => match[0]!);
  const points: Point[] = [];
  let index = 0;
  let command = "";
  let x = 0;
  let y = 0;
  let start: Point = [0, 0];
  const isCommand = (token: string): boolean => /^[A-Za-z]$/.test(token);
  const number = (): number => Number(tokens[index++]);
  const point = (nextX: number, nextY: number): void => {
    x = nextX;
    y = nextY;
    points.push([x, y]);
  };
  const pair = (relative: boolean): Point => {
    const nextX = number();
    const nextY = number();
    return relative ? [x + nextX, y + nextY] : [nextX, nextY];
  };
  while (index < tokens.length) {
    if (isCommand(tokens[index]!)) command = tokens[index++]!;
    const relative = command === command.toLowerCase();
    switch (command.toUpperCase()) {
      case "M": {
        const next = pair(relative);
        point(next[0], next[1]);
        start = [x, y];
        command = relative ? "l" : "L";
        break;
      }
      case "L":
      case "T": {
        const next = pair(relative);
        point(next[0], next[1]);
        break;
      }
      case "H": {
        const nextX = number();
        point(relative ? x + nextX : nextX, y);
        break;
      }
      case "V": {
        const nextY = number();
        point(x, relative ? y + nextY : nextY);
        break;
      }
      case "C": {
        const controlA = pair(relative);
        const controlB = pair(relative);
        const end = pair(relative);
        points.push(controlA, controlB);
        point(end[0], end[1]);
        break;
      }
      case "S":
      case "Q": {
        const control = pair(relative);
        const end = pair(relative);
        points.push(control);
        point(end[0], end[1]);
        break;
      }
      case "A": {
        number();
        number();
        number();
        number();
        number();
        const end = pair(relative);
        point(end[0], end[1]);
        break;
      }
      case "Z":
        point(start[0], start[1]);
        command = "";
        break;
      default:
        throw new Error(`unsupported SVG path command: ${command}`);
    }
  }
  return points;
}

function geometryPaths(svg: string): string[] {
  return [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*>/g)].map((match) => match[1]!).filter(Boolean);
}

function assertGeometryInsideViewBox(svg: string): void {
  const dimensions = attr(svg, "viewBox").split(" ").slice(2).map(Number);
  const width = dimensions[0];
  const height = dimensions[1];
  if (width === undefined || height === undefined || !Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(`invalid SVG viewBox dimensions: ${attr(svg, "viewBox")}`);
  }
  for (const path of geometryPaths(svg)) {
    for (const [x, y] of pathPoints(path)) {
      expect(x, `path x=${x} exceeds viewBox width=${width}: ${path}`).toBeGreaterThanOrEqual(0);
      expect(x, `path x=${x} exceeds viewBox width=${width}: ${path}`).toBeLessThanOrEqual(width);
      expect(y, `path y=${y} exceeds viewBox height=${height}: ${path}`).toBeGreaterThanOrEqual(0);
      expect(y, `path y=${y} exceeds viewBox height=${height}: ${path}`).toBeLessThanOrEqual(height);
    }
  }
  for (const match of svg.matchAll(/<(?:ellipse|circle)\b([^>]*)>/g)) {
    const attributes = match[1] ?? "";
    const value = (name: string): number => Number(attributes.match(new RegExp(`${name}="([^"]+)"`))?.[1]);
    const cx = value("cx");
    const cy = value("cy");
    const rx = value("rx") || value("r");
    const ry = value("ry") || value("r");
    expect(cx - rx).toBeGreaterThanOrEqual(0);
    expect(cx + rx).toBeLessThanOrEqual(width);
    expect(cy - ry).toBeGreaterThanOrEqual(0);
    expect(cy + ry).toBeLessThanOrEqual(height);
  }
}

describe("M6 Gold Master Candidate asset package", () => {
  it("uses one source of truth and labels the package as a candidate", async () => {
    const manifest = await readManifest();
    expect(manifest.schemaVersion).toBe(4);
    expect(manifest.status).toBe("gold-master-candidate");
    expect(manifest.sourceOfTruth).toBe("packages/render/src/assets/gold-master-construction.json");
    expect(manifest.coordinateUnit).toBe("mm");
    expect(manifest.lods).toEqual([...lods]);
    expect(manifest.backgrounds).toEqual(["dark-neutral", "light-neutral"]);
    expect(manifest.assets.map((asset) => asset.assetId)).toEqual(expectedAssets);
    expect(manifest.assets.every((asset) => asset.specificationId === asset.assetId)).toBe(true);
    expect(manifest.assets.every((asset) => asset.assetStatus === "candidate")).toBe(true);
    expect(manifest.assets.every((asset) => asset.lodVisibility.master.length > 0)).toBe(true);
    expect(Object.isFrozen(GOLD_MASTER_CONSTRUCTION_SOURCE)).toBe(true);
    expect(Object.isFrozen(GOLD_MASTER_CONSTRUCTION_SOURCE.specifications)).toBe(true);
    expect(Object.isFrozen(APPARATUS_CATALOG.specifications)).toBe(true);
  });

  it("keeps the generator source-driven and the active catalog free of first-wave duplicates", async () => {
    const generator = await readFile(new URL("../../../../tools/create_gold_master_assets.mjs", import.meta.url), "utf8");
    for (const specificationId of expectedAssets) expect(generator).not.toContain(`"${specificationId}"`);
    for (const source of GOLD_MASTER_CONSTRUCTION_SOURCE.specifications) {
      const active = APPARATUS_CATALOG.specifications.filter((item) => item.specificationId === source.specificationId);
      expect(active).toHaveLength(1);
      expect(active[0]?.dimensionsMm).toEqual(source.physicalEnvelopeMm);
      expect(active[0]?.marking?.kind).toBe(source.marking?.kind);
      expect(active[0]?.marking?.displayRangeMl).toEqual(source.marking?.displayRangeMl);
    }
  });

  it("measures true millimetre viewBoxes and binds landmarks to generated geometry", async () => {
    const manifest = await readManifest();
    for (const asset of manifest.assets) {
      const source = GOLD_MASTER_CONSTRUCTION_SOURCE.specifications.find((candidate) => candidate.specificationId === asset.assetId);
      if (!source) throw new Error(`source missing ${asset.assetId}`);
      for (const lod of lods) {
        const svg = await readAsset(asset.assetId, lod);
        expect(attr(svg, "viewBox")).toBe(`0 0 ${source.physicalEnvelopeMm[0]} ${source.physicalEnvelopeMm[1]}`);
        expect(attr(svg, "data-dimensions-mm")).toBe(source.physicalEnvelopeMm.join(" "));
        expect(attr(svg, "data-body-dimensions-mm")).toBe(source.bodyEnvelopeMm.join(" "));
        expect(attr(svg, "data-lod-visible-roles").split("|")).toEqual([...source.lodVisibility[lod]]);
        const expectedVisibleLayers = [...new Set(source.lodVisibility[lod])].sort();
        expect(visibleLayerNames(svg)).toEqual(expectedVisibleLayers);
        assertGeometryInsideViewBox(svg);
      }
      if (asset.familyId === "beaker") {
        const svg = await readAsset(asset.assetId, "master");
        expect(layer(svg, "spout")).toContain('data-spout-root="rim-continuity"');
        expect(layer(svg, "spout")).toContain("data-spout-tip-x");
      }
      if (asset.familyId === "conical-flask") {
        const svg = await readAsset(asset.assetId, "master");
        expect(layer(svg, "rim")).toContain(`rx="${Number(source.landmarksMm.mouthOuterDiameter) / 2}"`);
        expect(layer(svg, "neck")).toContain(`data-landmark-neck-length-mm="${Number(source.landmarksMm.neckLength)}"`);
        expect(layer(svg, "body")).toContain(`data-profile-boundary="erlenmeyer-conical-body"`);
        expect(layer(svg, "body")).toContain(`data-landmark-max-diameter-mm="${Number(source.landmarksMm.maxBodyDiameter)}"`);
        expect(layer(svg, "shoulder")).toContain(`data-landmark-shoulder-height-mm="${Number(source.landmarksMm.shoulderTransitionHeight)}"`);
      }
    }
  });

  it("derives instrument markings from catalog semantics and attaches them to the apparatus", async () => {
    const manifest = await readManifest();
    for (const asset of manifest.assets) {
      const source = GOLD_MASTER_CONSTRUCTION_SOURCE.specifications.find((candidate) => candidate.specificationId === asset.assetId);
      if (!source?.marking || source.marking.kind === "volumetric-single-mark") continue;
      const expectedCount = Math.round((source.marking.displayRangeMl.maximum - source.marking.displayRangeMl.minimum) / (source.marking.minorIntervalMl ?? source.marking.majorIntervalMl));
      const majorCount = Math.round((source.marking.displayRangeMl.maximum - source.marking.displayRangeMl.minimum) / source.marking.majorIntervalMl) + 1;
      const master = await readAsset(asset.assetId, "master");
      const scene = await readAsset(asset.assetId, "scene");
      const preview = await readAsset(asset.assetId, "preview");
      const thumbnail = await readAsset(asset.assetId, "thumbnail");
      expect(markingValues(master)).toHaveLength(asset.assetId.includes("alkali") ? 11 : asset.assetId.includes("beaker") ? expectedCount + 1 : 26);
      expect(markingValues(scene).length).toBeGreaterThanOrEqual(majorCount);
      expect(markingValues(preview).length).toBeGreaterThan(0);
      expect(markingValues(thumbnail)).toHaveLength(0);
      expect(master).toContain(asset.familyId === "burette"
        ? '<g data-layer="scale" data-part="burette.scale-on-tube"'
        : '<g data-layer="scale" data-part="vessel.scale"');
      if (asset.familyId === "burette") expect(layer(master, "scale")).toContain(`data-marking-value-ml=\"0\"`);
    }
  });

  it("keeps family mechanisms continuous and removes scene/QA overlays from standalone LODs", async () => {
    const manifest = await readManifest();
    for (const asset of manifest.assets) {
      for (const lod of lods) {
        const svg = await readAsset(asset.assetId, lod);
        expect(svg).not.toContain('data-layer="shadow"');
        expect(svg).not.toContain('data-layer="construction-detail"');
        expect(svg).not.toContain('data-layer="base"');
        expect(svg).not.toContain('data-layer="contact-base"');
        expect(svg).not.toContain('data-layer="hardware"');
        expect(svg).not.toContain('data-part="vessel.contact-foot"');
        expect(svg).not.toMatch(/#(?:8ebbc2|9bc5c8|a9cbd0|a7c5cd|6f9ba2|71969a|72969a|628b94)/i);
        expect(visibleLayer(svg, "support-interface")).toBe(false);
        expect(visibleLayer(svg, "detachable")).toBe(false);
        if (asset.familyId === "burette") {
          if (asset.assetId.includes("acid")) {
            expect(svg).toContain("-ptfe");
            expect(svg).not.toContain("-rubber");
          } else {
            expect(svg).toContain("-rubber");
            expect(svg).not.toContain("-ptfe");
          }
        } else {
          expect(svg).not.toContain("-ptfe");
          expect(svg).not.toContain("-rubber");
        }
      }
      if (asset.familyId !== "burette") continue;
      const svg = await readAsset(asset.assetId, "master");
      const flowNodes = [...svg.matchAll(/data-flow-node="([^"]+)"/g)].map((match) => match[1]);
      expect(flowNodes.at(-1)).toBe("outlet-tip");
      if (asset.assetId.includes("alkali")) {
        expect(flowNodes.filter((node) => node === "glass-bead")).toHaveLength(1);
        expect(flowNodes).toEqual(expect.arrayContaining(["lower-connector", "rubber-tube", "glass-bead", "pinch-region"]));
        expect(svg.match(/data-layer="glass-bead"/g)).toHaveLength(1);
      } else {
        expect(flowNodes).toEqual(expect.arrayContaining(["stopcock", "outlet-tip"]));
        expect(svg).toContain('data-layer="stopcock"');
        expect(svg).toContain('data-layer="stopcock-key"');
      }
      const scene = await readAsset(asset.assetId, "scene");
      const preview = await readAsset(asset.assetId, "preview");
      const thumbnail = await readAsset(asset.assetId, "thumbnail");
      expect(scene).toContain('data-lod="scene"');
      expect(preview).toContain('data-lod="preview"');
      expect(thumbnail).toContain('data-lod="thumbnail"');
      expect(visibleLayer(scene, "scale")).toBe(asset.familyId === "burette");
      expect(visibleLayer(preview, "scale")).toBe(asset.familyId === "burette");
    }
  });

  it("uses semantic LOD declarations and one physical comparison scale", async () => {
    const manifest = await readManifest();
    const physical = await readFile(new URL(manifest.comparisonSheets[0]!, packageRoot), "utf8");
    const normalized = await readFile(new URL(manifest.comparisonSheets[1]!, packageRoot), "utf8");
    expect(attr(physical, "data-mm-to-px")).toBe("1");
    expect(physical).toContain("COMMON SCALE 1 px/mm");
    expect(normalized).toContain("changed geometry parameters");
    expect(normalized).toContain('data-review-mode="visual-only"');
    const physicalScales = [...physical.matchAll(/data-mm-to-px="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(physicalScales)).toEqual(new Set(["1"]));
    const sheetWidth = Number(attr(physical, "viewBox").split(" ")[2]);
    for (const match of physical.matchAll(/<svg x="([^"]+)"[^>]*width="([^"]+)"[^>]*data-source-asset-id="([^"]+)"/g)) {
      const x = Number(match[1]);
      const width = Number(match[2]);
      expect(x + width, `${match[3]} is clipped by physical comparison sheet`).toBeLessThanOrEqual(sheetWidth);
    }
    for (const asset of manifest.assets) {
      expect(physical).toContain(`data-source-asset-id="${asset.assetId}"`);
      expect(normalized).toContain(`data-source-asset-id="${asset.assetId}"`);
      for (const lod of lods) {
        const svg = await readAsset(asset.assetId, lod);
        const declared = asset.lodVisibility[lod];
        expect(declared).toBeDefined();
        if (lod === "thumbnail") expect(markingValues(svg)).toHaveLength(0);
      }
    }
  });

  it("keeps package state and fixture records bounded and self-contained", async () => {
    const manifest = await readManifest();
    const states = JSON.parse(await readFile(new URL(manifest.statePackage.manifest, packageRoot), "utf8")) as { readonly variants: readonly { readonly id: string; readonly visibleLayers: readonly string[] }[]; readonly assets: readonly { readonly assetId: string; readonly supportedVariants: readonly string[] }[] };
    const fixture = JSON.parse(await readFile(new URL(manifest.deterministicFixture, packageRoot), "utf8")) as { readonly fixtureId: string; readonly assetIds: readonly string[]; readonly backgrounds: readonly string[]; readonly lods: readonly string[] };
    expect(states.variants.map((variant) => variant.id)).toEqual(["empty", "filled", "connected"]);
    expect(states.variants.flatMap((variant) => variant.visibleLayers)).not.toEqual(expect.arrayContaining(["shadow", "hardware", "support-interface"]));
    expect(fixture.fixtureId).toBe("m6-gold-master-static-review");
    expect(fixture.assetIds).toEqual(manifest.assets.map((asset) => asset.assetId));
    expect(fixture.backgrounds).toEqual(["dark-neutral", "light-neutral"]);
    expect(fixture.lods).toEqual([...lods]);
    expect(APPARATUS_CATALOG.specifications.filter((specification) => expectedAssets.includes(specification.specificationId))).toHaveLength(expectedAssets.length);
  });
});
