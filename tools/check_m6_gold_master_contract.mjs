#!/usr/bin/env node
/**
 * Verify the bounded M6 Gold Master candidate package and its evidence boundary.
 *
 * This is a structural/source-of-truth guard. It is deliberately not a visual
 * quality proof and must never promote a candidate package to M6 S3.
 */

import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const failures = [];
const lods = ["master", "scene", "preview", "thumbnail"];

const read = (relativePath) => readFile(new URL(relativePath, root), "utf8");
const readJson = async (relativePath) => JSON.parse(await read(relativePath));
const requireText = (condition, message) => { if (!condition) failures.push(message); };

const [source, manifest, evidence, artDirection, plan, generator] = await Promise.all([
  readJson("packages/render/src/assets/gold-master-construction.json"),
  readJson("assets/apparatus/catalog/gold-master/manifest.json"),
  read("docs/evidence/M6.md"),
  read("docs/visual/m6-art-direction.md"),
  read("docs/superpowers/plans/2026-09-15-m6-gold-master-contract-remediation.md"),
  read("tools/create_gold_master_assets.mjs"),
]);

requireText(source.schemaVersion === 1 && source.coordinateUnit === "mm",
  "construction source must be schema v1 in millimetres");
const sourceIds = source.specifications.map((item) => item.specificationId);
requireText(new Set(sourceIds).size === sourceIds.length,
  "construction source contains duplicate specification IDs");
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
  "generated manifest asset IDs must exactly match source IDs and order");

for (const asset of manifest.assets) {
  requireText(asset.specificationId === asset.assetId,
    `manifest specification identity diverges for ${asset.assetId}`);
  requireText(JSON.stringify(asset.dimensionsMm) === JSON.stringify(
    source.specifications.find((item) => item.specificationId === asset.assetId)?.physicalEnvelopeMm,
  ), `manifest physical envelope diverges for ${asset.assetId}`);
  for (const lod of lods) {
    const path = `assets/apparatus/catalog/gold-master/${asset.assetId}/${lod}.svg`;
    try { await access(new URL(path, root)); } catch { failures.push(`missing generated LOD: ${path}`); }
    const svg = await read(path);
    requireText(svg.includes('data-coordinate-unit="mm"'), `${path} must declare millimetre coordinates`);
    const forbiddenVisibleLayer = [...svg.matchAll(
      /<g data-layer="(?:shadow|qa-overlay|support-interface|construction|contact-base)"([^>]*)>/gi,
    )].some((match) => !/\bdisplay="none"/i.test(match[1] ?? ""));
    requireText(!forbiddenVisibleLayer, `${path} contains a visible forbidden clean-master layer`);
  }
}

for (const specificationId of sourceIds) {
  requireText(!generator.includes(`"${specificationId}"`),
    `generator contains a duplicate first-wave specification literal: ${specificationId}`);
}

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
requireText(/Gold Master package is a candidate until owner visual review/i.test(plan),
  "implementation plan must preserve the candidate/owner-review gate");

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  console.log("\nRESULT: FAIL");
  process.exit(1);
}

console.log("ok    canonical source, generated candidate package, LOD files, and evidence boundary are aligned");
console.log("ok    clean-master exclusions and source-driven generation are mechanically checked");
console.log("ok    visual owner acceptance remains explicitly outside this structural guard");
console.log("\nRESULT: PASS");
