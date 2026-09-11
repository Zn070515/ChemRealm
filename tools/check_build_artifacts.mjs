#!/usr/bin/env node
/**
 * Inspect the built web output. Two product properties, two claims:
 *
 *   AC-P5 — a page load contacts NO third-party origin.
 *   AC-P1 — the build contains NO server API route.
 *
 * Both are stated in `SPEC-0001` as facts about the shipped artifact, so both
 * are checked against the artifact rather than against the source. A source
 * review would miss, for example, a dependency that injects a CDN <link> at
 * build time — which is exactly the failure mode that makes this check worth
 * having.
 *
 * Exits 1 on any finding. Writes nothing.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "apps", "web", "dist");

const SCANNED = new Set([".html", ".js", ".css", ".json", ".svg"]);

/**
 * AC-P5 is about a RESOURCE FETCH, not about the substring "https://".
 *
 * The first version of this check flagged every absolute URL anywhere in the
 * output. Running it produced three false positives worth recording, because
 * they are the reason the check is written the way it now is:
 *
 *   - a URL inside the HTML comment that documents the rule itself;
 *   - React's own error-message URLs (`https://react.dev/errors/…`), which are
 *     strings printed to a console and never fetched;
 *   - a template-literal fragment (`http://[${u}`) from a bundled library.
 *
 * A check that cries wolf on its own documentation gets disabled by the second
 * person who sees it. So this matches only positions where a browser actually
 * loads something: element attributes, CSS url(), dynamic import, and the
 * fetch-family calls.
 */
const LOADING_PATTERNS = [
  [/\b(?:src|href)\s*=\s*["'](https?:\/\/[^"']+|\/\/[^"']+)["']/g, "attribute"],
  [/\burl\(\s*["']?(https?:\/\/[^"')]+|\/\/[^"')]+)/g, "CSS url()"],
  [/\b@import\s+(?:url\(\s*)?["'](https?:\/\/[^"']+)["']/g, "@import"],
  [/\bimport\s*\(\s*["'](https?:\/\/[^"']+)["']\s*\)/g, "dynamic import"],
  [/\b(?:fetch|importScripts|Worker|EventSource)\s*\(\s*["'](https?:\/\/[^"']+)["']/g, "fetch"],
];

const findings = [];

function stripComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (SCANNED.has(extname(entry))) scan(full);
  }
}

function scan(file) {
  const text = stripComments(readFileSync(file, "utf8"));
  const rel = file.slice(ROOT.length + 1);

  // --- AC-P5: a third-party resource fetch ---------------------------------
  for (const [pattern, kind] of LOADING_PATTERNS) {
    for (const m of text.matchAll(pattern)) {
      const url = m[1];
      // W3C/XML namespace URIs are identifiers, not fetch targets. They appear
      // in SVG output only.
      if (url.startsWith("http://www.w3.org/")) continue;
      findings.push(`AC-P5  ${rel}: third-party fetch via ${kind} -> ${url}`);
    }
  }

  // --- AC-P1: an API route -------------------------------------------------
  // There is no backend in v0, so any /api/ reference is either a leftover or
  // a new server dependency that nobody declared.
  for (const m of text.matchAll(/["'`](\/api\/[^"'`]*)["'`]/g)) {
    findings.push(`AC-P1  ${rel}: server API route referenced -> ${m[1]}`);
  }
}

console.log("build-artifact inspection\n");

let distExists = true;
try {
  statSync(DIST);
} catch {
  distExists = false;
}

if (!distExists) {
  console.error(`FAIL  no build output at ${DIST.slice(ROOT.length + 1)} — run \`pnpm build\` first`);
  console.log("\nRESULT: FAIL");
  process.exit(1);
}

walk(DIST);

if (findings.length === 0) {
  console.log("ok    no third-party origin in the build output        (AC-P5)");
  console.log("ok    no server API route in the build output          (AC-P1)");
  console.log("\nRESULT: PASS");
} else {
  for (const f of findings) console.error(`FAIL  ${f}`);
  console.log("\nRESULT: FAIL");
  process.exitCode = 1;
}
