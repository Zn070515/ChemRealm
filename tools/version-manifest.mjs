import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPOSITORY_ROOT = resolve(
  fileURLToPath(new URL("..", import.meta.url)),
);
export const VERSION_MANIFEST_PATH = join(
  REPOSITORY_ROOT,
  "contracts",
  "version-manifest.json",
);
export const GENERATED_VERSION_SOURCE_PATH = join(
  REPOSITORY_ROOT,
  "packages",
  "schema",
  "src",
  "generated",
  "versions.ts",
);
export const GENERATED_NATIVE_CONTRACT_SOURCE_PATH = join(
  REPOSITORY_ROOT,
  "packages",
  "sci",
  "src",
  "generated",
  "native-model-contract.ts",
);

export function nativeContractRelativePath(manifest) {
  const acidBase = manifest.scientific.acidBase;
  return `contracts/scientific/${acidBase.id}-${acidBase.nativeVersion}.json`;
}

export async function readVersionManifest() {
  const value = JSON.parse(await readFile(VERSION_MANIFEST_PATH, "utf8"));
  return validateVersionManifest(value);
}

export function validateVersionManifest(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("version manifest must be a JSON object");
  }

  const requireObject = (parent, key) => {
    const child = parent[key];
    if (child === null || typeof child !== "object" || Array.isArray(child)) {
      throw new TypeError(`version manifest field ${key} must be an object`);
    }
    return child;
  };
  const requireString = (parent, key) => {
    const child = parent[key];
    if (typeof child !== "string" || child.trim().length === 0) {
      throw new TypeError(`version manifest field ${key} must be a non-empty string`);
    }
    return child;
  };
  const requirePositiveInteger = (parent, key) => {
    const child = parent[key];
    if (!Number.isInteger(child) || child <= 0) {
      throw new TypeError(`version manifest field ${key} must be a positive integer`);
    }
    return child;
  };

  requirePositiveInteger(value, "manifestVersion");
  const project = requireObject(value, "project");
  for (const key of ["packageVersion", "nativePackageVersion", "pythonPackageVersion"]) {
    requireString(project, key);
  }

  const toolchains = requireObject(value, "toolchains");
  requireString(toolchains, "node");
  requireString(toolchains, "pnpm");
  requireString(toolchains, "python");
  requireString(toolchains, "rust");

  const schema = requireObject(value, "schema");
  for (const key of [
    "world",
    "scenario",
    "command",
    "exportFormat",
    "scientific",
    "scientificExpression",
    "nativeBridge",
  ]) requirePositiveInteger(schema, key);

  const spec = requireObject(value, "spec");
  for (const key of [
    "currentRevision",
    "acceptedThroughRevision",
    "m5ContractRevision",
  ]) requirePositiveInteger(spec, key);
  if (spec.acceptedThroughRevision > spec.currentRevision) {
    throw new TypeError("version manifest accepted spec revision cannot exceed current revision");
  }
  if (spec.m5ContractRevision > spec.currentRevision) {
    throw new TypeError("version manifest M5 contract revision cannot exceed current revision");
  }

  const representation = requireObject(value, "representation");
  requirePositiveInteger(representation, "observableModel");
  requireString(representation, "volumeProfile");
  requireString(representation, "indicatorOpticalProfile");
  requireString(representation, "opticalPath");
  const content = requireObject(value, "content");
  requirePositiveInteger(content, "current");

  const scientific = requireObject(value, "scientific");
  requirePositiveInteger(scientific, "numericPolicyVersion");
  const acidBase = requireObject(scientific, "acidBase");
  for (const key of ["id", "legacyVersion", "nativeVersion", "expressionProducerVersion"]) {
    requireString(acidBase, key);
  }

  const fixtures = requireObject(value, "fixtures");
  requireString(fixtures, "testSolverVersion");
  requireString(fixtures, "testModelVersion");

  const oracle = requireObject(value, "oracle");
  requireString(oracle, "phreeqc");
  for (const key of [
    "referenceManifest",
    "referenceFixture",
    "crossCheckReport",
    "constantsProvenance",
    "v0Inputs",
    "envelopeReference",
  ]) requirePositiveInteger(oracle, key);

  return value;
}

export function renderTypeScriptVersionSource(manifest) {
  const json = JSON.stringify(manifest, null, 2);
  return `/** GENERATED FILE — edit contracts/version-manifest.json instead. */
const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
};

export const VERSION_MANIFEST = deepFreeze(${json} as const);

export const TEST_SOLVER_VERSION = VERSION_MANIFEST.fixtures.testSolverVersion;
export const TEST_MODEL_VERSION = VERSION_MANIFEST.fixtures.testModelVersion;
export const VOLUME_PROFILE_VERSION = VERSION_MANIFEST.representation.volumeProfile;
export const INDICATOR_OPTICAL_PROFILE_VERSION = VERSION_MANIFEST.representation.indicatorOpticalProfile;
export const OPTICAL_PATH_VERSION = VERSION_MANIFEST.representation.opticalPath;
export const SCENARIO_CONTENT_VERSION = VERSION_MANIFEST.content.current;
`;
}

export function renderNativeContractSource(contract) {
  return `/** GENERATED FILE — edit contracts/scientific/*.json instead. */
export const NATIVE_MODEL_CONTRACT = ${JSON.stringify(contract, null, 2)} as const;
`;
}

export function derivedVersionMetadata(manifest) {
  return {
    packageJson: {
      version: manifest.project.packageVersion,
      packageManager: `pnpm@${manifest.toolchains.pnpm}`,
      nodeEngine: `>=${manifest.toolchains.node}`,
    },
    workspacePackageVersion: manifest.project.packageVersion,
    pyprojectVersion: manifest.project.pythonPackageVersion,
    pythonRequirement: `>=${manifest.toolchains.python}`,
    nativePackageVersion: manifest.project.nativePackageVersion,
    rustToolchain: manifest.toolchains.rust,
    nodeVersionFile: manifest.toolchains.node,
  };
}

export function activeVersionLiterals(manifest) {
  const acidBase = manifest.scientific.acidBase;
  return [
    String(manifest.schema.world),
    String(manifest.schema.scenario),
    String(manifest.schema.command),
    String(manifest.schema.exportFormat),
    String(manifest.schema.scientific),
    String(manifest.schema.scientificExpression),
    String(manifest.schema.nativeBridge),
    String(manifest.spec.currentRevision),
    String(manifest.spec.acceptedThroughRevision),
    String(manifest.spec.m5ContractRevision),
    String(manifest.scientific.numericPolicyVersion),
    String(manifest.representation.observableModel),
    manifest.representation.volumeProfile,
    manifest.representation.indicatorOpticalProfile,
    manifest.representation.opticalPath,
    String(manifest.content.current),
    String(manifest.oracle.referenceManifest),
    String(manifest.oracle.referenceFixture),
    String(manifest.oracle.crossCheckReport),
    String(manifest.oracle.constantsProvenance),
    String(manifest.oracle.v0Inputs),
    String(manifest.oracle.envelopeReference),
    manifest.project.packageVersion,
    manifest.project.nativePackageVersion,
    manifest.project.pythonPackageVersion,
    manifest.toolchains.node,
    manifest.toolchains.pnpm,
    manifest.toolchains.python,
    manifest.toolchains.rust,
    acidBase.legacyVersion,
    acidBase.nativeVersion,
    acidBase.expressionProducerVersion,
    manifest.fixtures.testSolverVersion,
    manifest.fixtures.testModelVersion,
    manifest.oracle.phreeqc,
  ];
}
