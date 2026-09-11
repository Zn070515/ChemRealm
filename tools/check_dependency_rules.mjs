#!/usr/bin/env node
/**
 * Prove that the architectural import rules actually bite — all of them.
 *
 * WHY THIS EXISTS
 * ---------------
 * `pnpm depcruise` passing on a clean tree proves only that nothing violates
 * the rules *today*. It does not prove the rules would catch a violation, and
 * at M0 most of them are inert because only two packages exist.
 *
 * The first version of this guard sampled TWO edges by hand (`render -> sci`,
 * `world -> ace`). That is what let `render -> ace` go missing from the rule
 * set entirely: the rule did not exist, and the guard was not looking. Sampling
 * representative cases from a matrix is not coverage of the matrix.
 *
 * So the guard now enumerates EVERY edge in tools/core-boundaries.cjs, builds a
 * violating tree for each, and asserts depcruise rejects it BY NAME. Adding a
 * core to that module automatically adds its fixtures here.
 *
 * This is M0's stop condition made executable: "a deliberately-introduced
 * forbidden import has been observed to fail the build."
 *
 * Exits 1 if any expectation is not met.
 */

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = ".dependency-cruiser.cjs";
// NOT dot-prefixed. depcruise SKIPS directories whose name starts with a dot,
// so a `.tmp-…` scratch tree is scanned as "0 modules" and every fixture
// silently reports "the rule did not bite" — a false negative that looks
// exactly like a passing test.
const SCRATCH_NAME = "tmp-depcruise-guard";
const SCRATCH = join(ROOT, SCRATCH_NAME);

const require = createRequire(import.meta.url);
const { CORES, SHARED, forbiddenCoreEdges } = require("./core-boundaries.cjs");

/**
 * Invoke dependency-cruiser's own entry point through the Node binary already
 * running this script.
 *
 * NOT `npx`: on Windows `npx.cmd` resolves and spawns differently across npm
 * versions, and a failure there yields an empty output buffer — which this
 * guard would then report as "the rule did not fire" when the truth is that
 * depcruise never ran. Silent emptiness read as a negative result is the exact
 * failure mode this file exists to avoid.
 */
const DEPCRUISE_BIN = join(
  ROOT,
  "node_modules",
  "dependency-cruiser",
  "bin",
  "dependency-cruise.mjs",
);

/** `targets` is an ARRAY. "packages apps" as one string names a nonexistent dir. */
function depcruise(targets) {
  try {
    const out = execFileSync(
      process.execPath,
      [DEPCRUISE_BIN, "--config", CONFIG, ...targets],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return { ok: true, out };
  } catch (err) {
    return { ok: false, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

function writeTree(files) {
  rmSync(SCRATCH, { recursive: true, force: true });
  for (const [rel, body] of Object.entries(files)) {
    const full = join(SCRATCH, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body, "utf8");
  }
}

/** A tree where `from` imports `to`. Both sides must exist, or the import does
 *  not resolve and depcruise reports "unresolvable" instead of the rule. */
function fixtureFor(from, to) {
  return {
    [`packages/${to}/src/index.ts`]: "export const MARKER = 1;\n",
    [`packages/${from}/src/index.ts`]:
      `import { MARKER } from "../../${to}/src/index.js";\n` +
      "export const borrowed = MARKER;\n",
  };
}

let failures = 0;
function fail(msg) {
  console.error(`FAIL  ${msg}`);
  failures += 1;
}
function pass(msg) {
  console.log(`ok    ${msg}`);
}

console.log("dependency-rule guard\n");

// 1. The real tree must be clean, or the rules are already broken.
const clean = depcruise(["packages", "apps"]);
if (clean.ok) {
  pass("clean tree passes `depcruise`");
} else {
  fail(`clean tree FAILS depcruise — a real violation exists:\n${clean.out}`);
}

// 2. Every forbidden core edge must be caught, by the rule named after it.
console.log(`\n  core-boundary matrix: ${CORES.length} cores, ` +
  `${forbiddenCoreEdges.length} forbidden edges\n`);

let caught = 0;
for (const { from, to, rule } of forbiddenCoreEdges) {
  writeTree(fixtureFor(from, to));
  const res = depcruise([SCRATCH_NAME]);
  if (res.ok) {
    fail(`${rule}: violating fixture PASSED — the rule does not bite`);
  } else if (!res.out.includes(rule)) {
    fail(`${rule}: fixture failed, but not via that rule. Output:\n${res.out}`);
  } else {
    caught += 1;
    console.log(`ok    ${from} -> ${to}   (${rule})`);
  }
}

// 3. A core importing a NON-core package must also be caught, by the positive
//    rule. This is the case that would otherwise slip through if someone adds a
//    package and forgets to extend CORES.
writeTree({
  "packages/notacore/src/index.ts": "export const X = 1;\n",
  "packages/sci/src/index.ts":
    'import { X } from "../../notacore/src/index.js";\nexport const y = X;\n',
});
{
  const res = depcruise([SCRATCH_NAME]);
  const rule = "sci-imports-only-schema";
  if (res.ok || !res.out.includes(rule)) {
    fail(`${rule}: a core importing a non-core package was not caught`);
  } else {
    caught += 1;
    console.log(`ok    sci -> notacore   (${rule})`);
  }
}

// 3b. A package importing ITS OWN source is not a boundary violation. Rule
//     regexes that do not exclude the importing package report every internal
//     import, which is how the first version of these rules failed the clean
//     tree on `schema/src/index.test.ts -> schema/src/index.ts`.
writeTree({
  "packages/sci/src/index.ts": "export const X = 1;\n",
  "packages/sci/src/index.test.ts":
    'import { X } from "./index.js";\nexport const y = X;\n',
});
{
  const res = depcruise([SCRATCH_NAME]);
  if (!res.ok) {
    fail(`an intra-package import was reported as a boundary violation:\n${res.out}`);
  } else {
    caught += 1;
    console.log("ok    intra-package import is not a violation");
  }
}

// 4. The shared contract must stay a leaf.
writeTree({
  "packages/sci/src/index.ts": "export const X = 1;\n",
  "packages/schema/src/index.ts":
    'import { X } from "../../sci/src/index.js";\nexport const y = X;\n',
});
{
  const res = depcruise([SCRATCH_NAME]);
  const rule = "schema-is-a-leaf";
  if (res.ok || !res.out.includes(rule)) {
    fail(`${rule}: schema importing a core was not caught`);
  } else {
    caught += 1;
    console.log(`ok    ${SHARED} -> sci   (${rule})`);
  }
}

// 5. Clean up, and confirm nothing was left behind.
rmSync(SCRATCH, { recursive: true, force: true });
if (existsSync(SCRATCH)) {
  fail("scratch tree was not removed");
} else {
  pass("scratch tree removed");
}

const expected = forbiddenCoreEdges.length + 3;
console.log(
  `\n  caught ${caught}/${expected} (${forbiddenCoreEdges.length} core edges ` +
    "+ 1 non-core import + 1 schema leaf)",
);
console.log(`\nRESULT: ${failures === 0 && caught === expected ? "PASS" : "FAIL"}`);
process.exit(failures === 0 && caught === expected ? 0 : 1);
