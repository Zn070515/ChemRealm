#!/usr/bin/env node
/**
 * Keep the native handoff honest. This guard checks the stage boundary and
 * required pending evidence; it is not a scientific acceptance proof.
 */

import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function document(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

const [nativeEvidence, legacyEvidence, nativeSpec, nativePlan] = await Promise.all([
  document("docs/evidence/M4-native.md"),
  document("docs/evidence/M4.md"),
  document("docs/superpowers/specs/2026-09-13-m4-native-scientific-backend.md"),
  document("docs/superpowers/plans/2026-09-13-m4-native-scientific-backend.md"),
]);

const failures = [];
function must(text, pattern, message) {
  if (!pattern.test(text)) failures.push(`missing: ${message}`);
}
function mustNot(text, pattern, message) {
  if (pattern.test(text)) failures.push(`forbidden: ${message}`);
}

must(nativeEvidence, /^\*\*Status:\*\* \*\*S2[\s\S]*native[\s-]+supersession S3 remains open\*\*/m,
  "native evidence stays at S2 with supersession S3 open");
must(nativeEvidence, /native adversarial semantic matrix/i,
  "native adversarial semantic evidence remains pending");
must(nativeEvidence, /native PHREEQC oracle execution/i,
  "native PHREEQC evidence remains pending");
must(nativeEvidence, /native World → ScientificFrame → Observable → DOM/i,
  "native browser composition remains pending");
must(nativeEvidence, /no\s+silent\s+fallback/i,
  "native failure boundary is explicit");
must(legacyEvidence, /^\*\*Status:\*\* \*\*S3 — Verified \/ Accepted\*\*/m,
  "legacy M4 S3 evidence remains preserved");

for (const [name, text] of [["native spec", nativeSpec], ["native plan", nativePlan]]) {
  mustNot(text, /M4-B\s+S3\s+(?:verified|accepted|complete)/i,
    `${name} does not claim native supersession S3`);
  mustNot(text, /M5\s+S3\s+(?:verified|accepted|complete)/i,
    `${name} does not claim M5 S3`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  console.log("\nRESULT: FAIL");
  process.exit(1);
}

console.log("ok    native evidence stays S2 while legacy M4 S3 remains historical");
console.log("ok    native REF/PHREEQC/browser supersession evidence is explicitly pending");
console.log("ok    native specification and plan contain no premature S3 claim");
console.log("\nRESULT: PASS");
