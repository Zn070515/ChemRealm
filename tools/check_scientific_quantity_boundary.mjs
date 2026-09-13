#!/usr/bin/env node
/**
 * Enforce AC-S8's quantity boundary.
 *
 * `MolPerLitre` is a projection quantity. It may be created only after the
 * Scientific Reality Core has produced molality/activity state and the caller
 * supplies world liquid volume. It must not enter acid-base thermodynamic
 * internals or another scientific production module.
 *
 * This is deliberately a small lexical guard with an executable negative
 * fixture. The source tree is the contract being checked; a future AST rule
 * can replace this implementation without changing the boundary.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_ROOT = join(ROOT, "packages", "sci", "src");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const PROJECTION_PATH = "projection.ts";
const FORBIDDEN = /\b(?:MolPerLitre|molarityOf)\b/g;

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
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

function isProjectionPath(relativePath) {
  return relativePath === PROJECTION_PATH || relativePath.startsWith("projection/");
}

export function findForbiddenQuantityNames(source) {
  return [...stripComments(source).matchAll(FORBIDDEN)].map((match) => match[0]);
}

export function violationsForSource(relativePath, source) {
  if (isProjectionPath(relativePath)) return [];
  return findForbiddenQuantityNames(source);
}

const failures = [];
const illegalFixture = "import { type MolPerLitre } from '@chemrealm/schema';\nconst c = molarityOf(amount, volume);";
if (violationsForSource("acidbase/illegal-fixture.ts", illegalFixture).length !== 2) {
  failures.push("self-test: an acid-base MolPerLitre/molarityOf fixture was not rejected");
}
if (violationsForSource(PROJECTION_PATH, illegalFixture).length !== 0) {
  failures.push("self-test: the approved ScientificProjection boundary was rejected");
}

for (const file of filesUnder(SOURCE_ROOT)) {
  const relativePath = relative(SOURCE_ROOT, file).replaceAll("\\", "/");
  const matches = violationsForSource(relativePath, readFileSync(file, "utf8"));
  if (matches.length > 0) {
    failures.push(`${relative(ROOT, file).replaceAll("\\", "/")}: molarity entered scientific internals (${matches.join(", ")})`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  console.log("\nRESULT: FAIL");
  process.exit(1);
}

console.log("ok    MolPerLitre/molarityOf are confined to ScientificProjection");
console.log("ok    illegal scientific-core quantity fixture is rejected");
console.log("\nRESULT: PASS");
