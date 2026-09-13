import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  REPOSITORY_ROOT,
  GENERATED_VERSION_SOURCE_PATH,
  derivedVersionMetadata,
  readVersionManifest,
  renderTypeScriptVersionSource,
} from "./version-manifest.mjs";

const manifest = await readVersionManifest();
const derived = derivedVersionMetadata(manifest);
await mkdir(new URL("../packages/schema/src/generated/", import.meta.url), {
  recursive: true,
});
await writeFile(
  GENERATED_VERSION_SOURCE_PATH,
  renderTypeScriptVersionSource(manifest),
  "utf8",
);

async function rewriteJson(relativePath, update) {
  const path = join(REPOSITORY_ROOT, relativePath);
  const value = JSON.parse(await readFile(path, "utf8"));
  update(value);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function replaceRequired(text, pattern, replacement, description) {
  if (!pattern.test(text)) {
    throw new Error(`could not update derived ${description}`);
  }
  return text.replace(pattern, replacement);
}

await rewriteJson("package.json", (value) => {
  value.version = derived.packageJson.version;
  value.packageManager = derived.packageJson.packageManager;
  value.engines.node = derived.packageJson.nodeEngine;
});

for (const relativePath of [
  "apps/web/package.json",
  "packages/schema/package.json",
  "packages/sci/package.json",
  "packages/world/package.json",
  "packages/render/package.json",
]) {
  await rewriteJson(relativePath, (value) => {
    value.version = derived.workspacePackageVersion;
  });
}

const pyprojectPath = join(REPOSITORY_ROOT, "pyproject.toml");
const pyproject = await readFile(pyprojectPath, "utf8");
await writeFile(
  pyprojectPath,
  replaceRequired(
    pyproject,
    /^(version\s*=\s*)"[^"]+"/m,
    `$1"${derived.pyprojectVersion}"`,
    "Python package version",
  ),
  "utf8",
);
const updatedPyproject = await readFile(pyprojectPath, "utf8");
await writeFile(
  pyprojectPath,
  replaceRequired(
    updatedPyproject,
    /^(requires-python\s*=\s*)"[^"]+"/m,
    `$1"${derived.pythonRequirement}"`,
    "Python version requirement",
  ),
  "utf8",
);

const cargoPath = join(REPOSITORY_ROOT, "native/sci-core/Cargo.toml");
const cargo = await readFile(cargoPath, "utf8");
await writeFile(
  cargoPath,
  replaceRequired(
    cargo,
    /^(version\s*=\s*)"[^"]+"/m,
    `$1"${derived.nativePackageVersion}"`,
    "native package version",
  ),
  "utf8",
);

const rustToolchainPath = join(REPOSITORY_ROOT, "rust-toolchain.toml");
const rustToolchain = await readFile(rustToolchainPath, "utf8");
await writeFile(
  rustToolchainPath,
  replaceRequired(
    rustToolchain,
    /^(channel\s*=\s*)"[^"]+"/m,
    `$1"${derived.rustToolchain}"`,
    "Rust toolchain version",
  ),
  "utf8",
);

await writeFile(
  join(REPOSITORY_ROOT, ".nvmrc"),
  `${derived.nodeVersionFile}\n`,
  "utf8",
);
