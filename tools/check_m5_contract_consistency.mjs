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

const [spec, childSpec, productionSpec, evidence, plan, adr, visualStandard, compositionSource, appSource, expressionSource] = await Promise.all([
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
]);
const observableSource = await document("packages/render/src/observable/index.ts");
const levelSource = await document("packages/render/src/observable/level.ts");
const frameSource = await document("packages/sci/src/frame.ts");
const tokenSource = await document("packages/render/src/observable/tokens.ts");
const indicatorPaletteManifest = JSON.parse(
  await document("docs/visual/reference/indicator-palettes.json"),
);
const indicatorSwatches = await document(
  "docs/visual/reference/indicator-reference-swatches.svg",
);
const indicatorPaletteReview = await document(
  "docs/visual/reference/indicator-palette-review.md",
);

const failures = [];
const versionManifest = await readVersionManifest();
function must(text, pattern, message) {
  if (!pattern.test(text)) failures.push(`missing: ${message}`);
}
function mustNot(text, pattern, message) {
  if (pattern.test(text)) failures.push(`stale: ${message}`);
}
function requirePalette(condition, message) {
  if (!condition) failures.push(`missing: ${message}`);
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

must(
  spec,
  new RegExp(
    "\\*\\*Current revision:\\*\\* \\*\\*" +
      versionManifest.spec.currentRevision +
      " Candidate\\*\\*",
    "i",
  ),
  "SPEC records the current candidate revision",
);
must(spec, /AC-V3 \|[^\n]*declared[^\n]*provenance[^\n]*empirical[^\n]*palette/i, "canonical AC-V3 permits only declared provenance-bearing empirical palettes");
mustNot(spec, /AC-V3 \| No hard-coded chemical colour literal exists in the render path/i, "old unqualified AC-V3 wording is removed");
must(spec, /Readout (?:labels|text)[^\n]*precision[^\n]*ObservableModel/i, "canonical ownership assigns readout precision policy to ObservableModel");
must(spec, /DOM\/Pixi[^\n]*Renderer|text drawing[^\n]*Renderer/i, "canonical ownership keeps actual drawing in Renderer");
mustNot(spec, /Readout text, 2 dp formatting \| Renderer/i, "old readout ownership row is removed");
must(spec, /projectScientificFrame|sourceStateHash[^\n]*projection/i, "canonical contract records source-identified projection frames");
must(spec, /\| 21 \|[^\n]*(?:empirical indicator palettes|provenance-bearing)[^\n]*(?:provenance-bearing|empirical indicator palettes)/i, "revision 21 amendment records the representation clarification");
must(spec, /\| 22 \|[\s\S]{0,700}volumeProfile[\s\S]{0,700}ScientificFrame/i, "revision 22 amendment records replayable geometry and frame identity");
must(spec, /\| 23 \|[\s\S]{0,900}Observable[\s\S]{0,900}VolumeProfileSnapshot/i, "revision 23 amendment closes the executable profile seam at Observable");
must(spec, /\| 24 \|[\s\S]{0,900}(?:content-address|profile hash|hash-excluded)[\s\S]{0,900}(?:tampered|executable|recomputed)/i, "revision 24 amendment closes profile payload hash authenticity");
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
must(childSpec, /palette[\s\S]{0,200}provenance|provenance[\s\S]{0,200}palette/i, "M5 child specification preserves palette provenance");
must(childSpec, /(?:format(?:ting)?|readout strings)[^\n]*Observable|Observable[^\n]*(?:format(?:ting)?|readout strings)/i, "M5 child specification assigns formatting to the observable boundary");
must(
  childSpec,
  new RegExp(
    "M5 contract revision[\\s\\S]{0,160}\\b" + versionManifest.spec.m5ContractRevision + "\\b",
    "i",
  ),
  "M5 child specification names the current canonical amendment",
);
must(childSpec, /persisted (?:World\/Event|world\/event) schema v(?:ersion )?4/i, "M5 child specification records the persisted profile schema");
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
must(expressionSource, /equationId[\s\S]{0,500}substitutions/i, "Scientific Core expressions carry structured equations and substitutions");
mustNot(expressionSource, /solve charge balance and component balances self-consistently/i, "natural-language placeholder is not emitted as an exact expression");

must(evidence, /M5-FRAME[^\n]*\| PASS locally/i, "M5 frame evidence records the production composition boundary");
must(evidence, /AC-V3[^\n]*\| PASS locally/i, "AC-V3 contract-level evidence is complete for M5");
must(evidence, /AC-V4[^\n]*\| PASS locally/i, "AC-V4 contract-level evidence is complete for M5");
must(evidence, /contract-level[\s\S]{0,240}M5 S3 does not require M6/i, "M5 contract acceptance does not wait for M6 realization");
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

mustNot(tokenSource, /owner-approved-v0-indicator-reference-swatch/i, "palette references do not point to an unresolvable placeholder");
requirePalette(
  indicatorPaletteManifest.catalogId === "indicator-palette",
  "indicator palette reference artifact has the declared catalog identity",
);
requirePalette(
  indicatorPaletteManifest.swatchArtifact ===
    "docs/visual/reference/indicator-reference-swatches.svg",
  "indicator palette manifest names the checked-in swatch artifact",
);
requirePalette(
  indicatorPaletteManifest.reviewRecord ===
    "docs/visual/reference/indicator-palette-review.md",
  "indicator palette manifest names the checked-in contract review record",
);
requirePalette(
  Array.isArray(indicatorPaletteManifest.entries) &&
    indicatorPaletteManifest.entries.length > 0,
  "indicator palette manifest contains entries",
);
for (const entry of indicatorPaletteManifest.entries ?? []) {
  const referenceId = `indicator-palette/${entry.indicatorId}`;
  requirePalette(
    entry.referenceId === referenceId,
    `${referenceId} has a stable reference identity`,
  );
  must(
    tokenSource,
    new RegExp(`reference: \\"${escapeRegExp(entry.referenceId)}\\"`),
    `${referenceId} is used by the render palette token`,
  );
  requirePalette(
    entry.review?.status === "m5-contract-reviewed" &&
      entry.review?.record === indicatorPaletteManifest.reviewRecord,
    `${referenceId} has an M5 contract review record`,
  );
  requirePalette(
    indicatorPaletteReview.includes(entry.referenceId),
    `${referenceId} is named by the checked-in review record`,
  );
  requirePalette(
    Array.isArray(entry.sources) &&
      entry.sources.length > 0 &&
      entry.sources.every(
        (source) =>
          typeof source.url === "string" && source.url.startsWith("https://") &&
          typeof source.claim === "string" && source.claim.length > 0,
      ),
    `${referenceId} has source claims with stable HTTPS references`,
  );
  for (const [formName, form] of [
    ["acid", entry.acidForm],
    ["base", entry.baseForm],
  ]) {
    const escapedSwatchId = escapeRegExp(form?.swatchId ?? "");
    const escapedLabel = escapeRegExp(form?.label ?? "");
    requirePalette(
      new RegExp(
        `<g[^>]*id=["']${escapedSwatchId}["'][^>]*data-indicator-id=["']${escapeRegExp(entry.indicatorId)}["'][^>]*data-form=["']${formName}["']`,
        "i",
      ).test(indicatorSwatches),
      `${referenceId} ${formName} swatch identity is labelled in the SVG artifact`,
    );
    requirePalette(
      new RegExp(
        `<g[^>]*id=["']${escapedSwatchId}["'][\\s\\S]*?<text[^>]*>${escapedLabel}</text>`,
        "i",
      ).test(indicatorSwatches),
      `${referenceId} ${formName} swatch has a human-readable label`,
    );
  }
}

if (failures.length > 0) {
  console.error("M5 contract consistency check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("M5 contract consistency: PASS");
}
