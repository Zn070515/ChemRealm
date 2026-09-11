#!/usr/bin/env node
/**
 * Prove that the architectural import rules actually bite.
 *
 * WHY THIS EXISTS
 * ---------------
 * `pnpm depcruise` passing on a clean tree proves only that nothing violates
 * the rules *today*. It does not prove the rules would catch a violation — and
 * at M0 most of them are inert, because only `packages/schema` and `apps/web`
 * exist. A rule nobody has ever seen fire is not evidence that the rule works;
 * it is evidence that nobody has tried it.
 *
 * So this script constructs a violating tree in a scratch directory, runs the
 * real config against it, and asserts depcruise FAILS. Then it removes the
 * scratch tree and asserts depcruise PASSES on the real one.
 *
 * This is M0's stop condition made executable: "a deliberately-introduced
 * forbidden import has been observed to fail the build."
 *
 * Exits 1 if any expectation is not met.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = ".dependency-cruiser.cjs";
const SCRATCH = join(ROOT, ".tmp-depcruise-guard");

/** Each case is a violating tree plus the rule name it must trigger. */
const CASES = [
  {
    rule: "render-must-not-import-sci",
    files: {
      "packages/render/src/index.ts":
        'import { SCHEMA_VERSION } from "../../sci/src/index.js";\n' +
        "export const v = SCHEMA_VERSION;\n",
      "packages/sci/src/index.ts": "export const SCHEMA_VERSION = 1;\n",
    },
  },
  {
    rule: "world-must-not-import-ace",
    files: {
      "packages/world/src/index.ts":
        'import { hint } from "../../ace/src/index.js";\n' + "export const h = hint;\n",
      "packages/ace/src/index.ts": "export const hint = 1;\n",
    },
  },
];

/**
 * Invoke dependency-cruiser's own entry point through the Node binary that is
 * already running this script.
 *
 * NOT `npx`: on Windows `npx.cmd` resolves and spawns differently across npm
 * versions, and a failure there produces an empty output buffer — which this
 * guard would report as "the rule did not fire" when the truth is that
 * depcruise never ran. Silent emptiness read as a negative result is exactly
 * the failure mode this whole file exists to avoid, so the invocation is the
 * boring, direct one.
 */
const DEPCRUISE_BIN = join(
  ROOT,
  "node_modules",
  "dependency-cruiser",
  "bin",
  "dependency-cruise.mjs",
);

/** `targets` is an ARRAY. Passing "packages apps" as one string makes
 *  depcruise look for a directory literally named "packages apps". */
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

function fail(msg) {
  console.error(`FAIL  ${msg}`);
  process.exitCode = 1;
}

function pass(msg) {
  console.log(`ok    ${msg}`);
}

function writeTree(files) {
  rmSync(SCRATCH, { recursive: true, force: true });
  for (const [rel, body] of Object.entries(files)) {
    const full = join(SCRATCH, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body, "utf8");
  }
}

console.log("dependency-rule guard\n");

// 1. The real tree must be clean, or the rules are already broken.
const clean = depcruise(["packages", "apps"]);
if (clean.ok) {
  pass("clean tree passes `depcruise`");
} else {
  fail(`clean tree FAILS depcruise — a real violation exists:\n${clean.out}`);
}

// 2. Each violating fixture must be caught, by the specific rule named.
for (const { rule, files } of CASES) {
  writeTree(files);
  const res = depcruise([".tmp-depcruise-guard"]);
  if (res.ok) {
    fail(`violating fixture for \`${rule}\` PASSED — the rule does not bite`);
  } else if (!res.out.includes(rule)) {
    fail(`fixture failed, but not via \`${rule}\`. Output:\n${res.out}`);
  } else {
    pass(`violating fixture caught by \`${rule}\``);
  }
}

// 3. Clean up, and confirm nothing was left behind.
rmSync(SCRATCH, { recursive: true, force: true });
if (existsSync(SCRATCH)) {
  fail("scratch tree was not removed");
} else {
  pass("scratch tree removed");
}

console.log(`\n${process.exitCode === 1 ? "RESULT: FAIL" : "RESULT: PASS"}`);
