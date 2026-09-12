import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function document(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

const [spec, design, adr0011, adr0012, content, world, worldCreation, solve, activity, migrate, scenarioMigrate] = await Promise.all([
  document("docs/specs/SPEC-0001-world-foundation-acid-base-titration.md"),
  document("docs/superpowers/specs/2026-09-12-m4-acid-base-engine-design.md"),
  document("docs/adr/0011-scenario-scientific-input-freezing.md"),
  document("docs/adr/0012-m4-domain-and-constant-semantics.md"),
  document("packages/schema/src/content.ts"),
  document("packages/schema/src/world.ts"),
  document("apps/web/src/world-creation.ts"),
  document("packages/sci/src/acidbase/solve.ts"),
  document("packages/sci/src/acidbase/activity.ts"),
  document("packages/schema/src/migrate.ts"),
  document("packages/schema/src/scenario-migrate.ts"),
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
must(spec, /Actual component compatibility[\s\S]{0,500}before `WorldCreated`/i, "SPEC binds actual scenario components before genesis");
must(spec, /authoring `Scenario` shape has no dissociation-mode field/i, "SPEC keeps chemistry modes in the model catalog");
mustNot(spec, /to be pinned at M4/i, "SPEC does not leave the implemented fixed constants unpinned");
mustNot(spec, /All of the above enter the genesis event's `solverConfig`/i, "SPEC does not put scenario indicators in global solverConfig");
mustNot(spec, /Kw\s*=\s*a_H\s*·\s*a_OH\s*\/\s*a_w/i, "SPEC does not use the rejected Kw/water-activity equation");
must(spec, /Persisted World\/Event `schemaVersion` is currently `3`/i, "SPEC identifies persisted schema version 3");
must(spec, /forward migration is `1 → 2 → 3`/i, "SPEC identifies the complete persisted migration chain");
mustNot(spec, /World and content `schemaVersion` is currently `2`/i, "SPEC does not merge authoring and persisted version namespaces");

must(design, /Kw\s*=\s*a_H\s*·\s*a_OH/, "M4 design uses the accepted Kw convention");
must(design, /total analytical solute molality/i, "M4 design records the analytical domain gate");
must(design, /NOT_CONVERGED[\s\S]{0,240}code/i, "M4 design names numerical diagnostics");
must(design, /ScenarioSnapshot\.indicators/i, "M4 design freezes indicator inputs in genesis");
must(design, /authoring fields[\s\S]{0,180}fullyDissociated/i, "M4 design assigns dissociation modes to the catalog");
must(design, /never evaluates Davies coefficients/i, "M4 design forbids out-of-domain activity evaluation");
mustNot(design, /Kw\s*=\s*a_H\s*·\s*a_OH\s*\/\s*a_w/i, "M4 design does not use the rejected Kw equation");

must(adr0011, /scenario-specific scientific input/i, "ADR-0011 keeps indicator ownership explicit");
must(adr0011, /ScenarioSnapshot\.indicators/i, "ADR-0011 names the persisted indicator block");
must(adr0012, /Kw\s*=\s*a_H\s*·\s*a_OH/, "ADR-0012 records the accepted Kw convention");
must(adr0012, /BRACKET_NOT_FOUND[\s\S]{0,240}NOT_CONVERGED/i, "ADR-0012 distinguishes bracket failure from domain refusal");
must(adr0012, /total analytical solute/i, "ADR-0012 records the analytical total gate");
must(adr0012, /current scientific wire schema is v3/i, "ADR-0012 identifies the current scientific wire version");
mustNot(adr0012, /the v0 equation[\s\S]{0,100}waterActivity[\s\S]{0,100}multiplied/i, "ADR-0012 does not reintroduce the rejected Kw multiplier");

mustNot(content, /fullyDissociated/, "authoring schema has no ignored dissociation field");
must(world, /temperature:\s*canonicalQuantityOfDimension\("temperature"\)/, "persisted snapshots require canonical Kelvin");
must(worldCreation, /requiredComponents:\s*requiredScenarioComponents\(snapshot\)/, "genesis derives actual components for resolver context");
must(solve, /IONIC_STRENGTH_UPPER\s*=\s*ACID_BASE_MAX_IONIC_STRENGTH/, "solver uses the declared Davies ceiling");
mustNot(solve, /EXPLORATORY_IONIC_STRENGTH_UPPER|DOMAIN_BOUNDARY_PROBE|1\.25/, "solver has no out-of-domain exploratory ionic-strength path");
must(activity, /DaviesDomainError/, "Davies activity boundary has an explicit domain refusal");
must(migrate, /from:\s*2,[\s\S]{0,120}to:\s*3/, "persisted migrations include the v2-to-v3 step");
must(migrate, /migrateWorld/, "persisted migration namespace has an explicit entry point");
must(scenarioMigrate, /SCENARIO_MIGRATIONS/, "authoring migration namespace is explicit");

if (failures.length > 0) {
  console.error("M4 contract consistency check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("M4 contract consistency: PASS");
}
