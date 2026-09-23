import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildUprightLiquidGeometry } from "./beaker_liquid_visual_geometry.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(repositoryRoot, "assets/apparatus/masters/beaker-250ml/source/visual-body/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const geometry = manifest.liquidVisualGeometry;
if (geometry?.status !== "prototype-visual-calibration") throw new Error("liquid geometry must remain prototype-only");
const width = manifest.body.widthPx;
const height = manifest.body.heightPx;
const region = manifest.coordinateContract.graduationRegion;
const volumeToVisualY = (volumeMl) => {
  const fraction = (volumeMl - 25) / (200 - 25);
  return (region.bottomY - fraction * (region.bottomY - region.topY)) * height;
};
const fixtures = [25, 100, 200].map((volumeMl) => ({
  volumeMl,
  heightY: volumeToVisualY(volumeMl),
  geometry: buildUprightLiquidGeometry({ geometry, surfaceY: volumeToVisualY(volumeMl) }),
}));
const escaped = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
const fixtureGroups = fixtures.map(({ volumeMl, heightY, geometry: liquid }) => `
  <g data-visual-volume-ml="${volumeMl}" data-height-source="${geometry.heightSource}">
    <path data-layer="liquid-body" d="${liquid.liquidBodyPath}" fill="#1268a8" fill-opacity="0.76"/>
    <path data-layer="rear-meniscus" d="${liquid.rearMeniscusPath}" fill="none" stroke="#b9e7ff" stroke-width="5" stroke-linecap="round" opacity="0.85"/>
    <path data-layer="surface" d="${liquid.surfacePath}" fill="#62bce6" fill-opacity="0.28" stroke="#d1f3ff" stroke-width="2"/>
    <path data-layer="front-meniscus" d="${liquid.frontMeniscusPath}" fill="none" stroke="#0b416d" stroke-width="4" stroke-linecap="round" opacity="0.65"/>
    <text x="${(width * 0.07).toFixed(2)}" y="${(height * 0.09 + volumeMl * 0.02).toFixed(2)}" fill="#174e72" font-family="system-ui, sans-serif" font-size="24">${escaped(`${volumeMl} mL visual fixture`)}</text>
    <title>${volumeMl} mL visual geometry fixture at y=${heightY.toFixed(2)}; not a scientific h(V) result</title>
  </g>`).join("\n");
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" data-asset-id="${manifest.assetId}" data-layer="liquid-visual-geometry-spike" data-status="prototype-only" data-calibration-status="provisional-visual-calibration" data-height-source="${geometry.heightSource}">
  <title>Upright liquid visual geometry spike</title>
  <desc>Hand-authored cavity outline and perspective surface study. No scientific liquid colour or h(V) result is encoded.</desc>
  <defs><clipPath id="authored-cavity-outline"><path d="${geometry.cavityOutline.path}"/></clipPath></defs>
  <g clip-path="url(#authored-cavity-outline)">${fixtureGroups}
  </g>
  <path data-layer="cavity-outline-review" d="${geometry.cavityOutline.path}" fill="none" stroke="#8a3d2f" stroke-width="3" stroke-dasharray="10 8" opacity="0.8"/>
</svg>
`;
const outputPath = resolve(dirname(manifestPath), "runtime/liquid-visual-geometry.svg");
await writeFile(outputPath, svg, "utf8");
console.log(JSON.stringify({ status: "PASS", output: outputPath, fixtures: [25, 100, 200], scientificProfile: "not-generated" }, null, 2));
