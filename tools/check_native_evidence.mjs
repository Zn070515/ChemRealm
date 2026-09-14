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

const [nativeEvidence, legacyEvidence, nativeSpec, nativePlan, nativeAmendment] = await Promise.all([
  document("docs/evidence/M4-native.md"),
  document("docs/evidence/M4.md"),
  document("docs/superpowers/specs/2026-09-13-m4-native-scientific-backend.md"),
  document("docs/superpowers/plans/2026-09-13-m4-native-scientific-backend.md"),
  document("docs/evidence/native-toolchain-amendment.md"),
]);

const failures = [];
function must(text, pattern, message) {
  if (!pattern.test(text)) failures.push(`missing: ${message}`);
}
function mustNot(text, pattern, message) {
  if (pattern.test(text)) failures.push(`forbidden: ${message}`);
}

must(nativeEvidence, /^\*\*Status:\*\* \*\*S3[\s\S]*verified locally and by hosted CI[\s\S]*owner supersession\s+acceptance[\s\S]*open\*\*/m,
  "native evidence records hosted S3 verification while keeping owner acceptance open");
must(nativeEvidence, /Native WASM ↔ PHREEQC oracle comparison/i,
  "native WASM-to-PHREEQC comparison evidence is recorded");
must(nativeEvidence, /Language-neutral native model contract[^\n]*PASS locally/i,
  "language-neutral native model contract evidence is recorded");
must(nativeEvidence, /Native identity artifacts[^\n]*model contract payload `sha256:[0-9a-f]{64}`[^\n]*solver-config identity `sha256:[0-9a-f]{64}`[^\n]*WASM `sha256:[0-9a-f]{64}`/i,
  "native model, solver-config, and WASM identity digests are recorded");
must(nativeEvidence, /bounded comparison[\s\S]*not a claim that the native model and PHREEQC are equivalent/i,
  "native PHREEQC comparison does not claim model equivalence");
must(nativeEvidence, /native production composition[\s\S]{0,260}World → ScientificFrame → Observable → DOM/i,
  "native browser composition evidence is recorded");
must(nativeEvidence, /explicit v2 native WorldCreated creation and replay/i,
  "native supersession requires explicit v2 world creation and replay before rollout");
must(nativeEvidence, /native-default rollout policy/i,
  "native default is described as a post-supersession rollout decision");
mustNot(nativeEvidence, /default new-world path after the supersession gate/i,
  "native default rollout is not a circular supersession prerequisite");
must(nativeEvidence, /no\s+silent\s+fallback/i,
  "native failure boundary is explicit");
must(nativeSpec, /explicit v2 WorldCreated creation[\s\S]{0,100}replay/i,
  "native specification requires explicit v2 world creation and replay evidence");
must(nativeSpec, /later owner-approved rollout amendment may[\s\S]{0,80}default/i,
  "native specification makes default selection a later rollout decision");
mustNot(nativeSpec, /new worlds bind v2 only after explicit registration/i,
  "native specification does not use default-like wording as the supersession gate");
must(legacyEvidence, /^\*\*Status:\*\* \*\*S3 — Verified \/ Accepted\*\*/m,
  "legacy M4 S3 evidence remains preserved");
must(nativeAmendment, /Implementation commit:\*{0,2}\s*`[0-9a-f]{40}`/i,
  "native amendment names the exact implementation commit");
must(nativeAmendment, /Hosted CI:\*{0,2}\s*#\d+ \/ run `\d+` for that commit/i,
  "native amendment binds a hosted CI run to the implementation commit");
must(nativeAmendment, /Local release artifact SHA-256:\*{0,2}\s*`sha256:[0-9a-f]{64}`/i,
  "native amendment records the local release artifact digest");
must(nativeAmendment, /Final native artifact identity:\*{0,2}[^\n]*pending/i,
  "native amendment does not promote a local digest to final hosted S3 evidence");
mustNot(nativeAmendment, /34761350435/i,
  "native amendment does not attribute native work to the pre-native CI run");

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

console.log("ok    native evidence records hosted S3 verification while legacy M4 S3 remains historical");
console.log("ok    native REF and bounded PHREEQC comparison evidence are recorded");
console.log("ok    native specification and plan contain no premature S3 claim");
console.log("\nRESULT: PASS");
