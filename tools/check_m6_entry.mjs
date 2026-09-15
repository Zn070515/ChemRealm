#!/usr/bin/env node
/**
 * Check the M6 entry packet's governance and evidence shape.
 *
 * This is deliberately not a visual-quality or scientific-acceptance proof.
 * It prevents an M6 handoff from becoming true merely because a subordinate
 * document says so, while keeping the implementation and visual acceptance
 * boundary explicit.
 */

import { readFile } from "node:fs/promises";
import { readVersionManifest } from "./version-manifest.mjs";

const root = new URL("../", import.meta.url);
const manifest = await readVersionManifest();

async function document(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

const [entry, plan, m4Native, m5, spec, opticalPlan, adr] = await Promise.all([
  document("docs/evidence/M6-entry.md"),
  document("docs/plans/PLAN-0001-world-foundation-acid-base-titration.md"),
  document("docs/evidence/M4-native.md"),
  document("docs/evidence/M5.md"),
  document("docs/specs/SPEC-0001-world-foundation-acid-base-titration.md"),
  document("docs/superpowers/plans/2026-09-14-indicator-optical-observation.md"),
  document("docs/adr/0016-indicator-optical-observation-boundary.md"),
]);

const failures = [];
function must(text, pattern, message) {
  if (!pattern.test(text)) failures.push(`missing: ${message}`);
}
function mustNot(text, pattern, message) {
  if (pattern.test(text)) failures.push(`forbidden: ${message}`);
}

must(entry, /^\*\*Status:\*\* \*\*M6 authorized \/ in progress\*\*/m,
  "M6 entry records explicit owner authorization while keeping implementation in progress");
must(entry, /M6 is the first milestone[\s\S]{0,260}PixiJS renderer/i,
  "M6 scope includes final apparatus/rendering realization");
must(entry, /hosted CI run for the exact committed baseline succeed(?:s|ed)/i,
  "M6 requires exact hosted-baseline attestation");
must(entry, /owner acceptance of the applicable amendments is recorded/i,
  "M6 entry records owner acceptance of the applicable amendments");
must(entry, /strong-acid phenolphthalein orange[\s\S]{0,80}refusal-only/i,
  "strong-acid orange remains refusal-only");
must(entry, /M6 must retain[\s\S]{0,120}refusal-first optical boundary/i,
  "M6 cannot replace optical refusal with a palette fallback");
must(entry, /final apparatus asset package and semantic asset contract/i,
  "M6 asset contract is explicitly unverified at entry");
must(entry, /PixiJS\/renderer implementation and layer ownership/i,
  "M6 renderer work is explicitly unverified at entry");
const hasRecordedHostedAttestation = /Hosted attestation is (?:now )?recorded for the exact committed\s+baseline/i.test(entry);
const hasPendingHostedAttestation = /A new hosted attestation must be recorded here only after/i.test(entry);
if (!hasRecordedHostedAttestation && !hasPendingHostedAttestation) {
  failures.push("missing: M6 packet records either the post-push hosted evidence or an explicit pending-attestation state");
}
if (hasPendingHostedAttestation) {
  must(entry, /current-round hosted attestation required/i,
    "M6 pending state explicitly keeps the corrected hosted attestation open");
}

must(plan, /M0–M5 and M4-B S3 Verified \/ Accepted[\s\S]{0,240}M6 authorized\s*\/\s*in\s+progress/i,
  "canonical plan records accepted M5/M4-B evidence and active M6 authorization");
must(plan, new RegExp(`\\| M6 \\|[^\\n]*\\|[^\\n]*M5 S3[^\\n]*M4-B S3[^\\n]*\\|`, "i"),
  "canonical M6 dependency remains M5 S3 plus M4-B S3");
must(plan, /M5 S3 does\s+not wait for M6/i,
  "M5 contract acceptance is not circularly dependent on M6");

must(m4Native, /S3[\s\S]{0,140}verified locally and by hosted CI[\s\S]{0,180}M4-B S3 evidence accepted/i,
  "native evidence records accepted M4-B evidence separately from rollout");
must(m4Native, /hosted CI run #140[\s\S]{0,180}66b488a3e7483b776711d0e9d6ab723698dc3a35/i,
  "native evidence binds hosted CI to the exact committed baseline");
must(m4Native, /sha256:c03fc50d7fb8aa6bae79dd9638b14095f1cf919bdfb8e31c64bda93ce05c3887/i,
  "native local artifact identity is recorded");
must(m4Native, /Native WASM ↔ PHREEQC oracle comparison/i,
  "native bounded oracle evidence is present");
must(m4Native, /not a claim that the native model and PHREEQC are equivalent/i,
  "native oracle disposition remains bounded and non-equivalence");
must(m4Native, /native supersession[\s\S]{0,160}default rollout remains unapproved/i,
  "native default rollout remains explicitly unapproved");

must(m5, /S3[\s\S]{0,180}owner acceptance recorded/i,
  "M5 evidence records owner acceptance after hosted verification");
must(m5, /66b488a3e7483b776711d0e9d6ab723698dc3a35[\s\S]{0,180}hosted CI run #140/i,
  "M5 evidence binds hosted CI to the exact committed baseline");
must(m5, /OPTICAL_MODEL_OK/i,
  "M5 records positive bounded optical evidence");
must(m5, /Strong-acid phenolphthalein orange\s+remains\s+documented\s+and\s+refusal-only/i,
  "M5 records the orange refusal boundary");
must(m5, /M5-COMPOSITION[^\n]*PASS locally/i,
  "M5 production composition evidence is attached");
must(m5, /AC-O8[^\n]*PASS locally/i,
  "positive and refusal optical evidence is attached");
const pendingSpecRevisions = Array.from(
  { length: manifest.spec.currentRevision - manifest.spec.acceptedThroughRevision },
  (_, index) => manifest.spec.acceptedThroughRevision + index + 1,
).filter((revision) => !manifest.spec.acceptedAmendmentRevisions.includes(revision));
must(m5, /owner accepted revisions/i, "M5 records the accepted non-native amendments");
for (const revision of pendingSpecRevisions) {
  must(
    m5,
    new RegExp(`revision ${revision} remains Candidate`, "i"),
    `M5 keeps unaccepted revision ${revision} outside owner acceptance`,
  );
}

must(spec, new RegExp(`\\*\\*Current revision:\\*\\* \\*\\*${manifest.spec.currentRevision} — applicable amendments accepted`, "i"),
  "canonical SPEC records the manifest-distributed applicable amendment acceptance state");
must(opticalPlan, /one\s+source-reviewed ordinary-aqueous quantitative profile/i,
  "optical plan records the admitted bounded profile");
must(adr, /ordinary-aqueous phenolphthalein profile[\s\S]{0,220}locally admitted/i,
  "optical ADR records the bounded local admission");
mustNot(entry, /M6\s+S3\s+(?:verified|accepted|complete)/i,
  "M6 entry packet does not claim M6 S3");

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  console.log("\nRESULT: FAIL");
  process.exit(1);
}

console.log("ok    M6 entry authorization, prerequisites, and dependency ownership are recorded");
console.log("ok    M4-B/M5 evidence acceptance remains separate from native-default rollout");
console.log(`ok    corrected hosted attestation is ${hasRecordedHostedAttestation ? "recorded" : "explicitly pending"}`);
console.log("ok    M6 visual/asset work remains explicitly unverified and refusal-first optics are preserved");
console.log("\nRESULT: PASS");
