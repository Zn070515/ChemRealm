#!/usr/bin/env node
/**
 * Enforce AC-S8's quantity boundary.
 *
 * Molality/activity are Scientific Reality Core quantities. Molarity is a
 * ScientificProjection-only quantity, created after the core has produced
 * species amounts and the caller supplies world liquid volume. This check uses
 * the TypeScript AST instead of text matching so comments and strings cannot
 * create false positives, while imports, aliases, namespace access, and a
 * generic `"mol/L"` construction attempt are all rejected in production core
 * modules.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_ROOT = join(ROOT, "packages", "sci", "src");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const PROJECTION_PATH = "projection.ts";
const FORBIDDEN_SCHEMA_SYMBOLS = new Set(["MolPerLitre", "molPerLitre", "molarityOf"]);
const FORBIDDEN_UNIT_LITERAL = "mol/L";

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

function isProductionSourcePath(relativePath) {
  return !relativePath.endsWith(".test.ts") && !relativePath.endsWith(".guarantees.ts");
}

function sourceFileFor(relativePath, source) {
  return ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true);
}

export function findForbiddenQuantityUses(relativePath, source) {
  const found = [];
  const sourceFile = sourceFileFor(relativePath, source);

  function visit(node) {
    if (ts.isIdentifier(node) && FORBIDDEN_SCHEMA_SYMBOLS.has(node.text)) {
      found.push(node.text);
    }
    if (ts.isStringLiteral(node)) {
      if (node.text === FORBIDDEN_UNIT_LITERAL) found.push(`unit:${FORBIDDEN_UNIT_LITERAL}`);
      if (FORBIDDEN_SCHEMA_SYMBOLS.has(node.text)) found.push(`dynamic:${node.text}`);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

export function violationsForSource(relativePath, source) {
  if (isProjectionPath(relativePath)) return [];
  return findForbiddenQuantityUses(relativePath, source);
}

const failures = [];
const directImportFixture = "import { molPerLitre as concentration } from '@chemrealm/schema';\nconst value = concentration(1);";
const namespaceFixture = "import * as schema from '@chemrealm/schema';\nconst value = schema.molPerLitre(1);";
const dynamicNamespaceFixture = "import * as schema from '@chemrealm/schema';\nconst value = schema['molPerLitre'](1);";
const genericUnitFixture = "const value = quantityOfDimension('molarity', { value: 1, unit: 'mol/L' });";
for (const [name, fixture] of [
  ["direct import", directImportFixture],
  ["namespace access", namespaceFixture],
  ["dynamic namespace access", dynamicNamespaceFixture],
  ["generic unit", genericUnitFixture],
]) {
  if (violationsForSource("acidbase/illegal-fixture.ts", fixture).length === 0) {
    failures.push(`self-test: ${name} molarity fixture was not rejected`);
  }
}
if (violationsForSource(PROJECTION_PATH, directImportFixture).length !== 0) {
  failures.push("self-test: the approved ScientificProjection boundary was rejected");
}

for (const file of filesUnder(SOURCE_ROOT)) {
  const relativePath = relative(SOURCE_ROOT, file).replaceAll("\\", "/");
  if (!isProductionSourcePath(relativePath)) continue;
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

console.log("ok    AST boundary confines MolPerLitre/molPerLitre/molarityOf and mol/L construction to ScientificProjection");
console.log("ok    direct-import, namespace, dynamic-property, and generic-unit illegal fixtures are rejected");
console.log("\nRESULT: PASS");
