#!/usr/bin/env node
/**
 * Render Geometry Audit for the M6 candidate package.
 *
 * This checks master-to-LOD identity and bounds. It does not judge artistic
 * quality, lighting, or whether the source measurements are correct.
 */

import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("assets/apparatus/catalog/gold-master/manifest.json", root), "utf8"));
const failures = [];
const lods = ["master", "scene", "preview", "thumbnail"];
const read = (relativePath) => readFile(new URL(relativePath, root), "utf8");
const fail = (message) => failures.push(message);

function layerNames(svg) {
  return new Set([...svg.matchAll(/<g data-layer="([^"]+)"/g)].map((match) => match[1]));
}

function attribute(svg, name) {
  return svg.match(new RegExp(`${name}="([^"]+)"`))?.[1];
}

function markingValues(svg) {
  return [...svg.matchAll(/data-marking-value-ml="([^\"]+)"/g)].map((match) => match[1]);
}

for (const asset of manifest.assets) {
  const masterPath = `assets/apparatus/catalog/gold-master/${asset.assetId}/master.svg`;
  let master;
  try { master = await read(masterPath); } catch { fail(`${asset.assetId}: master LOD is missing`); continue; }
  const masterLayers = layerNames(master);
  const masterViewBox = attribute(master, "viewBox");
  const masterMarkingValues = markingValues(master);
  for (const lod of lods) {
    const path = `assets/apparatus/catalog/gold-master/${asset.assetId}/${lod}.svg`;
    let svg;
    try { svg = await read(path); } catch { fail(`${asset.assetId}/${lod}: LOD is missing`); continue; }
    if (attribute(svg, "viewBox") !== masterViewBox) fail(`${asset.assetId}/${lod}: viewBox changed from master`);
    if (attribute(svg, "data-dimensions-mm") !== attribute(master, "data-dimensions-mm")) fail(`${asset.assetId}/${lod}: physical dimensions changed from master`);
    if (attribute(svg, "data-body-dimensions-mm") !== attribute(master, "data-body-dimensions-mm")) fail(`${asset.assetId}/${lod}: body envelope changed from master`);
    if (attribute(svg, "data-asset-id") !== asset.assetId) fail(`${asset.assetId}/${lod}: asset identity changed`);
    if (attribute(svg, "data-lod") !== lod) fail(`${asset.assetId}/${lod}: LOD identity is missing`);
    const declaredLayers = (attribute(svg, "data-lod-visible-roles") ?? "").split("|").filter(Boolean);
    const actualLayers = layerNames(svg);
    for (const layerName of actualLayers) {
      if (!masterLayers.has(layerName)) fail(`${asset.assetId}/${lod}: compiler introduced layer ${layerName}`);
    }
    for (const layerName of declaredLayers) {
      if (!masterLayers.has(layerName) || !actualLayers.has(layerName)) fail(`${asset.assetId}/${lod}: declared layer ${layerName} is not present`);
    }
    const values = markingValues(svg);
    for (const value of values) {
      if (!masterMarkingValues.includes(value)) fail(`${asset.assetId}/${lod}: marking value ${value} was not present in master`);
    }
    if (lod === "thumbnail" && values.length > 0) fail(`${asset.assetId}/thumbnail: thumbnail contains measurement marks`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  console.log("\nRESULT: FAIL");
  process.exit(1);
}

console.log("ok    every LOD preserves master identity, physical envelope, and marking provenance");
console.log("ok    compiler output contains only master-declared layers and marking values");
console.log("ok    thumbnail output does not expose measurement marks");
console.log("\nRESULT: PASS");
