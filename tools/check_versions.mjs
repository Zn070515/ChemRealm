import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  GENERATED_VERSION_SOURCE_PATH,
  GENERATED_NATIVE_CONTRACT_SOURCE_PATH,
  INDICATOR_MULTIFORM_CONTRACT_SOURCE_PATH,
  REPOSITORY_ROOT,
  activeVersionLiterals,
  derivedVersionMetadata,
  nativeContractRelativePath,
  readVersionManifest,
  renderNativeContractSource,
  renderIndicatorMultiformContractSource,
  renderTypeScriptVersionSource,
} from "./version-manifest.mjs";

const manifest = await readVersionManifest();
const derived = derivedVersionMetadata(manifest);
const expectedGenerated = renderTypeScriptVersionSource(manifest);
const generated = await readFile(GENERATED_VERSION_SOURCE_PATH, "utf8").catch(() => null);
if (generated !== expectedGenerated) {
  throw new Error(
    "generated version source is stale; run `node tools/generate_version_sources.mjs`",
  );
}
const nativeContract = await readJson(nativeContractRelativePath(manifest));
const expectedGeneratedNativeContract = renderNativeContractSource(nativeContract);
const generatedNativeContract = await readFile(
  GENERATED_NATIVE_CONTRACT_SOURCE_PATH,
  "utf8",
).catch(() => null);
if (generatedNativeContract !== expectedGeneratedNativeContract) {
  throw new Error(
    "generated native model contract source is stale; run `node tools/generate_native_contract_source.mjs`",
  );
}
const indicatorMultiformContract = await readJson("contracts/scientific/indicator-multiform.json");
const expectedGeneratedIndicatorMultiform = renderIndicatorMultiformContractSource(
  indicatorMultiformContract,
);
const generatedIndicatorMultiform = await readFile(
  INDICATOR_MULTIFORM_CONTRACT_SOURCE_PATH,
  "utf8",
).catch(() => null);
if (generatedIndicatorMultiform !== expectedGeneratedIndicatorMultiform) {
  throw new Error(
    "generated indicator multiform contract source is stale; run `pnpm generate:versions`",
  );
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(join(REPOSITORY_ROOT, relativePath), "utf8"));
}

const rootPackage = await readJson("package.json");
if (rootPackage.version !== derived.packageJson.version) {
  throw new Error("root package version is not distributed from the version manifest");
}
if (rootPackage.packageManager !== derived.packageJson.packageManager) {
  throw new Error("pnpm toolchain version is not pinned from the version manifest");
}
if (rootPackage.engines?.node !== derived.packageJson.nodeEngine) {
  throw new Error("Node engine version is not distributed from the version manifest");
}
for (const packagePath of [
  "apps/web/package.json",
  "packages/schema/package.json",
  "packages/sci/package.json",
  "packages/world/package.json",
  "packages/render/package.json",
]) {
  const packageJson = await readJson(packagePath);
  if (packageJson.version !== derived.workspacePackageVersion) {
    throw new Error(`${packagePath} version is not distributed from the version manifest`);
  }
}

const pyproject = await readFile(join(REPOSITORY_ROOT, "pyproject.toml"), "utf8");
if (!new RegExp(`^version\\s*=\\s*"${escapeRegExp(derived.pyprojectVersion)}"$`, "m").test(pyproject)) {
  throw new Error("Python package version is not pinned from the version manifest");
}
if (!new RegExp(`^requires-python\\s*=\\s*"${escapeRegExp(derived.pythonRequirement)}"$`, "m").test(pyproject)) {
  throw new Error("Python toolchain version is not distributed from the version manifest");
}
const cargo = await readFile(join(REPOSITORY_ROOT, "native/sci-core/Cargo.toml"), "utf8");
if (!new RegExp(`^version\\s*=\\s*"${escapeRegExp(derived.nativePackageVersion)}"$`, "m").test(cargo)) {
  throw new Error("native package version is not pinned from the version manifest");
}
const rustToolchain = await readFile(join(REPOSITORY_ROOT, "rust-toolchain.toml"), "utf8");
if (!new RegExp(`^channel\\s*=\\s*"${escapeRegExp(derived.rustToolchain)}"$`, "m").test(rustToolchain)) {
  throw new Error("Rust toolchain version is not pinned from the version manifest");
}
const nodeVersionFile = await readFile(join(REPOSITORY_ROOT, ".nvmrc"), "utf8");
if (nodeVersionFile.trim() !== manifest.toolchains.node) {
  throw new Error("Node version file is not distributed from the version manifest");
}
const phreeqcManifest = await readJson("tools/oracle/phreeqc/manifest.json");
if (Object.prototype.hasOwnProperty.call(phreeqcManifest, "version")) {
  throw new Error(
    "PHREEQC toolchain version must be read from the central version manifest, not duplicated in its tool manifest",
  );
}
if (!phreeqcManifest.sourceUrlTemplate?.includes("{version}")) {
  throw new Error("PHREEQC source URL must derive its release version from the central manifest");
}
if (!phreeqcManifest.database?.archivePathTemplate?.includes("{version}")) {
  throw new Error("PHREEQC archive path must derive its release version from the central manifest");
}

function requireVersion(actual, expected, description) {
  if (actual !== expected) {
    throw new Error(`${description} is not distributed from the central version manifest`);
  }
}

const acidBase = manifest.scientific.acidBase;
if (indicatorMultiformContract.modelId !== manifest.scientific.indicatorMultiform.id) {
  throw new Error(
    "indicator multiform contract model id is not aligned with the central version manifest",
  );
}
requireVersion(nativeContract.model?.id, acidBase.id, "native model contract model id");
requireVersion(
  nativeContract.model?.version,
  acidBase.nativeVersion,
  "native model contract model version",
);
requireVersion(nativeContract.solverConfig?.id, acidBase.id, "native solver config id");
requireVersion(
  nativeContract.solverConfig?.version,
  acidBase.nativeVersion,
  "native solver config version",
);
const provenance = await readJson("docs/research/constants-provenance.json");
requireVersion(
  provenance.schemaVersion,
  manifest.oracle.constantsProvenance,
  "constants provenance schema version",
);
requireVersion(provenance.model?.id, acidBase.id, "constants provenance model id");
requireVersion(
  provenance.model?.version,
  acidBase.legacyVersion,
  "constants provenance model version",
);

const v0Inputs = await readJson("docs/research/v0-scientific-inputs.json");
requireVersion(v0Inputs.schemaVersion, manifest.oracle.v0Inputs, "v0 input schema version");
const envelopeReference = await readJson("docs/research/v0-envelope-reference.json");
requireVersion(
  envelopeReference.schemaVersion,
  manifest.oracle.envelopeReference,
  "v0 envelope reference schema version",
);

const referenceManifest = await readJson("packages/sci/test/reference/manifest.json");
requireVersion(
  referenceManifest.schemaVersion,
  manifest.oracle.referenceManifest,
  "reference manifest schema version",
);
requireVersion(referenceManifest.model?.id, acidBase.id, "reference manifest model id");
requireVersion(
  referenceManifest.model?.version,
  acidBase.legacyVersion,
  "reference manifest model version",
);
for (const fixtureId of [
  ...referenceManifest.fixtures,
  ...referenceManifest.oracleFixtures,
  ...referenceManifest.adversarialFixtures,
]) {
  const fixture = await readJson(`packages/sci/test/reference/${fixtureId}.json`);
  requireVersion(
    fixture.schemaVersion,
    manifest.oracle.referenceFixture,
    `${fixtureId} schema version`,
  );
}
const indicatorMultiformReferenceManifest = await readJson(
  "packages/sci/test/reference/indicator-multiform/manifest.json",
);
requireVersion(
  indicatorMultiformReferenceManifest.schemaVersion,
  manifest.oracle.referenceManifest,
  "indicator multiform reference manifest schema version",
);
for (const fixtureId of indicatorMultiformReferenceManifest.fixtures) {
  const fixture = await readJson(
    `packages/sci/test/reference/indicator-multiform/${fixtureId}.json`,
  );
  requireVersion(
    fixture.schemaVersion,
    manifest.oracle.referenceFixture,
    `${fixtureId} indicator multiform fixture schema version`,
  );
}

const oracleReport = await readJson("docs/evidence/M4-oracle-sweep-report.json");
requireVersion(
  oracleReport.schemaVersion,
  manifest.oracle.crossCheckReport,
  "M4 oracle report schema version",
);
requireVersion(oracleReport.model?.id, acidBase.id, "M4 oracle report model id");
requireVersion(
  oracleReport.model?.version,
  acidBase.legacyVersion,
  "M4 oracle report model version",
);
requireVersion(
  oracleReport.phreeqc?.version,
  manifest.oracle.phreeqc,
  "M4 oracle report PHREEQC version",
);

const productionRoots = [
  "packages/schema/src",
  "packages/sci/src",
  "packages/world/src",
  "packages/render/src",
  "apps/web/src",
  "native/sci-core/src",
  "tools/build_native_wasm.mjs",
  "tools/oracle/reference/run_m4_validation.py",
];
const sourceFiles = [];
async function collect(path) {
  const entries = await import("node:fs/promises").then(({ readdir }) =>
    readdir(join(REPOSITORY_ROOT, path), { withFileTypes: true }),
  );
  for (const entry of entries) {
    const relative = join(path, entry.name);
    if (entry.isDirectory()) await collect(relative);
    else if (/\.(?:ts|tsx|mjs|py|rs)$/.test(entry.name)) sourceFiles.push(relative);
  }
}
for (const root of productionRoots) {
  if (root.endsWith(".mjs") || root.endsWith(".py")) sourceFiles.push(root);
  else await collect(root);
}

const versionPattern = /["'`]?(?:schemaVersion|bridgeSchemaVersion|formatVersion|contentVersion|producerVersion|modelVersion|numericPolicyVersion|version|channel)["'`]?\s*[:=]\s*(?:["'`]([^"'`]+)["'`]|([0-9]+))/g;
const forbidden = new Set(activeVersionLiterals(manifest));
const violations = [];
for (const relative of sourceFiles) {
  const normalizedRelative = relative.replaceAll("\\", "/");
  if (
    normalizedRelative === "packages/schema/src/generated/versions.ts" ||
    normalizedRelative === "packages/sci/src/generated/native-model-contract.ts" ||
    relative.endsWith(".test.ts") ||
    relative.endsWith(".test.tsx") ||
    relative.endsWith(".guarantees.ts")
  ) continue;
  const text = await readFile(join(REPOSITORY_ROOT, relative), "utf8");
  for (const match of text.matchAll(versionPattern)) {
    const literal = match[1] ?? match[2];
    if (forbidden.has(literal)) {
      violations.push(`${relative}: hardcoded active version ${literal}`);
    }
  }
}
if (violations.length > 0) {
  throw new Error(
    "active version literals must come from the central manifest:\n" +
      violations.join("\n"),
  );
}

console.log("central version manifest is current and production sources contain no distributed version literals");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
