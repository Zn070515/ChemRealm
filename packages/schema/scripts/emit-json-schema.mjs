#!/usr/bin/env node
/**
 * Emit JSON Schema artifacts into `packages/schema/json-schema/` — COMMITTED,
 * not under `dist/`. See the note on `OUT` below.
 *
 * Run with `--check` to verify the working copy is current WITHOUT writing.
 * That mode is what makes drift visible in CI: a schema change that was not
 * re-emitted fails the build rather than quietly leaving the Python side
 * validating against a stale contract.
 *
 * Reads from the BUILT output, so `pnpm build` must run first.
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, "..", "dist");
/**
 * NOT under `dist/`. `dist/` is gitignored, and a drift check against an
 * uncommitted artifact is vacuous: regenerating during build would always make
 * it "current". Committing the artifacts is what gives the check meaning, AND
 * it lets the Python side validate against the contract without a Node
 * toolchain — which is the point of emitting them at all.
 *
 * This deviates from `PLAN-0001` M1's `dist/json-schema/` path. Recorded here
 * rather than changed silently.
 */
const OUT = resolve(HERE, "..", "json-schema");

const check = process.argv.includes("--check");

let api;
try {
  // `pathToFileURL`, not a bare absolute path: Node's ESM loader rejects a
  // Windows path with ERR_UNSUPPORTED_ESM_URL_SCHEME.
  api = await import(pathToFileURL(join(DIST, "json-schema.js")).href);
} catch (cause) {
  console.error(
    `emit-json-schema: could not load ${DIST}\\json-schema.js.\n` +
      "Run `pnpm build` first — this reads the compiled output, not the source.",
  );
  throw cause;
}

const generated = api.generateJsonSchemas();
const rendered = new Map();
for (const [name, schema] of Object.entries(generated)) {
  rendered.set(api.artifactFilename(name), api.serializeJsonSchema(schema));
}

if (check) {
  let stale = 0;
  let missing = 0;
  for (const [file, expected] of rendered) {
    let actual;
    try {
      actual = readFileSync(join(OUT, file), "utf8");
    } catch {
      console.error(`FAIL  ${file} is missing — run \`pnpm verify:schema-artifacts --write\``);
      missing += 1;
      continue;
    }
    if (actual !== expected) {
      console.error(`FAIL  ${file} is stale — regenerate it`);
      stale += 1;
    }
  }

  // And the other direction: an artifact whose schema no longer exists.
  let orphaned = 0;
  try {
    for (const file of readdirSync(OUT)) {
      if (!rendered.has(file)) {
        console.error(`FAIL  ${file} has no schema — delete it`);
        orphaned += 1;
      }
    }
  } catch {
    /* nothing emitted yet; the missing branch above already reported it */
  }

  const ok = stale === 0 && missing === 0 && orphaned === 0;
  console.log(
    `\nRESULT: ${ok ? "PASS" : "FAIL"}  (${rendered.size} artifacts, ` +
      `${stale} stale, ${missing} missing, ${orphaned} orphaned)`,
  );
  process.exit(ok ? 0 : 1);
}

mkdirSync(OUT, { recursive: true });
for (const [file, contents] of rendered) {
  writeFileSync(join(OUT, file), contents, "utf8");
}
console.log(`wrote ${rendered.size} JSON Schema artifacts to ${OUT}`);
