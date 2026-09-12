#!/usr/bin/env node
/**
 * Static guard for M2's runtime red lines.
 *
 * This is intentionally narrow and executable: a future reducer cannot add a
 * second quantization path, browser-incompatible Node import, or unseeded
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
const reducerQuantizers = reducerSource.match(/\bquantize\s*\(/g) ?? [];
if (
  reducerQuantizers.length !== 3 ||
  !reducerSource.includes("function canonicalVolume") ||
  !reducerSource.includes("const deltaWater = quantize(") ||
  !reducerSource.includes("const delta = quantize(")
) {
  fail("reduce.ts: canonical volume and each conserved transfer delta must be quantized once");
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

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  console.log("\nRESULT: FAIL");
  process.exit(1);
}

console.log(`ok    World Runtime static contract (${files.length} production modules)`);
console.log("ok    quantization is limited to command/reducer boundaries and explicit hash projections");
console.log("ok    no Node-only, clock, or unseeded randomness dependency");
console.log("\nRESULT: PASS");
