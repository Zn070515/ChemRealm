#!/usr/bin/env node
/**
 * Keep the M5 implementation specification subordinate to SPEC-0001.
 *
 * This is intentionally a focused consistency check, not a semantic proof of
 * visual quality. It catches the failure mode where a milestone document
 * weakens an already accepted AC-* criterion and then uses the weaker text as
 * evidence for a PASS.
 */

import { readFile } from "node:fs/promises";
import { readVersionManifest } from "./version-manifest.mjs";

const root = new URL("../", import.meta.url);

async function document(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

const [spec, childSpec, productionSpec, evidence, plan, adr, visualStandard, compositionSource, appSource, expressionSource, opticsSource] = await Promise.all([
  document("docs/specs/SPEC-0001-world-foundation-acid-base-titration.md"),
  document("docs/superpowers/specs/2026-09-13-m5-contract-remediation.md"),
  document("docs/superpowers/specs/2026-09-13-m5-production-composition.md"),
  document("docs/evidence/M5.md"),
  document("docs/plans/PLAN-0001-world-foundation-acid-base-titration.md"),
  document("docs/adr/0006-renderer-and-observable-architecture.md"),
  document("docs/visual/apparatus-standard.md"),
  document("apps/web/src/composition.ts"),
  document("apps/web/src/App.tsx"),
  document("packages/sci/src/expressions.ts"),
  document("packages/render/src/observable/optics.ts"),
]);
const observableSource = await document("packages/render/src/observable/index.ts");
const levelSource = await document("packages/render/src/observable/level.ts");
const frameSource = await document("packages/sci/src/frame.ts");

const failures = [];
const versionManifest = await readVersionManifest();
function must(text, pattern, message) {
  if (!pattern.test(text)) failures.push(`missing: ${message}`);
}
function mustNot(text, pattern, message) {
  if (pattern.test(text)) failures.push(`stale: ${message}`);
}
must(
  spec,
  new RegExp(
    "\\*\\*Current revision:\\*\\* \\*\\*" +
      versionManifest.spec.currentRevision +
      " — applicable amendments accepted[^*]*\\*\\*",
    "i",
  ),
  "SPEC records the current applicable amendment acceptance state",
);
must(spec, /AC-V3 \|[^\n]*declared[^\n]*provenance[^\n]*empirical[^\n]*palette/i, "canonical AC-V3 permits only declared provenance-bearing empirical palettes");
mustNot(spec, /AC-V3 \| No hard-coded chemical colour literal exists in the render path/i, "old unqualified AC-V3 wording is removed");
must(spec, /Readout (?:labels|text)[^\n]*precision[^\n]*ObservableModel/i, "canonical ownership assigns readout precision policy to ObservableModel");
must(spec, /DOM\/Pixi[^\n]*Renderer|text drawing[^\n]*Renderer/i, "canonical ownership keeps actual drawing in Renderer");
mustNot(spec, /Readout text, 2 dp formatting \| Renderer/i, "old readout ownership row is removed");
must(spec, /projectScientificFrame|sourceStateHash[^\n]*projection/i, "canonical contract records source-identified projection frames");
const m5AmendmentChecks = [
  [/[^\n]*(?:empirical indicator palettes|provenance-bearing)[^\n]*(?:provenance-bearing|empirical indicator palettes)/i, "the representation clarification"],
  [/volumeProfile[\s\S]{0,700}ScientificFrame/i, "replayable geometry and frame identity"],
  [/Observable[\s\S]{0,900}VolumeProfileSnapshot/i, "the executable profile seam at Observable"],
  [/(?:content-address|profile hash|hash-excluded)[\s\S]{0,900}(?:tampered|executable|recomputed)/i, "profile payload hash authenticity"],
];
for (const [index, [pattern, description]] of m5AmendmentChecks.entries()) {
  const revision = versionManifest.spec.m5AmendmentRevisions[index];
  must(
    spec,
    new RegExp("\\| " + revision + " \\|[\\s\\S]{0,1200}" + pattern.source, "i"),
    `M5 revision ${revision} records ${description}`,
  );
}
must(
  spec,
  new RegExp(
    "\\| " +
      versionManifest.spec.m5ContractRevision +
      " \\|[\\s\\S]{0,1200}(?:ScientificExpression|deliveredTitrantVolume|committed titrant|equation)",
    "i",
  ),
  "M5 canonical revision records semantic composition closure",
);

must(childSpec, /does not override[\s\S]{0,40}`SPEC-0001`/i, "M5 child specification remains subordinate");
must(childSpec, /projectScientificFrame|sourceStateHash/i, "M5 child specification names the bound frame factory");
must(childSpec, /refusal-first[\s\S]{0,220}IndicatorOpticalObservation/i, "M5 child specification preserves the active refusal-first optical boundary");
mustNot(childSpec, /IndicatorPalette` is a declarative catalog/i, "M5 child specification does not present the retired palette as the active contract");
must(childSpec, /(?:format(?:ting)?|readout strings)[^\n]*Observable|Observable[^\n]*(?:format(?:ting)?|readout strings)/i, "M5 child specification assigns formatting to the observable boundary");
must(
  childSpec,
  new RegExp(
    "M5 contract revision[\\s\\S]{0,160}\\b" + versionManifest.spec.m5ContractRevision + "\\b",
    "i",
  ),
  "M5 child specification names the current canonical amendment",
);
must(
  childSpec,
  new RegExp(
    "persisted (?:World\\/Event|world\\/event) schema v(?:ersion )?" +
      versionManifest.schema.world,
    "i",
  ),
  "M5 child specification records the current persisted schema",
);
must(
  childSpec,
  new RegExp(
    "replayable volume-profile contract in v" + (versionManifest.schema.world - 1),
    "i",
  ),
  "M5 child specification records the historical profile schema boundary",
);
must(childSpec, /VolumeProfileSnapshot/i, "M5 child specification records serializable geometry identity");
must(childSpec, /recomputes? (?:and verifies|the)[\s\S]{0,180}(?:profile hash|hash-excluded)|parseVolumeProfileSnapshot/i, "M5 child specification requires profile payload hash verification");
mustNot(childSpec, /No persisted schema migration is needed/i, "M5 child specification does not erase the profile migration");

must(productionSpec, /subordinate to `SPEC-0001`/i, "production composition specification remains subordinate");
must(productionSpec, /does not redefine or weaken them/i, "production composition specification cannot launder acceptance criteria");
must(productionSpec, /composeProductionTitration/i, "production composition specification names the production entry point");
must(productionSpec, /creates and replays an authored world through the real World Runtime/i, "production composition specification records the committed world path");
must(productionSpec, /source-bound frames/i, "production composition specification records source-bound frames");
must(productionSpec, /builds ObservableModel and renderer-neutral RenderState/i, "production composition specification records the observable boundary");
must(productionSpec, /Playwright DOM assertion/i, "production composition specification requires browser evidence");
must(productionSpec, /M6 authorization or an automatic M5 S3 claim/i, "production composition specification keeps later-stage claims out of scope");

must(plan, /projectScientificFrame|sourceStateHash/i, "PLAN names the source-identified frame boundary");
must(plan, /compensated sum|roundoff bound/i, "PLAN names the burette floating-point policy");
must(
  plan,
  new RegExp("revision " + versionManifest.spec.m5ContractRevision, "i"),
  "PLAN names the current M5 canonical amendment",
);
must(
  plan,
  new RegExp(
    `schema v${versionManifest.schema.world}|schema version ${versionManifest.schema.world}|v${versionManifest.schema.world - 1}→v${versionManifest.schema.world}`,
    "i",
  ),
  "PLAN names the replayable profile schema boundary",
);
must(observableSource, /interface ScientificFrame[\s\S]{0,500}physical[\s\S]{0,180}liquidVolume/i, "Observable frame includes the bound physical volume");
must(observableSource, /interface ObservableInput[\s\S]{0,350}volumeProfileSnapshot/i, "Observable input consumes the replay-frozen profile snapshot");
must(observableSource, /interface ObservableIndicator[\s\S]{0,220}opticalObservation:\s*IndicatorOpticalObservation/i, "Observable indicator exposes a tagged optical observation");
mustNot(observableSource, /interface ObservableIndicator[\s\S]{0,180}color:/i, "Observable indicator does not expose the deprecated colour shape");
must(opticsSource, /export function observeIndicatorOptics/i, "Observable uses the refusal-first optical observation boundary");
must(opticsSource, /OPTICAL_MODEL_DATA_MISSING|OPTICAL_MODEL_OUT_OF_COVERAGE/i, "optical observation exposes tagged refusal statuses");
mustNot(opticsSource, /from ["']@chemrealm\/sci["']/i, "optical observation does not import the Scientific Core implementation");
must(observableSource, /volumeProfileFromSnapshot\(input\.volumeProfileSnapshot\)/i, "Observable reconstructs the executable profile internally");
must(levelSource, /parseVolumeProfileSnapshot/i, "profile adapter validates the snapshot content hash before interpolation");
mustNot(observableSource, /interface ObservableInput[\s\S]{0,350}readonly volumeProfile:\s*VolumeProfile/i, "Observable input does not accept an executable profile adapter");
mustNot(observableSource, /interface ObservableInput[\s\S]{0,300}readonly liquidVolume/i, "Observable input has no duplicate liquid-volume field");
must(frameSource, /physical[\s\S]{0,180}liquidVolume[\s\S]{0,180}volumeProfileHash/i, "ScientificFrame owns physical input identity");
must(compositionSource, /buildAcidBaseSolveRequest/i, "composition delegates acid-base request construction to Sci");
mustNot(compositionSource, /ACID_BASE_COMPONENT_CATALOG|DEFAULT_ACID_BASE_CONSTANTS|monoprotic-equilibrium|fully-dissociated/i, "composition does not own acid-base catalog, constants, or mode selection");
must(compositionSource, /deliveredTitrantVolume[\s\S]{0,120}prefixStates/i, "composition derives curve x values from committed prefixes");
must(compositionSource, /fromVesselId === SOURCE_VESSEL_ID[\s\S]{0,180}toVesselId === TARGET_VESSEL_ID/i, "composition filters burette facts by exact source and target");
mustNot(appSource, /activity model:\s*Davies/i, "DOM adapter does not hard-code the activity model");
must(appSource, /activity model:\s*\{composition\.observable\.readouts\.activityModel\}/i, "DOM adapter renders the ObservableModel activity model");
must(appSource, /data-testid=["']indicator-optical-status["']/i, "DOM adapter exposes the optical observation status");
must(appSource, /data-testid=["']indicator-optical-limitation["']/i, "DOM adapter exposes optical refusal diagnostics");
mustNot(appSource, /rgba\(/i, "DOM adapter does not present the optical result as alpha or liquid opacity");
must(expressionSource, /equationId[\s\S]{0,500}substitutions/i, "Scientific Core expressions carry structured equations and substitutions");
mustNot(expressionSource, /solve charge balance and component balances self-consistently/i, "natural-language placeholder is not emitted as an exact expression");

must(evidence, /M5-FRAME[^\n]*\| PASS locally/i, "M5 frame evidence records the production composition boundary");
must(evidence, /M5-OPTICAL-REFUSAL[^\n]*\| PASS locally/i, "M5 records local refusal-first optical evidence");
must(evidence, /AC-V3[^\n]*\| PASS locally/i, "AC-V3 records the admitted optical pipeline and declared QA palette boundary");
must(evidence, /AC-V4[^\n]*\| PASS locally/i, "AC-V4 contract-level evidence is complete for M5");
must(evidence, /contract-level[\s\S]{0,240}M5 S3\s+does\s+not\s+require M6/i, "M5 contract acceptance does not wait for M6 realization");
must(evidence, /M6 consumes[\s\S]{0,180}visual[\s\S]{0,180}does not retroactively gate M5 S3/i, "M6 owns downstream visual realization");
must(plan, /M5\/M6 acceptance ownership/i, "canonical PLAN declares the M5/M6 acceptance boundary");
must(plan, /M5 S3 does\s+not wait for M6/i, "canonical PLAN breaks the M5/M6 acceptance cycle");
must(plan, /M6\/M5 boundary/i, "canonical PLAN declares the M6/M5 realization boundary");
must(plan, /M6\/M5 boundary[\s\S]{0,450}M6 is downstream[\s\S]{0,220}consumes the already-verified M5/i, "canonical PLAN assigns realization to M6 after M5");
must(evidence, /AC-V6[^\n]*PASS locally/i, "AC-V6 records built DOM evidence");
must(evidence, /AC-V8[^\n]*PASS locally/i, "AC-V8 records built DOM evidence");
must(evidence, /AC-V10[^\n]*PASS locally/i, "AC-V10 records inspection copy and DOM evidence");
must(evidence, /M5-SYMBOLIC[^\n]*PASS locally/i, "M5 symbolic evidence records the production producer path");
must(evidence, /M5-CURVE[^\n]*PASS locally/i, "M5 curve evidence records the committed frame sequence");
must(evidence, /M5-FRAME[^\n]*apps\/web\/src\/composition\.test\.ts/i, "M5 frame evidence names the production composition test");
must(evidence, /AC-V11[^\n]*PASS locally/i, "AC-V11 records the deterministic negative qualification fixture");

must(adr, /Readout (?:labels|text) and precision[^\n]*ObservableModel|Readout[^\n]*precision[^\n]*ObservableModel/i, "ADR-0006 records observable-owned readout policy");
must(adr, /DOM\/Pixi[^\n]*Renderer|actual drawing[^\n]*Renderer/i, "ADR-0006 records renderer-owned drawing");
must(adr, /projectScientificFrame|sourceStateHash/i, "ADR-0006 records frame identity at the composition boundary");
must(visualStandard, /provenance-bearing[^\n]*identity-keyed[^\n]*palette|identity-keyed[^\n]*palette[^\n]*provenance-bearing/i, "apparatus standard confines empirical colour literals to the declared palette");
mustNot(visualStandard, /No hard-coded chemical colour literal anywhere in the render path/i, "apparatus standard does not prohibit the declared empirical palette");

if (failures.length > 0) {
  console.error("M5 contract consistency check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("M5 contract consistency: PASS");
}
