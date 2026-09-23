import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(repositoryRoot, "assets/apparatus/masters/beaker-250ml/source/visual-body/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const construction = JSON.parse(await readFile(resolve(repositoryRoot, "packages/render/src/assets/gold-master-construction.json"), "utf8"));
const outputRoot = resolve(dirname(manifestPath), "runtime");
await mkdir(outputRoot, { recursive: true });

const width = manifest.body.widthPx;
const height = manifest.body.heightPx;
const [, cavityTopY] = manifest.coordinateContract.anchors.cavityTop;
const [, cavityBottomY] = manifest.coordinateContract.anchors.cavityBottom;
const region = manifest.coordinateContract.graduationRegion;
const topY = cavityTopY * height;
const bottomY = cavityBottomY * height;
const startX = region.xStart * width;
const endX = region.xEnd * width;
const labelX = region.labelX * width;
const beaker = construction.specifications.find((record) => record.specificationId === manifest.specificationId);
const marking = beaker?.marking;
if (marking?.kind !== "approximate-contained") throw new Error("beaker source marking must be approximate-contained");
const values = [];
for (let value = marking.displayRangeMl.minimum; value <= marking.displayRangeMl.maximum; value += marking.majorIntervalMl) {
  values.push(value);
}
const minimum = values[0];
const maximum = values[values.length - 1];
const yFor = (value) => bottomY - ((value - minimum) / (maximum - minimum)) * (bottomY - topY);
const escaped = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");

const graduationLines = values.map((value) => {
  const y = yFor(value).toFixed(2);
  return `  <g data-marking-value-ml="${value}"><path d="M ${startX.toFixed(2)} ${y} H ${endX.toFixed(2)}"/><text x="${labelX.toFixed(2)}" y="${(Number(y) + 6).toFixed(2)}">${escaped(value)}</text></g>`;
}).join("\n");

const graduations = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" data-asset-id="${manifest.assetId}" data-layer="graduations" data-marking-kind="approximate-contained" data-calibration-status="provisional-visual-calibration" role="img" aria-label="Approximate contained-volume graduations; runtime layer only">
  <title>Approximate contained-volume graduations</title>
  <desc>Generated from the existing approximate-contained marking contract. This layer is not analytical measurement evidence.</desc>
  <g fill="none" stroke="#304247" stroke-width="3" stroke-linecap="round">
${graduationLines.replaceAll(/<text[^>]*>.*?<\/text>/g, "")}
  </g>
  <g fill="#304247" font-family="system-ui, sans-serif" font-size="26" text-anchor="start">
${graduationLines.match(/<text[^>]*>.*?<\/text>/g)?.map((line) => `    ${line}`).join("\n") ?? ""}
    <text x="${(region.xStart * width).toFixed(2)}" y="${(topY - 18).toFixed(2)}" font-size="20">approx. mL</text>
  </g>
</svg>
`;

const interiorLeft = 0.23 * width;
const interiorRight = 0.85 * width;
const interiorTop = topY;
const interiorBottom = bottomY;
const radius = 32;
const maskBody = `M ${interiorLeft.toFixed(2)} ${(interiorTop + radius).toFixed(2)} Q ${interiorLeft.toFixed(2)} ${interiorTop.toFixed(2)} ${(interiorLeft + radius).toFixed(2)} ${interiorTop.toFixed(2)} H ${(interiorRight - radius).toFixed(2)} Q ${interiorRight.toFixed(2)} ${interiorTop.toFixed(2)} ${interiorRight.toFixed(2)} ${(interiorTop + radius).toFixed(2)} V ${(interiorBottom - radius).toFixed(2)} Q ${interiorRight.toFixed(2)} ${interiorBottom.toFixed(2)} ${(interiorRight - radius).toFixed(2)} ${interiorBottom.toFixed(2)} H ${(interiorLeft + radius).toFixed(2)} Q ${interiorLeft.toFixed(2)} ${interiorBottom.toFixed(2)} ${interiorLeft.toFixed(2)} ${(interiorBottom - radius).toFixed(2)} Z`;

const mask = (layer, description) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" data-asset-id="${manifest.assetId}" data-layer="${layer}" data-calibration-status="provisional-visual-calibration">
  <title>${layer}</title>
  <desc>${description}</desc>
  <path d="${maskBody}" fill="#ffffff"/>
</svg>
`;

await writeFile(resolve(outputRoot, "graduations.svg"), graduations, "utf8");
await writeFile(resolve(outputRoot, "interior-mask.svg"), mask("interior-mask", "Provisional visual cavity mask; not measurement geometry."), "utf8");
await writeFile(resolve(outputRoot, "liquid-mask.svg"), mask("liquid-mask", "Provisional clipping mask only; liquid height must still come from a validated VolumeProfileSnapshot."), "utf8");

console.log(JSON.stringify({
  status: "PASS",
  assetId: manifest.assetId,
  generated: ["runtime/graduations.svg", "runtime/interior-mask.svg", "runtime/liquid-mask.svg"],
  calibration: "provisional-visual-calibration",
  scientificProfile: "not-generated",
}, null, 2));
