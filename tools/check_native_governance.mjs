#!/usr/bin/env node
/**
 * Keep the native-backend governance graph aligned with the canonical plan.
 * This is a consistency gate, not a scientific acceptance proof.
 */

import { readFile } from "node:fs/promises";
import { readVersionManifest } from "./version-manifest.mjs";

const root = new URL("../", import.meta.url);
const manifest = await readVersionManifest();
const currentSpecRevision = manifest.spec.currentRevision;
const m5ContractRevision = manifest.spec.m5ContractRevision;

async function document(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

const [adr0001, adr0014, readme, plan, m0Evidence, nativeAmendment, m5Evidence, m5Plan, m5Spec, m5CompositionSpec] =
  await Promise.all([
    document("docs/adr/0001-repository-and-workspace-strategy.md"),
    document("docs/adr/0014-native-scientific-core-and-wasm-deployment.md"),
    document("README.md"),
    document("docs/plans/PLAN-0001-world-foundation-acid-base-titration.md"),
    document("docs/evidence/M0.md"),
    document("docs/evidence/native-toolchain-amendment.md"),
    document("docs/evidence/M5.md"),
    document("docs/superpowers/plans/2026-09-13-m5-production-composition.md"),
    document("docs/superpowers/specs/2026-09-13-m5-contract-remediation.md"),
    document("docs/superpowers/specs/2026-09-13-m5-production-composition.md"),
  ]);

const failures = [];
function must(text, pattern, message) {
  if (!pattern.test(text)) failures.push(`missing: ${message}`);
}
function mustNot(text, pattern, message) {
  if (pattern.test(text)) failures.push(`stale: ${message}`);
}

must(adr0014, /^\*\*Status:\*\* \*\*Accepted — architecture decision only;/m,
  "ADR-0014 is accepted as an architecture decision while native supersession remains S2");
must(adr0014, /native supersession remains candidate\/S2/i,
  "ADR-0014 keeps native supersession separate from architecture acceptance");
must(adr0001, /TypeScript(?:\/pnpm|[^\n]{0,80}pnpm)[\s\S]{0,500}Python(?:\/uv|[^\n]{0,80}uv)[\s\S]{0,500}Rust\/Cargo/i,
  "ADR-0001 names all three toolchains and their boundary");
mustNot(adr0001, /ChemRealm has two language ecosystems with a mandatory boundary/i,
  "ADR-0001 does not describe the current repository as only two ecosystems");
mustNot(adr0001, /Two toolchains and no more/i,
  "ADR-0001 does not cap the current repository at two toolchains");
must(readme, /Three toolchains/i, "README names the three-toolchain verification boundary");
must(readme, /Rust|Cargo|rust-toolchain/i, "README lists the Rust prerequisite or commands");
mustNot(readme, /Two toolchains\. Both are required/i,
  "README has no stale two-toolchain setup claim");
must(
  plan,
  /\| M6 \|[^\n]*\|[^\n]*M5 S3[^\n]*M4-B S3[^\n]*\|/i,
  "canonical M6 milestone depends on M5 S3 and M4-B S3",
);
must(plan, /M0 \| Repository foundation[^\n]*Two-toolchain baseline/i,
  "canonical PLAN preserves M0's historical two-toolchain scope");
must(plan, /original repository's two toolchains/i,
  "canonical PLAN does not retroactively attribute Rust to M0");
must(m0Evidence, /two-toolchain/i,
  "M0 evidence remains a two-toolchain historical packet");
must(nativeAmendment, /Post-M0 Native Toolchain Amendment Evidence/i,
  "native toolchain has a separate post-M0 evidence packet");
must(nativeAmendment, /must not be cited as evidence[\s\S]{0,120}M0 two-toolchain/i,
  "native amendment explicitly avoids retroactive M0 credit");
must(m5Evidence, /Post-baseline semantic remediation attestation/i,
  "M5 retains a post-baseline remediation attestation");
must(m5Evidence, /Implementation baseline:[\s\S]{0,120}fdfec91/i,
  "M5 preserves its historical implementation baseline");
must(m5Evidence, /post-baseline remediation[\s\S]{0,240}841262d/i,
  "M5 records the later semantic remediation commit");
must(m5Evidence, /841262d[\s\S]{0,100}#115/i,
  "M5 records the hosted CI attestation for the later remediation");
for (const [name, text] of [
  ["M5 evidence", m5Evidence],
  ["M5 plan", m5Plan],
  ["M5 contract spec", m5Spec],
  ["M5 composition spec", m5CompositionSpec],
]) {
  must(text, new RegExp(`(?:M5 contract revision|current[\\s\\S]{0,80}SPEC-0001)[\\s\\S]{0,180}(?:revision )?${m5ContractRevision}|current[\\s\\S]{0,40}SPEC-0001[\\s\\S]{0,80}candidate revision`, "i"),
    `${name} references M5 contract revision ${m5ContractRevision}`);
  mustNot(text, /SPEC-0001[\s\S]{0,180}revision 25 Candidate/i,
    `${name} has no stale SPEC revision 25 reference`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  console.log("\nRESULT: FAIL");
  process.exit(1);
}

console.log("ok    native architecture governance is accepted separately from native supersession");
console.log("ok    ADR-0001, README, and canonical PLAN describe TS/pnpm, Python/uv, and Rust/Cargo");
console.log(`ok    active M5 documents reference M5 contract revision ${m5ContractRevision}; native amendment is SPEC revision ${currentSpecRevision}`);
console.log("\nRESULT: PASS");
