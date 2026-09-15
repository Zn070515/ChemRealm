#!/usr/bin/env node
/**
 * Instrument Audit for the M6 first-wave manual masters.
 *
 * This checks source-backed semantic claims and package completeness. It is
 * not an artistic or owner visual-quality proof.
 */

import { readFile, readdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const source = JSON.parse(await readFile(new URL("packages/render/src/assets/gold-master-construction.json", root), "utf8"));
const failures = [];
const fail = (message) => failures.push(message);
const requireCondition = (condition, message) => { if (!condition) fail(message); };
const mastersRoot = new URL("assets/apparatus/masters/", root);
const masters = new Map();

for (const entry of await readdir(mastersRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const base = new URL(`${entry.name}/`, mastersRoot);
  let svg;
  try { svg = await readFile(new URL("master.svg", base), "utf8"); } catch { fail(`${entry.name}: master.svg is missing`); continue; }
  const assetId = svg.match(/data-asset-id="([^"]+)"/)?.[1];
  if (assetId === undefined) { fail(`${entry.name}: master is missing data-asset-id`); continue; }
  masters.set(assetId, { directory: entry.name, base, svg });
}

const records = Array.isArray(source.specifications)
  ? source.specifications.filter((record) => masters.has(record.specificationId))
  : [];
requireCondition(records.length === masters.size && records.length === 4,
  "exactly four first-wave manual masters must be paired with source records");
requireCondition(new Set(records.map((record) => record.specificationId)).size === records.length,
  "first-wave source records must have unique identities");

function markingValues(svg) {
  return [...svg.matchAll(/data-marking-value-ml="([^\"]+)"/g)].map((match) => Number(match[1]));
}

for (const record of records) {
  const master = masters.get(record.specificationId);
  const base = master.base;
  const measurementPath = new URL("measurement-sheet.json", base);
  const sourceRecordPath = new URL("source-record.md", base);
  const reviewPath = new URL("review.md", base);
  let measurement;
  try { measurement = JSON.parse(await readFile(measurementPath, "utf8")); } catch { fail(`${record.specificationId}: measurement-sheet.json is missing or invalid`); }
  let sourceRecord = "";
  try { sourceRecord = await readFile(sourceRecordPath, "utf8"); } catch { fail(`${record.specificationId}: source-record.md is missing`); }
  try { await readFile(reviewPath, "utf8"); } catch { fail(`${record.specificationId}: review.md is missing`); }

  requireCondition(measurement?.assetId === record.specificationId, `${record.specificationId}: measurement identity diverges`);
  requireCondition(measurement?.coordinateUnit === "mm", `${record.specificationId}: measurement sheet must use millimetres`);
  requireCondition(Array.isArray(measurement?.dimensionsMm) && measurement.dimensionsMm.length === 3,
    `${record.specificationId}: measurement dimensions are incomplete`);
  requireCondition(sourceRecord.includes(record.specificationId), `${record.specificationId}: source record omits asset identity`);
  requireCondition(/https?:\/\//.test(sourceRecord), `${record.specificationId}: source record has no citable source`);
  requireCondition(/owner visual review remains open/i.test(sourceRecord), `${record.specificationId}: source record must keep visual review open`);
  requireCondition(master.svg.includes('data-master-authored="true"'), `${record.specificationId}: master is not marked authored`);
  requireCondition(master.svg.includes(`viewBox="0 0 ${record.physicalEnvelopeMm[0]} ${record.physicalEnvelopeMm[1]}"`),
    `${record.specificationId}: master viewBox diverges from physical envelope`);
  requireCondition(!master.svg.includes('data-layer="graduation"'), `${record.specificationId}: legacy graduation layer remains`);
  requireCondition(!master.svg.includes('data-layer="shadow"'), `${record.specificationId}: clean master contains a shadow layer`);

  const values = markingValues(master.svg);
  if (record.familyId === "burette") {
    requireCondition(record.marking !== undefined, `${record.specificationId}: burette marking semantics are missing`);
    requireCondition(master.svg.includes('data-layer="scale" data-part="burette.scale-on-tube"'),
      `${record.specificationId}: marking is not attached to the burette tube`);
    requireCondition(master.svg.includes('data-marking-direction="increases-downward"'),
      `${record.specificationId}: burette direction is not downward`);
    requireCondition(master.svg.includes('data-marking-reference="top-zero"'),
      `${record.specificationId}: burette reference is not top-zero`);
    requireCondition(master.svg.includes('data-marking-surface="tube-wrap"'),
      `${record.specificationId}: burette marking surface is not tube-wrap`);
    const expected = record.marking?.kind === "burette-ex"
      ? Array.from({ length: 26 }, (_, index) => index)
      : Array.from({ length: 11 }, (_, index) => index * 5);
    requireCondition(JSON.stringify(values) === JSON.stringify(expected),
      `${record.specificationId}: master labels do not match the declared marking interval`);
    requireCondition(record.marking?.kind === (record.specificationId.includes("acid") ? "burette-ex" : "burette-approximate"),
      `${record.specificationId}: acid/alkali marking identity is inconsistent`);
  } else if (record.familyId === "beaker") {
    requireCondition(record.marking?.kind === "approximate-contained", `${record.specificationId}: beaker marking must be approximate-contained`);
    requireCondition(master.svg.includes('data-layer="scale" data-part="vessel.scale"'),
      `${record.specificationId}: contained-volume marking is not on the vessel wall`);
    requireCondition(master.svg.includes('data-marking-direction="increases-upward"'),
      `${record.specificationId}: beaker markings must increase upward`);
    requireCondition(JSON.stringify(values) === JSON.stringify([200, 175, 150, 125, 100, 75, 50, 25]),
      `${record.specificationId}: beaker labels must be the cited 25–200 mL range`);
  } else {
    requireCondition(record.marking === undefined, `${record.specificationId}: flask must not invent a marking`);
    requireCondition(values.length === 0, `${record.specificationId}: flask master contains unsupported measurement marks`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  console.log("\nRESULT: FAIL");
  process.exit(1);
}

console.log("ok    four manual masters have complete source, measurement, and review records");
console.log("ok    burette, beaker, and flask marking semantics match their declared instrument families");
console.log("ok    unsupported generic graduation and fabricated flask markings are rejected");
console.log("\nRESULT: PASS");
