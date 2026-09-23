import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(repositoryRoot, "assets/apparatus/masters/beaker-250ml/source/visual-body/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const construction = JSON.parse(await readFile(resolve(repositoryRoot, "packages/render/src/assets/gold-master-construction.json"), "utf8"));
const outputRoot = resolve(dirname(manifestPath), "runtime");
await mkdir(outputRoot, { recursive: true });

const manifestBytes = await readFile(manifestPath);
const sourceManifestSha256 = `sha256:${createHash("sha256").update(manifestBytes).digest("hex")}`;

const width = manifest.body.widthPx;
const height = manifest.body.heightPx;
const region = manifest.coordinateContract.graduationRegion;
const topY = region.topY * height;
const bottomY = region.bottomY * height;
const clipTopY = region.clipTopY * height;
const clipBottomY = region.clipBottomY * height;
const startX = region.xStart * width;
const endX = region.xEnd * width;
const labelX = region.labelX * width;
const clipLeft = region.clipLeft * width;
const clipRight = region.clipRight * width;
const anchors = manifest.coordinateContract.anchors;
const rimY = anchors.rimTop[1] * height;
const cavityTopY = anchors.cavityTop[1] * height;
const cavityBottomY = anchors.cavityBottom[1] * height;
const contactY = anchors.contactBase[1] * height;
if (!(clipTopY > rimY && clipTopY < topY && bottomY < clipBottomY && clipBottomY < contactY && topY < bottomY)) {
  throw new Error("graduation region must stay between the rim and contact base");
}
if (!(clipLeft <= startX && endX <= labelX && labelX < clipRight)) {
  throw new Error("graduation region must keep ticks and labels inside its clip box");
}
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
  <defs><clipPath id="graduation-region" data-label-clip="endpoint-safe"><rect x="${clipLeft.toFixed(2)}" y="${clipTopY.toFixed(2)}" width="${(clipRight - clipLeft).toFixed(2)}" height="${(clipBottomY - clipTopY).toFixed(2)}" rx="12"/></clipPath></defs>
  <g clip-path="url(#graduation-region)">
    <g fill="none" stroke="#304247" stroke-width="3" stroke-linecap="round">
${graduationLines.replaceAll(/<text[^>]*>.*?<\/text>/g, "")}
    </g>
    <g fill="#304247" font-family="system-ui, sans-serif" font-size="26" text-anchor="start">
${graduationLines.match(/<text[^>]*>.*?<\/text>/g)?.map((line) => `    ${line}`).join("\n") ?? ""}
      <text x="${(region.xStart * width).toFixed(2)}" y="${(topY + 32).toFixed(2)}" font-size="20">approx. mL</text>
    </g>
  </g>
</svg>
`;

const interiorLeft = 0.23 * width;
const interiorRight = 0.85 * width;
if (!(rimY < cavityTopY && cavityTopY < cavityBottomY && cavityBottomY < contactY)) {
  throw new Error("cavity contract must stay between the rim and contact base");
}
if (!(cavityTopY < topY && bottomY < cavityBottomY)) {
  throw new Error("graduation region must stay inside the cavity contract");
}
const interiorTop = cavityTopY;
const interiorBottom = cavityBottomY;
const radius = 32;
const maskBody = `M ${interiorLeft.toFixed(2)} ${(interiorTop + radius).toFixed(2)} Q ${interiorLeft.toFixed(2)} ${interiorTop.toFixed(2)} ${(interiorLeft + radius).toFixed(2)} ${interiorTop.toFixed(2)} H ${(interiorRight - radius).toFixed(2)} Q ${interiorRight.toFixed(2)} ${interiorTop.toFixed(2)} ${interiorRight.toFixed(2)} ${(interiorTop + radius).toFixed(2)} V ${(interiorBottom - radius).toFixed(2)} Q ${interiorRight.toFixed(2)} ${interiorBottom.toFixed(2)} ${(interiorRight - radius).toFixed(2)} ${interiorBottom.toFixed(2)} H ${(interiorLeft + radius).toFixed(2)} Q ${interiorLeft.toFixed(2)} ${interiorBottom.toFixed(2)} ${interiorLeft.toFixed(2)} ${(interiorBottom - radius).toFixed(2)} Z`;

const mask = (layer, description) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" data-asset-id="${manifest.assetId}" data-layer="${layer}" data-mask-source="cavity-contract" data-mask-top-y="${cavityTopY.toFixed(2)}" data-mask-bottom-y="${cavityBottomY.toFixed(2)}" data-calibration-status="provisional-visual-calibration">
  <title>${layer}</title>
  <desc>${description}</desc>
  <path d="${maskBody}" fill="#ffffff"/>
</svg>
`;

await writeFile(resolve(outputRoot, "graduations.svg"), graduations, "utf8");
await writeFile(resolve(outputRoot, "interior-mask.svg"), mask("interior-mask", "Provisional visual cavity mask; not measurement geometry."), "utf8");
await writeFile(resolve(outputRoot, "liquid-mask.svg"), mask("liquid-mask", "Provisional clipping mask only; liquid height must still come from a validated VolumeProfileSnapshot."), "utf8");

const normalizeBoundary = (points) => points.map((point) => ({
  x: Number((point.x / width).toFixed(8)),
  y: Number((point.y / height).toFixed(8)),
}));
const visualCalibration = {
  schemaVersion: 1,
  assetId: manifest.assetId,
  sourceManifest: "assets/apparatus/masters/beaker-250ml/source/visual-body/manifest.json",
  sourceManifestSha256,
  status: "provisional-visual-calibration",
  measurementUse: "forbidden",
  cavity: {
    topY: anchors.cavityTop[1],
    bottomY: anchors.cavityBottom[1],
    leftWall: normalizeBoundary(manifest.liquidVisualGeometry.sideBoundary.left),
    rightWall: normalizeBoundary(manifest.liquidVisualGeometry.sideBoundary.right),
    surface: {
      kind: manifest.liquidVisualGeometry.surface.kind,
      depth: Number((manifest.liquidVisualGeometry.surface.depthPx / height).toFixed(8)),
    },
  },
};
await writeFile(
  resolve(repositoryRoot, "packages/render/src/assets/beaker-visual-calibration.json"),
  `${JSON.stringify(visualCalibration, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  status: "PASS",
  assetId: manifest.assetId,
  generated: ["runtime/graduations.svg", "runtime/interior-mask.svg", "runtime/liquid-mask.svg", "packages/render/src/assets/beaker-visual-calibration.json"],
  calibration: "provisional-visual-calibration",
  scientificProfile: "not-generated",
}, null, 2));
