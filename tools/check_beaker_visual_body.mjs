import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(repositoryRoot, "assets/apparatus/masters/beaker-250ml/source/visual-body/manifest.json");
const manifestBytes = await readFile(manifestPath);
const manifest = JSON.parse(manifestBytes.toString("utf8"));
const failures = [];

const fail = (message) => failures.push(message);
const relative = (path) => resolve(repositoryRoot, path);
const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

if (manifest.assetId !== "beaker-250ml") fail("visual body must retain the existing beaker asset identity");
if (manifest.status !== "visual-body-candidate") fail("visual body must remain candidate-scoped");
if (manifest.admission !== "not-gold-master") fail("visual body must not claim Gold Master admission");
if (manifest.body?.alpha !== "required") fail("body alpha is required");
if (manifest.body?.excludes?.includes("graduations") !== true) fail("graduations must not be baked into the body");
if (manifest.runtimeLayers?.liquid?.profileGeneratedByThisAsset !== false) fail("body must not generate a scientific profile");

const bodyPath = resolve(dirname(manifestPath), manifest.body.path);
const bodyBytes = await readFile(bodyPath);
if (sha256(bodyBytes) !== manifest.body.sha256) fail("body.png SHA-256 does not match manifest");

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
if (!bodyBytes.subarray(0, 8).equals(pngSignature)) fail("body must be a PNG");
const ihdrLength = bodyBytes.readUInt32BE(8);
const ihdrType = bodyBytes.subarray(12, 16).toString("ascii");
if (ihdrLength !== 13 || ihdrType !== "IHDR") fail("body PNG must contain a valid IHDR");
const width = bodyBytes.readUInt32BE(16);
const height = bodyBytes.readUInt32BE(20);
const bitDepth = bodyBytes[24];
const colorType = bodyBytes[25];
const interlaceMethod = bodyBytes[28];
if (width !== manifest.body.widthPx || height !== manifest.body.heightPx) fail("body dimensions do not match manifest");
if (bitDepth !== 8 || colorType !== 6 || interlaceMethod !== 0) fail("body PNG must be non-interlaced 8-bit RGBA");

const idatParts = [];
let offset = 8;
while (offset + 12 <= bodyBytes.length) {
  const length = bodyBytes.readUInt32BE(offset);
  const type = bodyBytes.subarray(offset + 4, offset + 8).toString("ascii");
  const dataStart = offset + 8;
  const dataEnd = dataStart + length;
  if (type === "IDAT") idatParts.push(bodyBytes.subarray(dataStart, dataEnd));
  offset = dataEnd + 4;
  if (type === "IEND") break;
}
if (idatParts.length === 0) fail("body PNG has no IDAT data");
const inflated = inflateSync(Buffer.concat(idatParts));
const rowBytes = width * 4;
const expectedInflatedLength = height * (rowBytes + 1);
if (inflated.length !== expectedInflatedLength) fail("body PNG scanline data is unexpected");
let previous = Buffer.alloc(rowBytes);
let alphaMin = 255;
let alphaMax = 0;
let transparentPixelCount = 0;
for (let y = 0; y < height; y += 1) {
  const filter = inflated[y * (rowBytes + 1)];
  const current = Buffer.from(inflated.subarray(y * (rowBytes + 1) + 1, (y + 1) * (rowBytes + 1)));
  for (let x = 0; x < rowBytes; x += 1) {
    const left = x >= 4 ? current[x - 4] : 0;
    const up = previous[x];
    const upLeft = x >= 4 ? previous[x - 4] : 0;
    if (filter === 1) current[x] = (current[x] + left) & 0xff;
    else if (filter === 2) current[x] = (current[x] + up) & 0xff;
    else if (filter === 3) current[x] = (current[x] + Math.floor((left + up) / 2)) & 0xff;
    else if (filter === 4) {
      const p = left + up - upLeft;
      const pa = Math.abs(p - left);
      const pb = Math.abs(p - up);
      const pc = Math.abs(p - upLeft);
      const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      current[x] = (current[x] + predictor) & 0xff;
    } else if (filter !== 0) fail(`unsupported PNG filter ${filter}`);
  }
  for (let x = 3; x < rowBytes; x += 4) {
    const alpha = current[x];
    alphaMin = Math.min(alphaMin, alpha);
    alphaMax = Math.max(alphaMax, alpha);
    if (alpha === 0) transparentPixelCount += 1;
  }
  previous = current;
}
if (manifest.body.transparentBackground !== true) fail("transparentBackground must be declared");
if (alphaMin !== 0 || alphaMax !== 255 || transparentPixelCount === 0) {
  fail("body PNG must contain both transparent and opaque alpha samples");
}

const calibrationPath = resolve(repositoryRoot, "packages/render/src/assets/beaker-visual-calibration.json");
try {
  const calibration = JSON.parse(await readFile(calibrationPath, "utf8"));
  if (calibration.assetId !== manifest.assetId) fail("generated visual calibration has the wrong asset identity");
  if (calibration.sourceManifestSha256 !== sha256(manifestBytes)) fail("generated visual calibration is stale for the source manifest");
  if (calibration.status !== "provisional-visual-calibration" || calibration.measurementUse !== "forbidden") {
    fail("generated visual calibration must remain provisional and non-measurement");
  }
} catch (error) {
  if (error instanceof SyntaxError) fail("generated visual calibration is not valid JSON");
  else fail("missing generated visual calibration artifact");
}

for (const output of [
  manifest.runtimeLayers.graduations.generatedArtifact,
  manifest.runtimeLayers.liquid.interiorMaskArtifact,
  manifest.runtimeLayers.liquid.maskArtifact,
  manifest.runtimeLayers.liquid.prototypeGeometryArtifact,
]) {
  try {
    const content = await readFile(resolve(dirname(manifestPath), output), "utf8");
    if (!content.includes(`data-asset-id="${manifest.assetId}"`)) fail(`${output} has the wrong asset identity`);
    if (!content.includes("provisional-visual-calibration")) fail(`${output} must remain provisional until anchor review`);
    if (output.endsWith("interior-mask.svg") || output.endsWith("liquid-mask.svg")) {
      const cavityTopY = manifest.coordinateContract.anchors.cavityTop[1] * manifest.body.heightPx;
      const cavityBottomY = manifest.coordinateContract.anchors.cavityBottom[1] * manifest.body.heightPx;
      if (!content.includes('data-mask-source="cavity-contract"')) fail(`${output} must declare the cavity contract as its source`);
      if (!content.includes(`data-mask-top-y="${cavityTopY.toFixed(2)}"`)) fail(`${output} must use the cavity top anchor, not the graduation region`);
      if (!content.includes(`data-mask-bottom-y="${cavityBottomY.toFixed(2)}"`)) fail(`${output} must use the cavity bottom anchor, not the graduation region`);
    }
    if (output.endsWith("liquid-visual-geometry.svg")) {
      if (!content.includes('data-status="prototype-only"')) fail(`${output} must remain prototype-only`);
      if (!content.includes("<path")) fail(`${output} must retain an inspectable prototype path`);
    }
  } catch {
    fail(`missing generated runtime layer: ${output}`);
  }
}

const layerManifestPath = resolve(dirname(manifestPath), "runtime/layer-manifest.json");
try {
  const layerManifestBytes = await readFile(layerManifestPath);
  const layerManifest = JSON.parse(layerManifestBytes.toString("utf8"));
  if (layerManifest.assetId !== manifest.assetId) fail("layer manifest has the wrong asset identity");
  if (layerManifest.status !== "provisional-layered-compositor") fail("layer manifest must remain provisional");
  if (layerManifest.measurementUse !== "forbidden") fail("layer manifest must remain non-measurement");
  if (layerManifest.sourceManifestSha256 !== sha256(manifestBytes)) fail("layer manifest source manifest hash is stale");
  if (!layerManifest.roles?.backBody || !layerManifest.roles?.frontDetail || !layerManifest.roles?.liquidResponse || !layerManifest.roles?.surfaceResponse) {
    fail("layer manifest must declare back body, front detail, liquid response and surface response roles");
  }
  const frontDetailPath = resolve(dirname(manifestPath), layerManifest.roles.frontDetail.path);
  const frontDetailBytes = await readFile(frontDetailPath);
  const frontDetail = frontDetailBytes.toString("utf8");
  if (layerManifest.roles.frontDetail.sha256 !== sha256(frontDetailBytes)) fail("front detail hash does not match layer manifest");
  const calibrationBytes = await readFile(resolve(repositoryRoot, "packages/render/src/assets/beaker-visual-calibration.json"));
  if (layerManifest.calibrationSha256 !== sha256(calibrationBytes)) fail("layer manifest calibration hash is stale");
  if (!frontDetail.includes(`data-asset-id="${manifest.assetId}"`)) fail("front detail has the wrong asset identity");
  if (!frontDetail.includes('data-layer="glass-front-detail"')) fail("front detail has the wrong layer identity");
  if (!frontDetail.includes("provisional-visual-calibration")) fail("front detail must remain provisional");
} catch (error) {
  if (error instanceof SyntaxError) fail("layer manifest is not valid JSON");
  else fail("missing or invalid layered compositor manifest");
}

for (const [name, input] of Object.entries(manifest.engineeringSources ?? {})) {
  if (name === "centralVersionManifest") continue;
  const inputBytes = await readFile(relative(input.path));
  if (sha256(inputBytes) !== input.sha256) fail(`${name} source hash does not match manifest`);
}

const [minX, minY, maxX, maxY] = manifest.coordinateContract.alphaBoundsPx;
if (!(0 <= minX && minX < maxX && maxX < width && 0 <= minY && minY < maxY && maxY < height)) {
  fail("alpha bounds are invalid for the body image");
}
for (const [name, point] of Object.entries(manifest.coordinateContract.anchors ?? {})) {
  if (!Array.isArray(point) || point.length !== 2 || point.some((value) => typeof value !== "number" || value < 0 || value > 1)) {
    fail(`anchor ${name} must be a normalized [0,1] point`);
  }
}
const region = manifest.coordinateContract.graduationRegion;
const rimY = manifest.coordinateContract.anchors.rimTop[1];
const contactY = manifest.coordinateContract.anchors.contactBase[1];
if (!(region.clipTopY > rimY && region.clipTopY < region.topY && region.bottomY < region.clipBottomY && region.clipBottomY < contactY && region.topY < region.bottomY)) {
  fail("graduation region must leave endpoint-label clearance from rim and contact base");
}
if (!(region.clipLeft <= region.xStart && region.xEnd <= region.labelX && region.labelX < region.clipRight)) {
  fail("graduation region clip box must contain ticks and labels");
}

if (failures.length > 0) {
  console.error(JSON.stringify({ status: "FAIL", checks: failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    status: "PASS",
    assetId: manifest.assetId,
    body: {
      path: "assets/apparatus/masters/beaker-250ml/source/visual-body/body.png",
      width,
      height,
      bitDepth,
      colorType,
      alpha: { min: alphaMin, max: alphaMax, transparentPixelCount },
      sha256: manifest.body.sha256,
    },
    admission: manifest.admission,
    profileBoundary: "deferred",
    runtimeLayers: ["graduations", "liquid", "stateEffects"],
  }, null, 2));
}
