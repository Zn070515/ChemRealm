#!/usr/bin/env node
/**
 * Check that each first-wave manual master is a complete, candidate-scoped
 * package before the more specific instrument and geometry audits run.
 *
 * This is a package-completeness check, not visual approval.
 */

import { readFile, readdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const failures = [];
const fail = (message) => failures.push(message);
const read = (relativePath) => readFile(new URL(relativePath, root), "utf8");
const readJson = async (relativePath) => JSON.parse(await read(relativePath));
const requiredMasterFiles = ["master.svg", "source-record.md", "measurement-sheet.json", "review.md"];
const requiredLods = ["master", "scene", "preview", "thumbnail"];

const [source, manifest, versions] = await Promise.all([
  readJson("packages/render/src/assets/gold-master-construction.json"),
  readJson("assets/apparatus/catalog/gold-master/manifest.json"),
  readJson("contracts/version-manifest.json"),
]);

const masterRoot = new URL("assets/apparatus/masters/", root);
const manualMasters = new Map();
for (const entry of await readdir(masterRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const base = new URL(`${entry.name}/`, masterRoot);
  let svg;
  try {
    svg = await read(`assets/apparatus/masters/${entry.name}/master.svg`);
  } catch {
    fail(`${entry.name}: master.svg is missing`);
    continue;
  }
  const assetId = svg.match(/data-asset-id="([^"]+)"/)?.[1];
  if (assetId === undefined) {
    fail(`${entry.name}: master.svg has no asset identity`);
    continue;
  }
  manualMasters.set(assetId, { directory: entry.name, base, svg });
}

const sourceIds = source.specifications
  .filter((record) => manualMasters.has(record.specificationId))
  .map((record) => record.specificationId);

if (manualMasters.size !== sourceIds.length || sourceIds.length !== 4) {
  fail("the package must contain exactly four manual masters paired with source records");
}
if (JSON.stringify(manifest.assets.map((asset) => asset.assetId)) !== JSON.stringify(sourceIds)) {
  fail("generated manifest order/identity must match the manual source records");
}
if (manifest.status !== "gold-master-candidate") fail("generated package must remain candidate-scoped");
if (manifest.schemaVersion !== versions.representation.apparatusGoldMasterPackage) {
  fail("generated package schema version must come from the central version manifest");
}

for (const assetId of sourceIds) {
  const master = manualMasters.get(assetId);
  for (const file of requiredMasterFiles) {
    try { await readFile(new URL(file, master.base)); } catch { fail(`${assetId}: missing ${file}`); }
  }
  const asset = manifest.assets.find((candidate) => candidate.assetId === assetId);
  if (asset?.assetStatus !== "candidate") fail(`${assetId}: manifest status must be candidate`);
  for (const lod of requiredLods) {
    try { await read(`assets/apparatus/catalog/gold-master/${assetId}/${lod}.svg`); } catch {
      fail(`${assetId}: generated ${lod}.svg is missing`);
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  console.log("\nRESULT: FAIL");
  process.exit(1);
}

console.log("ok    four manual masters have complete sidecars and generated LOD packages");
console.log("ok    generated package identity/version/status match the central source");
console.log("ok    package completeness is checked separately from visual acceptance");
console.log("\nRESULT: PASS");
