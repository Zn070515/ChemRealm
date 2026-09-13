#!/usr/bin/env node
/**
 * Static guard for M2's runtime red lines.
 *
 * This is intentionally narrow and executable: a future reducer cannot add an
 * unapproved quantization path, browser-incompatible Node import, or unseeded
 * clock/randomness without making CI fail visibly.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "packages", "world", "src");
const files = readdirSync(SOURCE)
  .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
  .map((file) => join(SOURCE, file));

const failures = [];
function fail(message) {
  failures.push(message);
}

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const relative = file.slice(ROOT.length + 1).replaceAll("\\", "/");
  if (/from\s+["']node:/.test(source)) fail(`${relative}: Node-only import is not browser-compatible`);
  if (/\bMath\.random\s*\(|\bDate\.now\s*\(|new\s+Date\s*\(/.test(source)) {
    fail(`${relative}: unseeded randomness or wall-clock time is world truth`);
  }
  if (/\btoPrecision\s*\(/.test(source) && !relative.endsWith("packages/world/src/hash.ts")) {
    fail(`${relative}: quantization must use the single hash policy`);
  }
}

const sourceByName = Object.fromEntries(
  files.map((file) => [file.slice(SOURCE.length + 1).replaceAll("\\", "/"), readFileSync(file, "utf8")]),
);
const reducerSource = sourceByName["reduce.ts"] ?? "";
if (
  !reducerSource.includes("function canonicalVolume") ||
  !/function canonicalVolume[\s\S]*?return quantize\(/.test(reducerSource) ||
  !/const deltaWater = isFullTransfer[\s\S]*?: quantize\(/.test(reducerSource) ||
  !/const delta = isFullTransfer[\s\S]*?: quantize\(/.test(reducerSource) ||
  !/waterMass:\s*kilogram\(quantize\(current\.waterMass \+ inventory\.waterMass \* volume\)\)/.test(reducerSource) ||
  !/amount:\s*mol\(quantize\(amount\)\)/.test(reducerSource) ||
  !/isFullTransfer \? 0 : sourceAmount - delta/.test(reducerSource)
) {
  fail("reduce.ts: canonical contents and transfer deltas must use the explicit quantization policy");
}
const commandQuantizers = sourceByName["command.ts"]?.match(/\bquantize\s*\(/g) ?? [];
if (commandQuantizers.length !== 1 || !sourceByName["command.ts"]?.includes("function canonicalVolume")) {
  fail("command.ts: exactly one quantization boundary must canonicalize emitted volume");
}
if (sourceByName["reduce.ts"]?.includes("scienceHash") || sourceByName["reduce.ts"]?.includes("deriveScience")) {
  fail("reduce.ts: derived science must remain outside the world reducer");
}
const stateSource = sourceByName["state.ts"] ?? "";
if (
  !stateSource.includes("function replayIdentityProjection") ||
  !stateSource.includes("quantize(contents.waterMass.value)") ||
  !stateSource.includes("quantize(contents.liquidVolume.value)") ||
  !stateSource.includes("quantize(entry.amount.value)") ||
  stateSource.includes("quantizeTree(canonicalState)")
) {
  fail("state.ts: replay identity must explicitly quantize only canonical independent contents");
}
const snapshotSource = sourceByName["snapshot.ts"] ?? "";
const replaySource = sourceByName["replay.ts"] ?? "";
if (
  !snapshotSource.includes("parseWorldStateForSnapshot") ||
  !snapshotSource.includes("exactStateHash") ||
  !snapshotSource.includes("hashCanonical(value.state)") ||
  /\bparseWorldState\s*\(/.test(snapshotSource)
) {
  fail("snapshot.ts: snapshot validation must use the exact-state checksum and snapshot parser");
}
if (/\bparseWorldState\s*\(/.test(replaySource) || !replaySource.includes("parseWorldStateForSnapshot")) {
  fail("replay.ts: snapshot replay must preserve exact fold arithmetic through the snapshot parser");
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  console.log("\nRESULT: FAIL");
  process.exit(1);
}

console.log(`ok    World Runtime static contract (${files.length} production modules)`);
console.log("ok    quantization uses approved command/reducer/state boundaries and explicit hash projections");
console.log("ok    snapshot cache uses exact payload integrity plus semantic replay identity");
console.log("ok    no Node-only, clock, or unseeded randomness dependency");
console.log("\nRESULT: PASS");
