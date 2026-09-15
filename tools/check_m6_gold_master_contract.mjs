#!/usr/bin/env node
/**
 * Verify the bounded M6 Gold Master candidate package and its evidence boundary.
 *
 * This is a structural/source-of-truth guard. It is deliberately not a visual
 * quality proof and must never promote a candidate package to M6 S3.
 */

import { readFile, readdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const failures = [];
const lods = ["master", "scene", "preview", "thumbnail"];

const read = (relativePath) => readFile(new URL(relativePath, root), "utf8");
const readJson = async (relativePath) => JSON.parse(await read(relativePath));
const requireText = (condition, message) => { if (!condition) failures.push(message); };

const [source, manifest, versionManifest, evidence, artDirection, plan, generator] = await Promise.all([
  readJson("packages/render/src/assets/gold-master-construction.json"),
  readJson("assets/apparatus/catalog/gold-master/manifest.json"),
  readJson("contracts/version-manifest.json"),
  read("docs/evidence/M6.md"),
  read("docs/visual/m6-art-direction.md"),
  read("docs/superpowers/plans/2026-09-15-m6-instrument-first-gold-master-rebuild.md"),
  read("tools/create_gold_master_assets.mjs"),
]);

const masterRoot = new URL("assets/apparatus/masters/", root);
const masterDirectories = await readdir(masterRoot, { withFileTypes: true });
const masters = new Map();
for (const entry of masterDirectories) {
  if (!entry.isDirectory()) continue;
  const svg = await read(`assets/apparatus/masters/${entry.name}/master.svg`);
  const identity = svg.match(/data-asset-id="([^"]+)"/);
  if (identity?.[1] !== undefined) masters.set(identity[1], { directory: entry.name, svg });
}
const sourceRecords = Array.isArray(source.specifications) ? source.specifications : [];
const selectedRecords = sourceRecords.filter((record) => masters.has(record.specificationId));
const sourceIds = selectedRecords.map((item) => item.specificationId);
const packageVersion = versionManifest.representation.apparatusGoldMasterPackage;

requireText(source.coordinateUnit === "mm", "construction source must use millimetres");
requireText(sourceIds.length > 0, "construction source has no manual master records");
requireText(new Set(sourceIds).size === sourceIds.length,
  "construction source contains duplicate manual specification IDs");
requireText(masters.size === sourceIds.length,
  "every manual master must correspond to exactly one construction source record");
requireText(manifest.schemaVersion === packageVersion,
  "generated package schema version must come from the central version manifest");
requireText(manifest.status === "gold-master-candidate",
  "generated package must remain explicitly candidate-scoped");
requireText(manifest.sourceOfTruth === "packages/render/src/assets/gold-master-construction.json",
  "generated package must point to the canonical construction source");
requireText(manifest.coordinateUnit === "mm" && manifest.visualFamily === source.visualFamily,
  "generated package coordinate/family identity must match source");
requireText(JSON.stringify(manifest.lods) === JSON.stringify(lods),
  "generated package must contain the four declared LODs");
requireText(JSON.stringify(manifest.backgrounds) === JSON.stringify(["dark-neutral", "light-neutral"]),
  "generated package must declare both neutral review backgrounds");
requireText(JSON.stringify(manifest.assets.map((item) => item.assetId)) === JSON.stringify(sourceIds),
  "generated manifest asset IDs must exactly match manual source IDs and order");

for (const record of selectedRecords) {
  const master = masters.get(record.specificationId);
  requireText(master?.svg.includes('data-master-authored="true"') === true,
    `manual master must be explicitly authored: ${record.specificationId}`);
  requireText(!JSON.stringify(record).includes('"geometry"'),
    `generic geometry record must not remain in the active source: ${record.specificationId}`);
  requireText(!JSON.stringify(record).includes('"graduation"'),
    `legacy graduation record must not remain in the active source: ${record.specificationId}`);
  requireText(master?.svg.includes(`viewBox="0 0 ${record.physicalEnvelopeMm[0]} ${record.physicalEnvelopeMm[1]}"`) === true,
    `manual master viewBox must match source envelope: ${record.specificationId}`);
}

for (const asset of manifest.assets) {
  const record = selectedRecords.find((item) => item.specificationId === asset.assetId);
  requireText(record !== undefined, `manifest asset has no manual source record: ${asset.assetId}`);
  requireText(asset.specificationId === asset.assetId,
    `manifest specification identity diverges for ${asset.assetId}`);
  requireText(asset.assetStatus === "candidate",
    `candidate package asset must not claim approval: ${asset.assetId}`);
  requireText(JSON.stringify(asset.dimensionsMm) === JSON.stringify(record?.physicalEnvelopeMm),
    `manifest physical envelope diverges for ${asset.assetId}`);
  for (const lod of lods) {
    const path = `assets/apparatus/catalog/gold-master/${asset.assetId}/${lod}.svg`;
    let svg = "";
    try { svg = await read(path); } catch { failures.push(`missing generated LOD: ${path}`); continue; }
    requireText(svg.includes('data-coordinate-unit="mm"'), `${path} must declare millimetre coordinates`);
    requireText(svg.includes(`data-lod="${lod}"`), `${path} must declare its LOD`);
    requireText(svg.includes(`data-asset-version="${versionManifest.representation.apparatusAsset}"`),
      `${path} must use the central apparatus asset version`);
    const forbiddenVisibleLayer = [...svg.matchAll(
      /<g data-layer="(?:shadow|qa-overlay|support-interface|construction|contact-base)"([^>]*)>/gi,
    )].some((match) => !/\bdisplay="none"/i.test(match[1] ?? ""));
    requireText(!forbiddenVisibleLayer, `${path} contains a visible forbidden clean-master layer`);
  }
}

for (const forbidden of ["beakerGeometry", "flaskGeometry", "buretteGeometry", "function graduation", "ApparatusGraduation"]) {
  requireText(!generator.includes(forbidden), `compiler still contains retired generic construction path: ${forbidden}`);
}

requireText(/manual master/i.test(generator) && /does not draw apparatus/i.test(generator),
  "compiler must describe and implement a manual-master compilation boundary");
requireText(/Gold Master candidate/i.test(evidence), "M6 evidence must name the package as a candidate");
requireText(/owner visual review remains open/i.test(evidence), "M6 evidence must keep owner visual review open");
requireText(!/M6-LOD\s*\|\s*PASS locally\s*\|/i.test(evidence),
  "M6 evidence must not turn the package-level LOD check into visual acceptance");
requireText(/legacy M5 first-slice[\s\S]{0,120}TITRATION_BENCH_ASSET|TITRATION_BENCH_ASSET[\s\S]{0,80}legacy/i.test(evidence),
  "M6 evidence must distinguish the legacy browser fixture from the candidate package");
requireText(/true millimetre|physical millimetres?|physical-millimetre|physical-scale/i.test(artDirection),
  "art direction must retain the physical-millimetre contract");
requireText(!/path count[^\n]*proves|all[^\n]*shadow[^\n]*master/i.test(artDirection),
  "art direction must not use path count or blanket shadow claims as acceptance proof");
requireText(/self-audit/i.test(evidence) && /m6-gold-master-self-audit\.md/i.test(evidence),
  "M6 evidence must link the two-round self-audit");
requireText(/Status: S2 implementation in progress/i.test(plan) && /owner review succeeds/i.test(plan),
  "implementation plan must preserve the S2 candidate/owner-review gate");

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  console.log("\nRESULT: FAIL");
  process.exit(1);
}

console.log("ok    canonical source, manual masters, generated candidate package, and LOD files are aligned");
console.log("ok    clean-master exclusions and source-driven compilation are mechanically checked");
console.log("ok    visual owner acceptance remains explicitly outside this structural guard");
console.log("\nRESULT: PASS");
