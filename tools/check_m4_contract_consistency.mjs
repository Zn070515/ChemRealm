import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function document(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

const [spec, design, adr0011, adr0012] = await Promise.all([
  document("docs/specs/SPEC-0001-world-foundation-acid-base-titration.md"),
  document("docs/superpowers/specs/2026-09-12-m4-acid-base-engine-design.md"),
  document("docs/adr/0011-scenario-scientific-input-freezing.md"),
  document("docs/adr/0012-m4-domain-and-constant-semantics.md"),
]);

const failures = [];
function must(text, pattern, message) {
  if (!pattern.test(text)) failures.push(`missing: ${message}`);
}
function mustNot(text, pattern, message) {
  if (pattern.test(text)) failures.push(`stale: ${message}`);
}

must(spec, /Ka.*1\.7539e-5/, "SPEC pins the frozen HOAc Ka");
must(spec, /Kw.*1\.0e-14/, "SPEC pins the frozen Kw");
must(spec, /waterActivity[\s\S]{0,180}not multiplied/i, "SPEC states the unit-water-activity convention");
must(spec, /indicator[\s\S]{0,180}scenario-specific/i, "SPEC gives indicator constants their scenario owner");
must(spec, /validity\.components|input component/i, "SPEC distinguishes input components from equilibrium species");
mustNot(spec, /to be pinned at M4/i, "SPEC does not leave the implemented fixed constants unpinned");
mustNot(spec, /All of the above enter the genesis event's `solverConfig`/i, "SPEC does not put scenario indicators in global solverConfig");
mustNot(spec, /Kw\s*=\s*a_H\s*·\s*a_OH\s*\/\s*a_w/i, "SPEC does not use the rejected Kw/water-activity equation");

must(design, /Kw\s*=\s*a_H\s*·\s*a_OH/, "M4 design uses the accepted Kw convention");
must(design, /total analytical solute molality/i, "M4 design records the analytical domain gate");
must(design, /NOT_CONVERGED[\s\S]{0,240}code/i, "M4 design names numerical diagnostics");
must(design, /ScenarioSnapshot\.indicators/i, "M4 design freezes indicator inputs in genesis");
mustNot(design, /Kw\s*=\s*a_H\s*·\s*a_OH\s*\/\s*a_w/i, "M4 design does not use the rejected Kw equation");

must(adr0011, /scenario-specific scientific input/i, "ADR-0011 keeps indicator ownership explicit");
must(adr0011, /ScenarioSnapshot\.indicators/i, "ADR-0011 names the persisted indicator block");
must(adr0012, /Kw\s*=\s*a_H\s*·\s*a_OH/, "ADR-0012 records the accepted Kw convention");
must(adr0012, /BRACKET_NOT_FOUND[\s\S]{0,240}NOT_CONVERGED/i, "ADR-0012 distinguishes bracket failure from domain refusal");
must(adr0012, /total analytical solute/i, "ADR-0012 records the analytical total gate");
mustNot(adr0012, /the v0 equation[\s\S]{0,100}waterActivity[\s\S]{0,100}multiplied/i, "ADR-0012 does not reintroduce the rejected Kw multiplier");

if (failures.length > 0) {
  console.error("M4 contract consistency check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("M4 contract consistency: PASS");
}
