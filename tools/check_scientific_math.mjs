#!/usr/bin/env node
/**
 * Static guard for ADR-0007's deterministic scientific math boundary.
 *
 * Native logarithm/exponential calls are implementation-approximated across
 * JavaScript engines. Scientific production code therefore has to use the
 * package-owned deterministic functions instead of adding a convenience call
 * that happens to pass on the author's engine.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_ROOTS = [
  join(ROOT, "packages", "sci", "src"),
  join(ROOT, "packages", "world", "src"),
];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const FORBIDDEN = /\bMath\.(?:log10|exp|pow)\s*\(/g;

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

export function findForbiddenMathCalls(source) {
  return [...stripComments(source).matchAll(FORBIDDEN)].map((match) => match[0]);
}

function filesUnder(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) files.push(...filesUnder(fullPath));
    else if (SOURCE_EXTENSIONS.has(extname(entry))) files.push(fullPath);
  }
  return files;
}

const failures = [];
if (findForbiddenMathCalls("const forbidden = Math.log10(1) + Math.exp(0) + Math.pow(10, 2);").length !== 3) {
  failures.push("self-test: the native Math.log10/Math.exp/Math.pow fixture was not detected");
}

for (const sourceRoot of SOURCE_ROOTS) {
  for (const file of filesUnder(sourceRoot)) {
    const source = readFileSync(file, "utf8");
    const matches = findForbiddenMathCalls(source);
    if (matches.length > 0) {
      failures.push(`${relative(ROOT, file).replaceAll("\\", "/")}: native Math logarithm/exponential call`);
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  console.log("\nRESULT: FAIL");
  process.exit(1);
}

console.log(`ok    deterministic scientific math boundary (${SOURCE_ROOTS.length} source roots)`);
console.log("ok    native Math.log10/Math.exp/Math.pow substitution fixture is rejected");
console.log("\nRESULT: PASS");
