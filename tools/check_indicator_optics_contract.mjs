#!/usr/bin/env node
/**
 * Keep the indicator-optical observation design subordinate to the canonical
 * SPEC-0001 authority and central version manifest.
 *
 * This is an admission gate, not a scientific sufficiency proof. It ensures
 * that optical implementation cannot begin against a silently weakened or
 * unversioned contract.
 */

import { readFile } from "node:fs/promises";
import { readVersionManifest } from "./version-manifest.mjs";

const root = new URL("../", import.meta.url);
const document = (relativePath) => readFile(new URL(relativePath, root), "utf8");

const [spec, design, adr, opticsSource] = await Promise.all([
  document("docs/specs/SPEC-0001-world-foundation-acid-base-titration.md"),
  document("docs/superpowers/specs/2026-09-14-indicator-optical-observation.md"),
  document("docs/adr/0016-indicator-optical-observation-boundary.md"),
  document("packages/render/src/observable/optics.ts"),
]);
const manifest = await readVersionManifest();
const failures = [];

function must(text, pattern, message) {
  if (!pattern.test(text)) failures.push(`missing: ${message}`);
}

function mustNot(text, pattern, message) {
  if (pattern.test(text)) failures.push(`forbidden: ${message}`);
}

must(
  spec,
  new RegExp(
    `\\*\\*Current revision:\\*\\* \\*\\*${manifest.spec.currentRevision} Candidate\\*\\*`,
    "i",
  ),
  "SPEC records the manifest-derived current candidate revision",
);
must(
  spec,
  /\| \d+ \|[^\n]*indicator optical observation authority/i,
  "SPEC amendment history retains the indicator-optical authority change",
);
must(
  spec,
  /### Optical observation[\s\S]{0,12000}AC-O1[\s\S]{0,12000}AC-O8/i,
  "SPEC contains the optical observation criteria",
);

for (const status of [
  "OPTICAL_MODEL_OK",
  "OPTICAL_MODEL_OUT_OF_COVERAGE",
  "OPTICAL_MODEL_DATA_MISSING",
]) {
  must(spec, new RegExp(status), `SPEC names ${status}`);
  must(design, new RegExp(status), `design names ${status}`);
}

must(
  spec,
  /no endpoint-RGB fallback|endpoint-RGB fallback[^\n]*(?:not|never)|without an endpoint-RGB fallback/i,
  "SPEC prohibits endpoint-RGB fallback",
);
must(
  spec,
  /genesis\s+snapshot\s+freezes\s+indicator\s+dose,\s+optical\s+profile,\s+and\s+optical\s+path\s+identity/i,
  "SPEC freezes optical dose, profile, and path inputs at genesis",
);
must(
  spec,
  /v0[\s\S]{0,500}(?:cannot|must not)[\s\S]{0,500}(?:emit|produce)[\s\S]{0,500}(?:strong-acid phenolphthalein orange|orange)/i,
  "SPEC prevents v0 from emitting unsupported strong-acid phenolphthalein orange",
);

must(
  adr,
  /four-core|Scientific Reality Core[\s\S]{0,500}World Runtime[\s\S]{0,500}Representation Engine[\s\S]{0,500}ACE/i,
  "ADR records four-core ownership",
);
must(
  adr,
  /OPTICAL_MODEL_OK[\s\S]{0,300}OPTICAL_MODEL_OUT_OF_COVERAGE[\s\S]{0,300}OPTICAL_MODEL_DATA_MISSING/i,
  "ADR records the tagged optical status/refusal contract",
);
must(
  adr,
  /fixed[ -]path[\s\S]{0,300}(?:v1|version)[\s\S]{0,300}scope/i,
  "ADR records the fixed optical path version scope",
);
must(
  adr,
  /chemical-form coverage[\s\S]{0,300}optical coverage/i,
  "ADR distinguishes chemical-form coverage from optical coverage",
);
mustNot(
  spec,
  /fallback[\s\S]{0,120}(?:pink|red|yellow|RGB|palette)[\s\S]{0,120}(?:when|if)\s+(?:profile|spectrum|data)\s+(?:is )?missing/i,
  "SPEC does not authorize a missing-data palette fallback",
);

const forbiddenOpticalPathPatterns = [
  [/@chemrealm\/sci/, "Scientific Reality Core implementation imports"],
  [/\b(?:Ka|KaIn|kaIn)\b/, "equilibrium-constant inputs"],
  [/\b(?:activity|activityCoefficient|protonationRatio)\b/, "activity/protonation inputs"],
  [/mapIndicatorRatioToColor|INDICATOR_COLOUR_PALETTES/, "legacy endpoint-palette mapper"],
];

function opticalPathViolations(source) {
  return forbiddenOpticalPathPatterns
    .filter(([pattern]) => pattern.test(source))
    .map(([, label]) => label);
}

for (const [name, fixture] of [
  ["solver import", "import { solve } from '@chemrealm/sci';"],
  ["Ka input", "const kaIn = request.kaIn;"],
  ["activity input", "const gamma = activityCoefficient.value;"],
  ["protonation ratio", "const ratio = state.protonationRatio;"],
  ["legacy palette", "return mapIndicatorRatioToColor(indicatorId, ratio);"],
]) {
  if (opticalPathViolations(fixture).length === 0) {
    failures.push(`self-test: ${name} optical boundary fixture was not rejected`);
  }
}

for (const violation of opticalPathViolations(opticsSource)) {
  failures.push(`packages/render/src/observable/optics.ts: ${violation}`);
}

if (failures.length > 0) {
  console.error("indicator optics contract check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("indicator optics contract: PASS");
}
