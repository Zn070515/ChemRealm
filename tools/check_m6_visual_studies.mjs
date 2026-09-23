import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const manifestPath = path.join(root, "tools/blender/jobs/beaker-250ml-griffin/studies/study.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const failures = [];

function requireThat(condition, message) {
  if (!condition) failures.push(message);
}

requireThat(manifest.schemaVersion === 1, "study manifest schema must be version 1");
requireThat(manifest.status === "study-only", "study manifest must remain study-only");
requireThat(manifest.assetId === "beaker-250ml", "study must target the 250 mL beaker");
requireThat(manifest.baseJob === "tools/blender/jobs/beaker-250ml-griffin/job.json", "study must derive from the existing vertical-slice job");
requireThat(manifest.sourceBlend === "assets/apparatus/masters/beaker-250ml/source/blender/beaker-250ml.blend", "study must derive from the existing source blend");
requireThat(manifest.outputRoot === "assets/apparatus/masters/beaker-250ml/qa/blender-studies", "study output must remain under the beaker QA root");

const expected = {
  form: ["F01", "F02", "F03", "F04"],
  glass: ["G01", "G02", "G03", "G04"],
  lighting: ["L01", "L02", "L03"],
};
for (const [round, ids] of Object.entries(expected)) {
  const actual = [...(manifest.rounds?.[round]?.candidateIds ?? [])].sort();
  requireThat(JSON.stringify(actual) === JSON.stringify([...ids].sort()), `${round} candidate IDs must be ${ids.join(", ")}`);
}

const requiredSources = [
  "tools/blender/jobs/beaker-250ml-griffin/job.json",
  "assets/apparatus/masters/beaker-250ml/source/blender/beaker-250ml.blend",
  "assets/apparatus/masters/beaker-250ml/measurement-sheet.json",
  "assets/apparatus/masters/beaker-250ml/source-record.md",
  "docs/visual/reference/sources.json",
];
for (const source of requiredSources) {
  requireThat(manifest.sourceInputs?.includes(source), `manifest must hash source input ${source}`);
}

const bible = fs.readFileSync(path.join(root, "docs/visual/reference/README.md"), "utf8");
const evidence = fs.readFileSync(path.join(root, "docs/evidence/M6.md"), "utf8");
const reviewPath = path.join(root, "assets/apparatus/masters/beaker-250ml/qa/blender-studies/beaker-250ml-griffin-visual-studies-v1/review.md");
const review = fs.readFileSync(reviewPath, "utf8");
requireThat(bible.includes("source-backed") && bible.includes("visual-approximation"), "visual Bible must classify reference observations");
requireThat(!/Gold Master|M6 S3|M7-ready/.test(JSON.stringify(manifest)), "study manifest must not claim promotion");
requireThat(/S2|prototype/i.test(evidence), "M6 evidence must retain prototype/S2 language");
requireThat(review.includes("study-only / S2 prototype evidence"), "visual study review must retain study-only boundary");
requireThat(review.includes("formSelection: pending-owner-review"), "form selection must remain owner-gated");
requireThat(review.includes("glassSelection: pending-owner-review"), "glass selection must remain owner-gated");
requireThat(review.includes("lightingSelection: pending-owner-review"), "lighting selection must remain owner-gated");
requireThat(review.includes("goldMasterAdmission: not-admitted"), "visual study review must not admit a Gold Master");
requireThat(evidence.includes("Controlled Blender visual study evidence"), "M6 evidence must link controlled Blender study evidence");

if (failures.length) {
  console.error(failures.map((failure) => `FAIL ${failure}`).join("\n"));
  process.exit(1);
}
console.log("ok    M6 controlled visual study manifest and evidence boundary");
