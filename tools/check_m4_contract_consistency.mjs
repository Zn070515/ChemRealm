import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function document(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

const [spec, design, adr0011, adr0012, content, world, worldCreation, solve, activity, migrate, scenarioMigrate, plan, evidence, integrity, oraclePlan, enginePlan, v0Inputs, envelopeReference, acceptanceTest] = await Promise.all([
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
  document("docs/plans/PLAN-0001-world-foundation-acid-base-titration.md"),
  document("docs/evidence/M4.md"),
  document("docs/research/m4-evidence-integrity.md"),
  document("docs/superpowers/plans/2026-09-13-m4-reference-oracle-validation.md"),
  document("docs/superpowers/plans/2026-09-12-m4-acid-base-engine.md"),
  document("docs/research/v0-scientific-inputs.json"),
  document("docs/research/v0-envelope-reference.json"),
  document("apps/web/src/m4-acceptance.test.ts"),
]);
const quantityBoundaryGuard = await document("tools/check_scientific_quantity_boundary.mjs");

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
must(spec, /Persisted World\/Event `schemaVersion` is currently `4`/i, "SPEC identifies persisted schema version 4");
must(spec, /forward migration is `1 → 2 → 3 → 4`/i, "SPEC identifies the complete persisted migration chain");
mustNot(spec, /World and content `schemaVersion` is currently `2`/i, "SPEC does not merge authoring and persisted version namespaces");
must(spec, /AC-S12\s*\|[^\n]*activity-based[^\n]*\|[^\n]*ScientificState/i, "M4 AC-S12 owns the scientific model-pH distinction");
must(spec, /AC-V10[\s\S]{0,260}inspection view/i, "M5 owns the model-pH inspection presentation criterion");
must(spec, /AC-V11[\s\S]{0,260}withinProposedAccuracyEnvelope/i, "M5 owns visible accuracy-envelope qualification");
must(spec, /\*\*Status:\*\* \*\*Accepted through revision 20\*\*/i, "SPEC records the accepted rev20 semantic-evidence amendment");
must(spec, /\| 20 \|[\s\S]{0,500}Owner, 2026-09-13/i, "SPEC amendment history records owner acceptance of rev20");
mustNot(spec, /revisions 13–20 remain[\s\S]{0,80}pending owner review/i, "SPEC does not leave accepted M4 amendments pending");
must(spec, /0\.09996461252716539 mol\/kg/, "SPEC records the current independently frozen envelope maximum");

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
must(plan, /\*\*Addresses:\*\*[\s\S]{0,160}AC-V10[\s\S]{0,40}AC-V11/, "M5 claims the deferred presentation criteria");
must(plan, /v0-scientific-inputs\.json/, "M4 plan names the canonical v0 input manifest");
must(plan, /v0-envelope-reference\.json/, "M4 plan names the independent envelope reference");
must(plan, /verify:scientific-quantities/, "M4 plan names the scientific quantity boundary guard");
must(evidence, /AC-V10[\s\S]{0,180}M5|M5[\s\S]{0,180}AC-V10/i, "M4 evidence points presentation criteria to M5");
must(evidence, /v0-scientific-inputs\.json/, "M4 evidence names the canonical v0 input manifest");
must(evidence, /v0-envelope-reference\.json/, "M4 evidence names the independent envelope reference");
must(evidence, /verify:scientific-quantities/, "M4 evidence names the scientific quantity boundary guard");
must(evidence, /\*\*Status:\*\* \*\*S3 — Verified \/ Accepted\*\*/i, "M4 evidence records S3 acceptance");
must(quantityBoundaryGuard, /import ts from "typescript"/, "scientific quantity guard is AST-based");
must(quantityBoundaryGuard, /dynamic namespace access/, "scientific quantity guard tests dynamic-property bypasses");
must(quantityBoundaryGuard, /generic dimension constructor/, "scientific quantity guard tests generic-dimension constructor bypasses");
must(quantityBoundaryGuard, /generic quantity parser/, "scientific quantity guard tests generic parser bypasses");
must(quantityBoundaryGuard, /quantityOfDimension/, "scientific quantity guard names the generic dimension constructor");
must(quantityBoundaryGuard, /canonicalQuantityOfDimension/, "scientific quantity guard names the canonical dimension constructor");
must(quantityBoundaryGuard, /unitsOfDimension/, "scientific quantity guard names the generic dimension unit lookup");
must(quantityBoundaryGuard, /parseQuantity/, "scientific quantity guard names the generic quantity parser");
must(quantityBoundaryGuard, /FORBIDDEN_DIMENSION_LITERALS/, "scientific quantity guard checks dimension literals");
must(quantityBoundaryGuard, /isNoSubstitutionTemplateLiteral/, "scientific quantity guard checks template-literal dimension values");
must(adr0011, /\*\*Status:\*\* \*\*Accepted\*\*/i, "ADR-0011 is accepted");
must(adr0012, /\*\*Status:\*\* \*\*Accepted\*\*/i, "ADR-0012 is accepted");
must(plan, /\*\*Status:\*\* \*\*M0–M4 S3 Verified \/ Accepted; M5 (?:authorized|S2 remediation in progress)\*\*/i, "PLAN records M5 authorization/remediation after M4 S3");
must(v0Inputs, /"schemaVersion": 2/, "v0 input manifest has the source-fidelity schema version");
mustNot(v0Inputs, /expectedMaximum/, "v0 input manifest does not contain its own acceptance output");
must(v0Inputs, /"sourceLiteral": "1 g\/cm³ \(25 °C\)"/, "NaOH source literal preserves reported precision");
must(v0Inputs, /"edition": "8th"/, "HOAc Perry provenance uses the matching edition");
must(envelopeReference, /"inputManifestSha256": "[a-f0-9]{64}"/, "envelope reference pins the input manifest digest");
must(envelopeReference, /"ionicStrengthMolal": 0\.09996461252716539/, "envelope reference pins the independently derived maximum");
must(acceptanceTest, /v0-envelope-reference\.json/, "AC-S14 reads the separate envelope reference");
must(acceptanceTest, /createWorldFromScenario/, "AC-S14 enters through scenario/world creation");
mustNot(acceptanceTest, /densityKgPerL -/, "AC-S14 does not duplicate world-resolution water-mass arithmetic");
mustNot(integrity, /AC-S3、AC-S7、AC-S10…AC-S16/, "evidence-integrity note has no stale merged M4 status");
mustNot(oraclePlan, /AC-S3, AC-S7, and AC-S10…AC-S16/, "oracle plan has no stale merged M4 status");
mustNot(enginePlan, /AC-S3, AC-S7, and AC-S10…AC-S16/, "engine plan has no stale merged M4 status");

if (failures.length > 0) {
  console.error("M4 contract consistency check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("M4 contract consistency: PASS");
}
